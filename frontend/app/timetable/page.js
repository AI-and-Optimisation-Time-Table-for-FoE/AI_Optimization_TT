"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { fetchBatches, fetchTimetable, fetchTimetableStatus, fetchDepartments, fetchTimeSlots, fetchLabSchedules, fetchLecturerTimetable } from "../lib/api";
import { Calendar, Inbox, FlaskConical, GraduationCap, Building, User } from "lucide-react";
import "./timetable.css";

export default function TimetablePage() {
  return (
    <Suspense fallback={
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <main className="page-content">
            <div className="empty-state" style={{ marginTop: 80 }}>
              <div className="empty-state-text">Loading timetable…</div>
            </div>
          </main>
        </div>
      </div>
    }>
      <TimetableViewPage />
    </Suspense>
  );
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function buildTimeSlots(entries, dbTimeSlots, selectedBatch) {
  const slotMap = new Map();

  // 1. Add slots from database
  if (Array.isArray(dbTimeSlots) && dbTimeSlots.length > 0) {
    for (const slot of dbTimeSlots) {
      const start = slot.startTime.substring(0, 5);
      const end = slot.endTime.substring(0, 5);
      const key = `${start}|${end}`;
      if (!slotMap.has(key)) {
        slotMap.set(key, {
          start,
          end,
          label: `${start} – ${end}`,
        });
      }
    }
  }

  // 2. Add slots from entries (in case any custom timing exists)
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      const start = entry.startTime.substring(0, 5);
      const end = entry.endTime.substring(0, 5);
      const key = `${start}|${end}`;
      if (!slotMap.has(key)) {
        slotMap.set(key, {
          start,
          end,
          label: `${start} – ${end}`,
        });
      }
    }
  }

  // 3. Make sure lunch break is added as a slot
  if (selectedBatch) {
    const lunchStart = selectedBatch.lunchStartTime ? selectedBatch.lunchStartTime.substring(0, 5) : "12:30";
    const lunchEnd = selectedBatch.lunchEndTime ? selectedBatch.lunchEndTime.substring(0, 5) : "13:30";
    const key = `${lunchStart}|${lunchEnd}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, {
        start: lunchStart,
        end: lunchEnd,
        label: `${lunchStart} – ${lunchEnd}`,
      });
    }
  }

  // 4. Default slots if database is empty
  if (slotMap.size === 0) {
    const defaults = ["08:30|09:30", "09:30|10:30", "10:30|11:30", "11:30|12:30", "12:30|13:30", "13:30|14:30", "14:30|15:30", "15:30|16:30", "16:30|17:30", "17:30|18:30"];
    for (const d of defaults) {
      const [start, end] = d.split("|");
      slotMap.set(d, { start, end, label: `${start} – ${end}` });
    }
  }

  return Array.from(slotMap.values()).sort((a, b) => a.start.localeCompare(b.start));
}

function TimetableViewPage() {
  const searchParams = useSearchParams();
  const initialBatchId = searchParams.get("batchId");

  const initialDeptId = searchParams.get("departmentId");
  const [selectedDeptId, setSelectedDeptId] = useState(initialDeptId || "");
  const [departments, setDepartments] = useState([]);

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId || "");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("none");
  const [publishedAt, setPublishedAt] = useState("");
  // publishing state removed
  const [dbTimeSlots, setDbTimeSlots] = useState([]);
  const [labSchedules, setLabSchedules] = useState([]);

  useEffect(() => {
    fetchTimeSlots()
      .then(setDbTimeSlots)
      .catch((err) => console.error("Error loading timeslots:", err));
  }, []);

  useEffect(() => {
    fetchLabSchedules()
      .then(setLabSchedules)
      .catch((err) => console.error("Error loading lab schedules:", err));
  }, []);

  useEffect(() => {
    if (initialDeptId) {
      setSelectedDeptId(initialDeptId);
    }
  }, [initialDeptId]);

  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch(err => console.error("Error loading departments:", err));
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const u = JSON.parse(userStr);
      setUser(u);
      if (u.role === "student") {
        setSelectedBatchId(String(u.batchId));
        setSelectedDeptId(u.departmentId ? String(u.departmentId) : "");
      }
    }
  }, []);

  useEffect(() => {
    fetchBatches()
      .then((data) => {
        setBatches(data);
        const userStr = localStorage.getItem("user");
        const u = userStr ? JSON.parse(userStr) : null;
        if (u && u.role === "student") {
          setSelectedBatchId(String(u.batchId));
          setSelectedDeptId(u.departmentId ? String(u.departmentId) : "");
        } else if (!initialBatchId && data.length > 0) {
          setSelectedBatchId(String(data[0].batchId));
        }
      })
      .catch(() => setError("Could not load batches from the database."));
  }, [initialBatchId]);

  const loadTimetable = useCallback(async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isLecturer = currentUser?.role === "lecturer";

    if (!isLecturer && !selectedBatchId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isLecturer) {
        const [tData, statusData] = await Promise.all([
          fetchLecturerTimetable(currentUser.lecturerId),
          fetchTimetableStatus("", "")
        ]);
        setEntries(Array.isArray(tData) ? tData : []);
        setStatus(tData && tData.length > 0 ? "active" : "none");
        setPublishedAt(statusData?.publishedAt || "");
      } else {
        const isAdmin = currentUser?.role === "admin";
        let deptIdToFetch = null;
        if (isAdmin) {
          deptIdToFetch = selectedDeptId ? Number(selectedDeptId) : null;
        } else if (currentUser?.role === "student") {
          deptIdToFetch = currentUser.departmentId ? Number(currentUser.departmentId) : null;
        }

        const initialTimetableId = searchParams.get("timetableId");
        const [tData, statusData] = await Promise.all([
          fetchTimetable(Number(selectedBatchId), deptIdToFetch, isAdmin, initialTimetableId ? Number(initialTimetableId) : null),
          fetchTimetableStatus(Number(selectedBatchId), deptIdToFetch)
        ]);

        setEntries(Array.isArray(tData) ? tData : []);
        setStatus(statusData?.status || "none");
        setPublishedAt(statusData?.publishedAt || "");
      }
    } catch (err) {
      console.error(err);
      setError("Could not load timetable from the database. Make sure the backend is running on port 8080.");
      setEntries([]);
      setStatus("none");
    } finally {
      setLoading(false);
    }
  }, [selectedBatchId, selectedDeptId, searchParams]);

  // handlePublish removed

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  useEffect(() => {
    // Only poll for student and lecturer dashboards to receive live updates
    const userStr = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    const currentUser = userStr ? JSON.parse(userStr) : null;
    if (currentUser && (currentUser.role === "student" || currentUser.role === "lecturer")) {
      const interval = setInterval(() => {
        loadTimetable();
      }, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [loadTimetable]);

  const selectedBatch = batches.find((b) => String(b.batchId) === String(selectedBatchId));
  const batchLabel = selectedBatch?.batchName || (selectedBatchId ? `Batch ${selectedBatchId}` : "No batch");

  const timeSlots = useMemo(() => buildTimeSlots(entries, dbTimeSlots, selectedBatch), [entries, dbTimeSlots, selectedBatch]);
  const visibleDays = useMemo(() => {
    if (entries.length === 0) return [];
    const usedDays = new Set(entries.map((entry) => entry.dayOfWeek));
    const defaultDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const combinedDays = Array.from(new Set([...defaultDays, ...usedDays]));
    return DAYS.filter((day) => combinedDays.includes(day));
  }, [entries]);

  const entryMap = useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      const key = `${entry.dayOfWeek}|${entry.startTime}|${entry.endTime}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(entry);
    }
    return map;
  }, [entries]);

  const getLabSchedulesForCell = (day, slotStart, slotEnd) => {
    return labSchedules.filter((lab) => {
      if (!lab.batch || String(lab.batch.batchId) !== String(selectedBatchId)) {
        return false;
      }
      if (lab.dayOfWeek !== day) {
        return false;
      }

      const isAdmin = user?.role === "admin";
      let deptFilterId = null;
      if (isAdmin) {
        deptFilterId = selectedDeptId ? Number(selectedDeptId) : null;
      } else if (user?.role === "student") {
        deptFilterId = user.departmentId ? Number(user.departmentId) : null;
      }

      if (deptFilterId) {
        if (lab.department && lab.department.departmentId !== deptFilterId) {
          return false;
        }
      }

      const normalizeTime = (t) => {
        if (!t) return "";
        return t.replace(".", ":").substring(0, 5);
      };

      const nLabStart = normalizeTime(lab.startTime);
      const nLabEnd = normalizeTime(lab.endTime);
      const nSlotStart = normalizeTime(slotStart);
      const nSlotEnd = normalizeTime(slotEnd);

      return nSlotStart < nLabEnd && nSlotEnd > nLabStart;
    });
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              Home <span style={{ color: "var(--neutral-400)" }}>/</span> <span>Timetable View</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          <div className="timetable-hero" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div>
              <h1 style={{ display: "flex", alignItems: "center", gap: "12px", margin: 0 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                  <Calendar size={24} style={{ color: "#ffffff" }} />
                  <span>{user?.role === "lecturer" ? "My Teaching Timetable" : "Timetable View"}</span>
                </span>
                {status === "active" && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span className="badge badge-success" style={{
                      fontSize: "12px",
                      padding: "4px 8px",
                      borderRadius: "12px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      background: "var(--success-500, #22c55e)",
                      color: "#fff"
                    }}>
                      Published
                    </span>
                    {publishedAt && (
                      <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", fontWeight: "500" }}>
                        (Last Updated: {new Date(publishedAt).toLocaleString()})
                      </span>
                    )}
                  </span>
                )}
              </h1>
              <p style={{ margin: "4px 0 0 0" }}>
                {user?.role === "lecturer"
                  ? "Showing your personalized teaching schedule."
                  : (entries.length > 0
                      ? `Showing database schedule for ${batchLabel}.`
                      : "Generate a timetable from the Optimizer page to see database entries here.")}
              </p>
            </div>
            {/* Publish button removed */}
          </div>

          {user?.role === "admin" && (
            <div className="timetable-actions" style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
              <select
                className="form-select"
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setSelectedDeptId(""); // Reset department filter on batch change
                }}
                style={{ minWidth: 220 }}
              >
                {batches.map((batch) => (
                  <option key={batch.batchId} value={batch.batchId}>
                    {batch.batchName} (Sem {batch.semester})
                  </option>
                ))}
              </select>

              {user?.role === "admin" && (() => {
                const selBatch = batches.find(b => String(b.batchId) === String(selectedBatchId));
                if (selBatch && selBatch.semester >= 3) {
                  return (
                    <select
                      className="form-select"
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      style={{ minWidth: 200 }}
                    >
                      <option value="">All Departments</option>
                      {departments.filter(d => d.departmentId !== 6).map(d => (
                        <option key={d.departmentId} value={d.departmentId}>
                          {d.departmentName} ({d.departmentCode})
                        </option>
                      ))}
                    </select>
                  );
                }
                return null;
              })()}
            </div>
          )}

          {error && (
            <div className="card" style={{ marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2" }}>
              <div className="card-body" style={{ color: "#991b1b" }}>{error}</div>
            </div>
          )}

          {!loading && entries.length === 0 && !error && (
            <div className="card">
              <div className="timetable-empty">
                <div className="timetable-empty-icon" style={{ color: "var(--neutral-400)", marginBottom: "12px", display: "flex", justifyContent: "center" }}>
                  <Inbox size={48} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  {user?.role === "lecturer" ? "No scheduled classes found" : "No timetable in database yet"}
                </div>
                <div>
                  {user?.role === "lecturer"
                    ? "Your personalized teaching schedule will appear here once the administrator publishes the batch timetables."
                    : "No schedule has been generated for this academic batch."}
                </div>
              </div>
            </div>
          )}

          {entries.length > 0 && (
            <div className="timetable-grid-wrap">
              <table className="timetable-grid">
                <thead>
                  <tr>
                    <th className="time-col">Time</th>
                    {visibleDays.map((day) => (
                      <th key={day}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot) => {
                    const lunchStart = selectedBatch?.lunchStartTime ? selectedBatch.lunchStartTime.substring(0, 5) : "12:30";
                    const lunchEnd = selectedBatch?.lunchEndTime ? selectedBatch.lunchEndTime.substring(0, 5) : "13:30";
                    const isLunchRow = slot.start < lunchEnd && slot.end > lunchStart;

                    if (isLunchRow) {
                      return (
                        <tr key={slot.label}>
                          <td className="time-col">{slot.label}</td>
                          <td colSpan={visibleDays.length} className="timetable-lunch-cell">
                            Lunch Break
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={slot.label}>
                        <td className="time-col">{slot.label}</td>
                        {visibleDays.map((day) => {
                          const isCommon = day === "Wednesday" && slot.start < "16:30" && slot.end > "14:30";

                          if (isCommon) {
                            return (
                              <td key={`${day}-${slot.label}`}>
                                <div className="timetable-common-hours-cell">
                                  <div>Common Hours</div>
                                </div>
                              </td>
                            );
                          }

                          const key = `${day}|${slot.start}|${slot.end}`;
                          const cellEntries = entryMap.get(key) || [];

                          const cellLabs = user?.role === "lecturer" ? [] : getLabSchedulesForCell(day, slot.start, slot.end);
                          if (cellLabs.length > 0) {
                            return (
                              <td key={`${day}-${slot.label}`}>
                                <div className="timetable-lab-session-cell">
                                  {cellLabs.map((lab) => {
                                    const deptSuffix = lab.department ? ` (${lab.department.departmentCode})` : "";
                                    return (
                                      <div key={lab.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                        <FlaskConical size={12} style={{ flexShrink: 0 }} />
                                        <span>Lab Session{deptSuffix}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={`${day}-${slot.label}`}>
                              <div className="timetable-cell">
                                {cellEntries.map((entry) => (
                                  <div key={entry.entryId} className="timetable-session">
                                    <div className="timetable-session-code">{entry.moduleCode}</div>
                                    <div className="timetable-session-name">{entry.moduleName}</div>
                                    <div className="timetable-session-meta">
                                      {user?.role === "lecturer" ? (
                                        <>
                                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <GraduationCap size={12} style={{ color: "#0f766e", flexShrink: 0 }} />
                                            <span>{entry.batchName}</span>
                                          </span>
                                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <Building size={12} style={{ color: "#1d4ed8", flexShrink: 0 }} />
                                            <span>{entry.hallName}</span>
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <Building size={12} style={{ color: "#1d4ed8", flexShrink: 0 }} />
                                            <span>{entry.hallName}</span>
                                          </span>
                                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <User size={12} style={{ color: "#7c3aed", flexShrink: 0 }} />
                                            <span>{entry.lecturerName}</span>
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
