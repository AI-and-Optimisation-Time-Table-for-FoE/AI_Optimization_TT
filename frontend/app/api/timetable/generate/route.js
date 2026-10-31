import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const BACKEND_URL = "http://backend-env.eba-83mgr7vm.ap-southeast-2.elasticbeanstalk.com";

const DB_CONFIG = {
  host: process.env.DB_HOST || "database-1.cb0km0ueonzm.ap-southeast-2.rds.amazonaws.com",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "okzy1234new1",
  database: process.env.DB_NAME || "foe_timetable_scheduler",
};

function parseMinutes(timeStr) {
  if (!timeStr) return null;
  const s = String(timeStr).trim().replace(".", ":");
  const parts = s.split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function isOfferedByDepartment(bm, deptId) {
  if (!deptId) return true;
  const dId = Number(deptId);
  if (Number(bm.module_dept_id) === dId) return true;
  const isIS = Number(bm.module_dept_id) === 4 || String(bm.module_dept_code || "").toUpperCase() === "IS";
  if (!isIS) return false;
  if (!bm.offering_dept_ids || !String(bm.offering_dept_ids).trim()) return true;
  const ids = String(bm.offering_dept_ids)
    .split(",")
    .map((x) => x.trim());
  return ids.includes(String(dId));
}

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  let batchId = searchParams.get("batchId") ? Number(searchParams.get("batchId")) : null;
  let departmentId = searchParams.get("departmentId") ? Number(searchParams.get("departmentId")) : null;

  try {
    const body = await request.json().catch(() => null);
    if (body) {
      if (!batchId && body.batchId) batchId = Number(body.batchId);
      if (!departmentId && body.departmentId) departmentId = Number(body.departmentId);
    }
  } catch (_) {}

  if (!batchId || isNaN(batchId)) {
    return NextResponse.json({ message: "batchId is required" }, { status: 400 });
  }

  // 1. Try upstream Spring Boot backend first
  try {
    let qs = `?batchId=${batchId}`;
    if (departmentId) qs += `&departmentId=${departmentId}`;
    const upstream = await fetch(`${BACKEND_URL}/api/timetable/generate${qs}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (upstream.ok) {
      const data = await upstream.json();
      return NextResponse.json(data);
    }
  } catch (_) {
    // Fall through to built-in optimizer
  }

  // 2. Built-in Constraint Satisfaction + Soft-Constraint Optimizer against AWS RDS MySQL
  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);

    const [batches] = await conn.execute("SELECT * FROM batch WHERE batch_id = ?", [batchId]);
    if (!batches.length) {
      return NextResponse.json({ message: `Batch not found: ${batchId}` }, { status: 400 });
    }
    const batch = batches[0];
    const effectiveDeptId = batch.semester >= 3 && departmentId ? Number(departmentId) : null;

    // Load batch modules for this batch & semester
    const [rawBms] = await conn.execute(
      `SELECT bm.*, m.module_code, m.module_name, m.lecture_hours_per_week, m.credit_hours,
              m.semester AS module_semester, m.session_type, m.needs_computer,
              m.department_id AS module_dept_id, d.department_code AS module_dept_code
       FROM batch_module bm
       JOIN module m ON bm.module_id = m.module_id
       LEFT JOIN department d ON m.department_id = d.department_id
       WHERE bm.batch_id = ? AND bm.semester = ? AND m.semester = ?`,
      [batchId, batch.semester, batch.semester]
    );

    const [bmlRows] = await conn.execute(
      `SELECT bml.batch_module_id, bml.lecturer_id
       FROM batch_module_lecturer bml
       JOIN batch_module bm ON bml.batch_module_id = bm.batch_module_id
       WHERE bm.batch_id = ?`,
      [batchId]
    );
    const lecMap = {};
    for (const r of bmlRows) {
      if (!lecMap[r.batch_module_id]) lecMap[r.batch_module_id] = new Set();
      lecMap[r.batch_module_id].add(Number(r.lecturer_id));
    }

    let batchModules = rawBms.map((bm) => {
      const set = lecMap[bm.batch_module_id] || new Set();
      if (bm.lecturer_id) set.add(Number(bm.lecturer_id));
      return { ...bm, lecturerIds: Array.from(set) };
    });

    if (effectiveDeptId) {
      batchModules = batchModules.filter((bm) => isOfferedByDepartment(bm, effectiveDeptId));
    }

    if (!batchModules.length) {
      return NextResponse.json(
        { message: "No modules assigned for this batch/department." },
        { status: 400 }
      );
    }

    const [halls] = await conn.execute("SELECT * FROM hall WHERE is_active = 1");
    const [timeSlots] = await conn.execute("SELECT * FROM time_slot ORDER BY slot_id ASC");

    const lunchStartMin = parseMinutes(batch.lunch_start_time || "12:00");
    const lunchEndMin = parseMinutes(batch.lunch_end_time || "13:00");

    const validSlots = timeSlots.filter((ts) => {
      const sMin = parseMinutes(ts.start_time);
      const eMin = parseMinutes(ts.end_time);
      if (sMin !== null && eMin !== null && lunchStartMin !== null && lunchEndMin !== null) {
        if (sMin < lunchEndMin && eMin > lunchStartMin) return false;
      }
      return true;
    });

    // Fetch lecturer & hall unavailabilities + other active timetable bookings
    const [lecUnavailRows] = await conn.execute("SELECT lecturer_id, slot_id FROM lecturer_unavailability");
    const [hallUnavailRows] = await conn.execute("SELECT hall_id, slot_id FROM hall_unavailability");
    const [lecPrefRows] = await conn.execute(
      "SELECT lecturer_id, slot_id FROM lecturer_preference WHERE preference_level = 'preferred'"
    );

    const currentDeptParam = effectiveDeptId !== null ? effectiveDeptId : -1;
    const [activeOtherEntries] = await conn.execute(
      `SELECT te.slot_id, te.hall_id, bm2.lecturer_id, bml.lecturer_id AS extra_lec_id
       FROM timetable_entry te
       JOIN timetable t2 ON te.timetable_id = t2.timetable_id
       JOIN batch_module bm2 ON te.batch_module_id = bm2.batch_module_id
       JOIN module m2 ON bm2.module_id = m2.module_id
       LEFT JOIN batch_module_lecturer bml ON bm2.batch_module_id = bml.batch_module_id
       WHERE t2.status = 'active'
         AND NOT (t2.batch_id = ? AND COALESCE(t2.department_id, -1) = ?)
         AND NOT (t2.batch_id = ? AND (bm2.is_shared = 1 OR m2.department_id = 4))`,
      [batchId, currentDeptParam, batchId]
    );

    const lecBlocked = {};
    for (const r of lecUnavailRows) {
      if (!lecBlocked[r.lecturer_id]) lecBlocked[r.lecturer_id] = new Set();
      lecBlocked[r.lecturer_id].add(Number(r.slot_id));
    }
    const hallBlocked = {};
    for (const r of hallUnavailRows) {
      if (!hallBlocked[r.hall_id]) hallBlocked[r.hall_id] = new Set();
      hallBlocked[r.hall_id].add(Number(r.slot_id));
    }
    for (const r of activeOtherEntries) {
      if (r.hall_id) {
        if (!hallBlocked[r.hall_id]) hallBlocked[r.hall_id] = new Set();
        hallBlocked[r.hall_id].add(Number(r.slot_id));
      }
      if (r.lecturer_id) {
        if (!lecBlocked[r.lecturer_id]) lecBlocked[r.lecturer_id] = new Set();
        lecBlocked[r.lecturer_id].add(Number(r.slot_id));
      }
      if (r.extra_lec_id) {
        if (!lecBlocked[r.extra_lec_id]) lecBlocked[r.extra_lec_id] = new Set();
        lecBlocked[r.extra_lec_id].add(Number(r.slot_id));
      }
    }

    const lecPrefs = {};
    for (const r of lecPrefRows) {
      if (!lecPrefs[r.lecturer_id]) lecPrefs[r.lecturer_id] = new Set();
      lecPrefs[r.lecturer_id].add(Number(r.slot_id));
    }

    // Fetch lab schedules for this batch
    const [labRows] = await conn.execute("SELECT * FROM batch_lab_schedule WHERE batch_id = ?", [batchId]);
    const labBlockedSlots = new Set();
    for (const lab of labRows) {
      const applies =
        batch.semester <= 2
          ? lab.department_id === null
          : lab.department_id !== null && (!effectiveDeptId || Number(lab.department_id) === effectiveDeptId);
      if (applies) {
        const lStart = parseMinutes(lab.start_time);
        const lEnd = parseMinutes(lab.end_time);
        for (const s of validSlots) {
          if (String(s.day_of_week).toLowerCase() === String(lab.day_of_week).toLowerCase()) {
            const sStart = parseMinutes(s.start_time);
            const sEnd = parseMinutes(s.end_time);
            if (sStart !== null && sEnd !== null && lStart !== null && lEnd !== null) {
              if (sStart >= lStart && sEnd <= lEnd) {
                labBlockedSlots.add(Number(s.slot_id));
              }
            }
          }
        }
      }
    }

    // Clean up previous timetable versions for the same (batchId, departmentId) so stale versions do not cause false clashes
    const [prevTts] = await conn.execute(
      `SELECT timetable_id FROM timetable WHERE batch_id = ? AND COALESCE(department_id, -1) = ?`,
      [batchId, currentDeptParam]
    );
    if (prevTts.length > 0) {
      const prevIds = prevTts.map((r) => r.timetable_id);
      const placeholders = prevIds.map(() => "?").join(",");
      await conn.execute(`DELETE FROM timetable_entry WHERE timetable_id IN (${placeholders})`, prevIds);
      await conn.execute(`DELETE FROM timetable WHERE timetable_id IN (${placeholders})`, prevIds);
    }

    // Create new draft timetable version
    const now = new Date();
    const [insertTt] = await conn.execute(
      `INSERT INTO timetable (batch_id, timetable_name, academic_year, semester, status, generated_at, department_id)
       VALUES (?, ?, ?, ?, 'draft', ?, ?)`,
      [batchId, `${batch.batch_name} Timetable`, batch.academic_year, batch.semester, now, effectiveDeptId]
    );
    const timetableId = insertTt.insertId;

    // Separate modules already scheduled via shared/IS sibling timetables vs modules to schedule
    const ownModules = [];
    const clonedEntries = [];

    for (const bm of batchModules) {
      const isIS = Number(bm.module_dept_id) === 4 || String(bm.module_dept_code || "").toUpperCase() === "IS";
      const isShared = Boolean(bm.is_shared) && effectiveDeptId !== null;
      const sourceBmId = isShared && bm.linked_batch_module_id ? bm.linked_batch_module_id : bm.batch_module_id;

      let scheduledExternally = false;
      if ((isIS || isShared) && effectiveDeptId !== null) {
        const [extRows] = await conn.execute(
          `SELECT te.* FROM timetable_entry te
           WHERE te.batch_module_id = ? AND te.timetable_id <> ?
           ORDER BY te.timetable_id DESC`,
          [sourceBmId, timetableId]
        );
        if (extRows.length > 0) {
          const latestTtId = extRows[0].timetable_id;
          const latestGroup = extRows.filter((e) => e.timetable_id === latestTtId);
          for (const le of latestGroup) {
            clonedEntries.push({
              batch_module_id: bm.batch_module_id,
              hall_id: le.hall_id,
              slot_id: Number(le.slot_id),
              session_type: le.session_type || "lecture",
              is_recurring: 1,
            });
          }
          scheduledExternally = true;
        }
      }
      if (!scheduledExternally) {
        ownModules.push(bm);
      }
    }

    const usedSlotsByBatch = new Set(clonedEntries.map((ce) => Number(ce.slot_id)));
    const usedHallSlot = new Set(clonedEntries.map((ce) => `${ce.hall_id}_${ce.slot_id}`));
    const usedLecSlot = new Set();

    // Sort modules: preferred hall first, computer lab second, most lecture hours third
    ownModules.sort((a, b) => {
      const aPref = a.preferred_hall_id ? 1 : 0;
      const bPref = b.preferred_hall_id ? 1 : 0;
      if (aPref !== bPref) return bPref - aPref;
      const aHours = Number(a.lecture_hours_per_week || a.credit_hours || 2);
      const bHours = Number(b.lecture_hours_per_week || b.credit_hours || 2);
      return bHours - aHours;
    });

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const slotsByDay = {};
    for (const d of days) slotsByDay[d] = [];
    for (const s of validSlots) {
      if (! slotsByDay[s.day_of_week]) slotsByDay[s.day_of_week] = [];
      slotsByDay[s.day_of_week].push(s);
    }
    for (const d of Object.keys(slotsByDay)) {
      slotsByDay[d].sort((a, b) => parseMinutes(a.start_time) - parseMinutes(b.start_time));
    }

    const dayLoad = {};
    for (const d of days) dayLoad[d] = 0;
    for (const ce of clonedEntries) {
      const sl = validSlots.find((s) => Number(s.slot_id) === ce.slot_id);
      if (sl) dayLoad[sl.day_of_week] = (dayLoad[sl.day_of_week] || 0) + 1;
    }

    const scheduledEntries = [...clonedEntries];

    for (const bm of ownModules) {
      let hoursRemaining = Number(bm.lecture_hours_per_week || bm.credit_hours || 2);
      if (hoursRemaining <= 0) hoursRemaining = 1;

      const needsComp =
        Boolean(bm.needs_computer) ||
        /computer|programming|software|database|network/i.test(bm.module_name || "");

      const candidateHalls = halls.filter((h) => {
        if (bm.preferred_hall_id) return Number(h.hall_id) === Number(bm.preferred_hall_id);
        if (needsComp) return Boolean(h.is_computer_lab);
        return true;
      });
      const fallbackHalls = candidateHalls.length > 0 ? candidateHalls : halls;

      const usedDaysForModule = new Set();

      while (hoursRemaining > 0) {
        const blockSize = hoursRemaining >= 2 ? 2 : 1;
        let bestChoice = null;
        let bestScore = -1e9;

        // Sort days by lowest current load to balance daily workload
        const orderedDays = [...days].sort((d1, d2) => (dayLoad[d1] || 0) - (dayLoad[d2] || 0));

        for (const day of orderedDays) {
          const daySlots = slotsByDay[day] || [];
          for (let i = 0; i <= daySlots.length - blockSize; i++) {
            const chunk = daySlots.slice(i, i + blockSize);
            // Check consecutive times if blockSize === 2
            if (blockSize === 2) {
              const end0 = parseMinutes(chunk[0].end_time);
              const start1 = parseMinutes(chunk[1].start_time);
              if (end0 !== start1) continue;
            }

            // Check batch & lecturer availability for all slots in chunk
            let slotOk = true;
            for (const s of chunk) {
              const sId = Number(s.slot_id);
              if (usedSlotsByBatch.has(sId) || labBlockedSlots.has(sId)) {
                slotOk = false;
                break;
              }
              for (const lId of bm.lecturerIds) {
                if (
                  (lecBlocked[lId] && lecBlocked[lId].has(sId)) ||
                  usedLecSlot.has(`${lId}_${sId}`)
                ) {
                  slotOk = false;
                  break;
                }
              }
              if (!slotOk) break;
            }
            if (!slotOk) continue;

            // Find a hall available for all slots in chunk
            for (const h of fallbackHalls) {
              const hId = Number(h.hall_id);
              let hallOk = true;
              for (const s of chunk) {
                const sId = Number(s.slot_id);
                if (
                  (hallBlocked[hId] && hallBlocked[hId].has(sId)) ||
                  usedHallSlot.has(`${hId}_${sId}`)
                ) {
                  hallOk = false;
                  break;
                }
              }
              if (!hallOk) continue;

              // Score this (chunk, hall) assignment using soft constraints
              let score = 0;
              if (!usedDaysForModule.has(day)) score += 500;
              score -= (dayLoad[day] || 0) * 50;
              for (const s of chunk) {
                const sMin = parseMinutes(s.start_time);
                if (sMin !== null && sMin <= 600) score += 20; // Morning preference
                for (const lId of bm.lecturerIds) {
                  if (lecPrefs[lId] && lecPrefs[lId].has(Number(s.slot_id))) score += 40;
                }
              }
              if (bm.preferred_hall_id && Number(bm.preferred_hall_id) === hId) score += 200;

              if (score > bestScore) {
                bestScore = score;
                bestChoice = { day, chunk, hall: h };
              }
            }
          }
        }

        // If a 2-hour contiguous block wasn't found, fall back to a 1-hour slot
        if (!bestChoice && blockSize === 2) {
          for (const day of orderedDays) {
            const daySlots = slotsByDay[day] || [];
            for (const s of daySlots) {
              const sId = Number(s.slot_id);
              if (usedSlotsByBatch.has(sId)) continue;
              let lecOk = true;
              for (const lId of bm.lecturerIds) {
                if ((lecBlocked[lId] && lecBlocked[lId].has(sId)) || usedLecSlot.has(`${lId}_${sId}`)) {
                  lecOk = false;
                  break;
                }
              }
              if (!lecOk) continue;
              const h = fallbackHalls.find(
                (cand) =>
                  !(hallBlocked[cand.hall_id] && hallBlocked[cand.hall_id].has(sId)) &&
                  !usedHallSlot.has(`${cand.hall_id}_${sId}`)
              );
              if (h) {
                bestChoice = { day, chunk: [s], hall: h };
                break;
              }
            }
            if (bestChoice) break;
          }
        }

        // Ultimate fallback if all slots had soft/lab blocks: pick any non-overlapping batch slot
        if (!bestChoice) {
          for (const s of validSlots) {
            const sId = Number(s.slot_id);
            if (!usedSlotsByBatch.has(sId)) {
              const h = fallbackHalls[0] || halls[0];
              bestChoice = { day: s.day_of_week, chunk: [s], hall: h };
              break;
            }
          }
        }

        if (!bestChoice) break;

        usedDaysForModule.add(bestChoice.day);
        for (const s of bestChoice.chunk) {
          const sId = Number(s.slot_id);
          const hId = Number(bestChoice.hall.hall_id);
          usedSlotsByBatch.add(sId);
          usedHallSlot.add(`${hId}_${sId}`);
          for (const lId of bm.lecturerIds) {
            usedLecSlot.add(`${lId}_${sId}`);
          }
          dayLoad[bestChoice.day] = (dayLoad[bestChoice.day] || 0) + 1;
          scheduledEntries.push({
            batch_module_id: bm.batch_module_id,
            hall_id: hId,
            slot_id: sId,
            session_type: bm.session_type || "lecture",
            is_recurring: 1,
          });
        }
        hoursRemaining -= bestChoice.chunk.length;
      }
    }

    // Insert all scheduled entries into timetable_entry
    for (const entry of scheduledEntries) {
      await conn.execute(
        `INSERT INTO timetable_entry (timetable_id, batch_module_id, hall_id, slot_id, session_type, is_recurring)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          timetableId,
          entry.batch_module_id,
          entry.hall_id,
          entry.slot_id,
          entry.session_type,
          entry.is_recurring,
        ]
      );
    }

    await conn.end();
    return NextResponse.json({
      message: "Generated successfully!",
      batchId,
      timetableId,
      entriesCount: scheduledEntries.length,
    });
  } catch (err) {
    if (conn) await conn.end().catch(() => {});
    return NextResponse.json(
      { message: "Failed to generate timetable: " + err.message },
      { status: 500 }
    );
  }
}
