import { NextResponse } from "next/server";

/**
 * Next.js API Route handler for /api/timetable/generate
 * 
 * This route receives the generation request from the frontend, queries the database 
 * for active records, constructs the JSON payload for the Python CP-SAT solver,
 * calls the Python microservice, and then saves/returns the generated timetable.
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");
    const departmentId = searchParams.get("departmentId");

    if (!batchId) {
      return NextResponse.json(
        { message: "Missing required parameter: batchId" },
        { status: 400 }
      );
    }

    console.log(`[Next.js API] Preparing timetable generation for batchId: ${batchId}, departmentId: ${departmentId}`);

    // =========================================================================
    // STEP 1: FETCH DATA FROM DATABASE (MariaDB)
    // =========================================================================
    // You would query your database here. For example, using Prisma, Sequelize, or direct SQL:
    //
    // const modules = await db.query(
    //   "SELECT m.module_id AS id, m.module_name AS name, ... FROM module m JOIN batch_module bm ON ... WHERE bm.batch_id = ?",
    //   [batchId]
    // );
    // const halls = await db.query("SELECT hall_id AS id, hall_name AS name, capacity FROM hall WHERE is_active = 1");
    // const timeslots = await db.query("SELECT slot_id AS id, day_of_week AS day, start_time, end_time FROM time_slot");
    // ...
    // =========================================================================

    // Placeholder / Mock data structure to illustrate payload mapping
    const optimizerPayload = {
      modules: [
        // Map database module records to Python solver schema:
        // {
        //   id: module_id,
        //   name: module_name,
        //   assigned_batch: { id: batch_id, name: batch_name, student_count: student_count },
        //   lecturer: lecturer_id,
        //   weekly_hours_required: weekly_hours
        // }
      ],
      halls: [
        // Map database hall records:
        // { id: hall_id, name: hall_name, capacity: capacity }
      ],
      timeslots: [
        // Map database time slot records:
        // { id: slot_id, day: day_of_week, start_time: start_time, end_time: end_time }
      ],
      admin_blocked_slots: [
        // Fetch and map from hall_unavailability / lecturer_unavailability
        // { hall_id: hall_id, slot_id: slot_id }
      ],
      lecturer_preferences: [
        // Map from lecturer_preference
        // { lecturer_id: lecturer_id, timeslot_id: slot_id, weight: weight }
      ],
      student_preferences: [
        // Map from student_preference / batch_preference
        // { batch_id: batch_id, timeslot_id: slot_id, weight: weight }
      ],
      gap_weight: 5
    };

    // If you are running tests or have database connection set up:
    // Map your database results directly into optimizerPayload.

    // =========================================================================
    // STEP 2: CALL THE PYTHON CP-SAT MICROSERVICE
    // =========================================================================
    const solverUrl = process.env.TIMETABLE_SOLVER_URL || "http://localhost:8000/generate-timetable";
    
    const response = await fetch(solverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(optimizerPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Next.js API] Solver microservice failed:", errText);
      return NextResponse.json(
        { message: `Solver microservice failed: ${errText}` },
        { status: 400 }
      );
    }

    const generatedTimetable = await response.json();

    // =========================================================================
    // STEP 3: PERSIST GENERATED TIMETABLE TO DATABASE
    // =========================================================================
    // e.g., Delete old draft timetable for this batch and insert new assignments:
    //
    // await db.transaction(async (tx) => {
    //   await tx.query("DELETE FROM timetable_entry WHERE batch_id = ?", [batchId]);
    //   for (const slot of generatedTimetable.assignments) {
    //     await tx.query(
    //       "INSERT INTO timetable_entry (batch_id, module_id, hall_id, slot_id) VALUES (?, ?, ?, ?)",
    //       [batchId, slot.module_id, slot.hall_id, slot.timeslot_id]
    //     );
    //   }
    // });
    // =========================================================================

    return NextResponse.json(generatedTimetable);

  } catch (error) {
    console.error("[Next.js API Error]:", error);
    return NextResponse.json(
      { message: `Internal server error in Next.js API: ${error.message}` },
      { status: 500 }
    );
  }
}
