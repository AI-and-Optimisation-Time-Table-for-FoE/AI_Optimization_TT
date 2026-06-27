from ortools.sat.python import cp_model
from models import OptimizeRequest, TimetableEntryOutput
from typing import List, Tuple

def solve_hard_constraints_internal(req: OptimizeRequest, relaxed: bool = False) -> Tuple[str, List[TimetableEntryOutput]]:
    model = cp_model.CpModel()
    
    # 1. Prepare data
    # Flat list of sessions to schedule. A session is: (batchModuleId, lecturerId, preferredHallId, index)
    sessions = []
    for mod in req.modules:
        for i in range(mod.sessionsNeeded):
            sessions.append({
                "batchModuleId": mod.batchModuleId,
                "lecturerId": mod.lecturerId,
                "preferredHallId": mod.preferredHallId,
                "index": i
            })
            
    num_sessions = len(sessions)
    if num_sessions == 0:
        return "success", []
        
    slots = req.timeSlots
    halls = req.halls
    
    # Variables: x[s, t, h] = 1 if session s is assigned to slot t in hall h
    x = {}
    for s_idx in range(num_sessions):
        for t in slots:
            for h in halls:
                x[s_idx, t.slotId, h.hallId] = model.NewBoolVar(f'x_{s_idx}_{t.slotId}_{h.hallId}')
                
    # 2. Hard Constraints
    
    # H1: Each session must be scheduled in exactly one slot and one hall
    for s_idx in range(num_sessions):
        model.Add(sum(x[s_idx, t.slotId, h.hallId] for t in slots for h in halls) == 1)
        
    # H2: Hall capacity must exceed batch size
    for s_idx in range(num_sessions):
        for h in halls:
            if h.capacity < req.studentCount:
                # Cannot use this hall
                for t in slots:
                    model.Add(x[s_idx, t.slotId, h.hallId] == 0)
                    
    # H3: No batch double-booking (since this is for a single batch, max 1 class at a time)
    for t in slots:
        model.Add(sum(x[s_idx, t.slotId, h.hallId] for s_idx in range(num_sessions) for h in halls) <= 1)
        
    # H4: Respect lecturer unavailability (double booking + unavailable slots)
    penalty_terms = []
    for s_idx, session in enumerate(sessions):
        lec_id_str = str(session["lecturerId"])
        unavail_slots = req.lecturerUnavailability.get(lec_id_str, [])
        for t_id in unavail_slots:
            for h in halls:
                if (s_idx, t_id, h.hallId) in x:
                    if relaxed:
                        penalty_terms.append(1000 * x[s_idx, t_id, h.hallId])
                    else:
                        model.Add(x[s_idx, t_id, h.hallId] == 0)
                    
    # H5: Respect hall unavailability (double booking + unavailable slots)
    for h in halls:
        h_id_str = str(h.hallId)
        unavail_slots = req.hallUnavailability.get(h_id_str, [])
        for t_id in unavail_slots:
            for s_idx in range(num_sessions):
                if (s_idx, t_id, h.hallId) in x:
                    if relaxed:
                        penalty_terms.append(1000 * x[s_idx, t_id, h.hallId])
                    else:
                        model.Add(x[s_idx, t_id, h.hallId] == 0)
                    
    # H6: Respect batch lab schedule (blocked slots for this batch's modules)
    for s_idx, session in enumerate(sessions):
        bm_id_str = str(session["batchModuleId"])
        blocked_slots = req.batchLabSchedules.get(bm_id_str, [])
        for t_id in blocked_slots:
            for h in halls:
                if (s_idx, t_id, h.hallId) in x:
                    model.Add(x[s_idx, t_id, h.hallId] == 0)
                    
    # H7: Lunch break constraint (using batch's custom lunch break)
    lunch_start = req.lunchStartTime[:5] if req.lunchStartTime else "12:30"
    lunch_end = req.lunchEndTime[:5] if req.lunchEndTime else "13:30"
    
    for t in slots:
        slot_start = t.startTime[:5]
        slot_end = t.endTime[:5]
        # Check if the slot overlaps with the lunch break
        if slot_start < lunch_end and slot_end > lunch_start:
            for s_idx in range(num_sessions):
                for h in halls:
                    if (s_idx, t.slotId, h.hallId) in x:
                        model.Add(x[s_idx, t.slotId, h.hallId] == 0)
                        
    # H12: Wednesday Common Hours constraint (Wednesday 14:30 to 16:30)
    for t in slots:
        if t.dayOfWeek == "Wednesday":
            slot_start = t.startTime[:5]
            slot_end = t.endTime[:5]
            if slot_start < "16:30" and slot_end > "14:30":
                for s_idx in range(num_sessions):
                    for h in halls:
                        if (s_idx, t.slotId, h.hallId) in x:
                            model.Add(x[s_idx, t.slotId, h.hallId] == 0)
                        
    # H8: Max lecture hours per day per batch
    # Group time slots by day
    slots_by_day = {}
    for t in slots:
        slots_by_day.setdefault(t.dayOfWeek, []).append(t.slotId)
        
    # Calculate daily limit dynamically to guarantee feasibility
    # e.g., if we need 25 sessions, we need at least 5 per day, so we allow 6 to allow flexibility.
    import math
    min_needed_per_day = math.ceil(num_sessions / 5.0)
    max_hours_limit = max(4, min_needed_per_day + 1)
    
    for day, day_slots in slots_by_day.items():
        model.Add(sum(x[s_idx, t_id, h.hallId] for s_idx in range(num_sessions) for t_id in day_slots for h in halls) <= max_hours_limit)
        
    # H10: Preferred Hall Constraint
    for s_idx, session in enumerate(sessions):
        pref_hall_id = session.get("preferredHallId")
        if pref_hall_id is not None:
            for t in slots:
                for h in halls:
                    if h.hallId != pref_hall_id:
                        if (s_idx, t.slotId, h.hallId) in x:
                            model.Add(x[s_idx, t.slotId, h.hallId] == 0)

    # H11: 3-Credit (3-Hour) Split Constraint
    # Group session indices by batchModuleId
    bm_session_indices = {}
    for s_idx, session in enumerate(sessions):
        bm_session_indices.setdefault(session["batchModuleId"], []).append(s_idx)
        
    # Group time slots by day
    slots_by_day_obj = {}
    for t in slots:
        slots_by_day_obj.setdefault(t.dayOfWeek, []).append(t)
        
    # Helper binary variable: w[s, t.slotId] = sum(x[s, t.slotId, h.hallId] for h in halls)
    w = {}
    for s_idx in range(num_sessions):
        for t in slots:
            w[s_idx, t.slotId] = model.NewBoolVar(f'w_{s_idx}_{t.slotId}')
            model.Add(w[s_idx, t.slotId] == sum(x[s_idx, t.slotId, h.hallId] for h in halls if (s_idx, t.slotId, h.hallId) in x))
            
    for bm_id, s_indices in bm_session_indices.items():
        if len(s_indices) == 3:
            is_one_days = []
            is_two_days = []
            
            for day, day_slots in slots_by_day_obj.items():
                is_zero = model.NewBoolVar(f'is_zero_3c_{bm_id}_{day}')
                is_one = model.NewBoolVar(f'is_one_3c_{bm_id}_{day}')
                is_two = model.NewBoolVar(f'is_two_3c_{bm_id}_{day}')
                is_three = model.NewBoolVar(f'is_three_3c_{bm_id}_{day}')
                
                is_one_days.append(is_one)
                is_two_days.append(is_two)
                
                # Sum of sessions of this module on this day
                sum_slots = sum(w[s_idx, t.slotId] for s_idx in s_indices for t in day_slots)
                
                # Connect sum_slots to indicator variables
                model.Add(is_zero + is_one + is_two + is_three == 1)
                model.Add(sum_slots == 0 * is_zero + 1 * is_one + 2 * is_two + 3 * is_three)
                
                # Consecutive slots constraint for the day with 2 sessions
                sorted_day_slots = sorted(day_slots, key=lambda slot: slot.slotNumber)
                
                v = {}
                for t in sorted_day_slots:
                    v[t.slotId] = model.NewBoolVar(f'v_{bm_id}_{day}_{t.slotId}')
                    model.Add(v[t.slotId] == sum(w[s_idx, t.slotId] for s_idx in s_indices))
                    
                pairs = []
                for idx in range(len(sorted_day_slots) - 1):
                    t1 = sorted_day_slots[idx]
                    t2 = sorted_day_slots[idx+1]
                    
                    t1_end = t1.endTime[:5]
                    t2_start = t2.startTime[:5]
                    if t1_end == t2_start:
                        pair_var = model.NewBoolVar(f'pair_{bm_id}_{day}_{t1.slotId}_{t2.slotId}')
                        # pair_var <=> (v[t1.slotId] AND v[t2.slotId])
                        model.AddBoolAnd([v[t1.slotId], v[t2.slotId]]).OnlyEnforceIf(pair_var)
                        model.Add(v[t1.slotId] + v[t2.slotId] <= 1).OnlyEnforceIf(pair_var.Not())
                        pairs.append(pair_var)
                        
                if pairs:
                    model.Add(sum(pairs) == 1).OnlyEnforceIf(is_two)
                else:
                    model.Add(is_two == 0)
                    
            # Enforce exactly one day has 1 session, and exactly one day has 2 sessions
            model.Add(sum(is_one_days) == 1)
            model.Add(sum(is_two_days) == 1)

        elif len(s_indices) == 4:
            is_two_days = []
            
            for day, day_slots in slots_by_day_obj.items():
                is_zero = model.NewBoolVar(f'is_zero_4c_{bm_id}_{day}')
                is_one = model.NewBoolVar(f'is_one_4c_{bm_id}_{day}')
                is_two = model.NewBoolVar(f'is_two_4c_{bm_id}_{day}')
                is_three = model.NewBoolVar(f'is_three_4c_{bm_id}_{day}')
                is_four = model.NewBoolVar(f'is_four_4c_{bm_id}_{day}')
                
                is_two_days.append(is_two)
                
                # Sum of sessions of this module on this day
                sum_slots = sum(w[s_idx, t.slotId] for s_idx in s_indices for t in day_slots)
                
                # Connect sum_slots to indicator variables
                model.Add(is_zero + is_one + is_two + is_three + is_four == 1)
                model.Add(sum_slots == 0 * is_zero + 1 * is_one + 2 * is_two + 3 * is_three + 4 * is_four)
                
                # Consecutive slots constraint for the day with 2 sessions
                sorted_day_slots = sorted(day_slots, key=lambda slot: slot.slotNumber)
                
                v = {}
                for t in sorted_day_slots:
                    v[t.slotId] = model.NewBoolVar(f'v_4c_{bm_id}_{day}_{t.slotId}')
                    model.Add(v[t.slotId] == sum(w[s_idx, t.slotId] for s_idx in s_indices))
                    
                pairs = []
                for idx in range(len(sorted_day_slots) - 1):
                    t1 = sorted_day_slots[idx]
                    t2 = sorted_day_slots[idx+1]
                    
                    t1_end = t1.endTime[:5]
                    t2_start = t2.startTime[:5]
                    if t1_end == t2_start:
                        pair_var = model.NewBoolVar(f'pair_4c_{bm_id}_{day}_{t1.slotId}_{t2.slotId}')
                        # pair_var <=> (v[t1.slotId] AND v[t2.slotId])
                        model.AddBoolAnd([v[t1.slotId], v[t2.slotId]]).OnlyEnforceIf(pair_var)
                        model.Add(v[t1.slotId] + v[t2.slotId] <= 1).OnlyEnforceIf(pair_var.Not())
                        pairs.append(pair_var)
                        
                if pairs:
                    model.Add(sum(pairs) == 1).OnlyEnforceIf(is_two)
                else:
                    model.Add(is_two == 0)
                    
            # Enforce exactly two days have 2 sessions each
            model.Add(sum(is_two_days) == 2)

    # Objective: Guide CP-SAT toward a balanced, student-friendly initial solution.
    # Goal: sessions spread across morning AND afternoon, nothing crammed into one block.
    # Cost design:
    #   - Early morning (08:30-10:30): low cost (10)          ← good morning sessions
    #   - Late morning  (10:30-12:30): medium cost (15)       ← still fine, slight spread push
    #   - Lunch boundary (12:30-13:30): very high cost (80)   ← already a hard constraint block
    #   - Afternoon     (13:30-15:30): low cost (10)          ← equally good as morning
    #   - Late afternoon(15:30-16:30): medium cost (20)       ← slightly discouraged
    #   - After 4:30 PM (16:30+):      very high cost (100)   ← strongly avoid
    # The near-equal morning/afternoon costs ensure the solver picks a natural mix.
    # The GA then fine-tunes for exactly balanced distribution (S6) and max 3 consecutive (S8).
    objective_terms = []
    for s_idx in range(num_sessions):
        for t in slots:
            for h in halls:
                if (s_idx, t.slotId, h.hallId) not in x:
                    continue
                var = x[s_idx, t.slotId, h.hallId]
                start = t.startTime[:5]
                if start >= "16:30":
                    cost = 100  # After 4:30 PM — strongly avoid
                elif start >= "15:30":
                    cost = 25   # 3:30-4:30 PM — mildly expensive (soft preference)
                elif start >= "13:30":
                    cost = 10   # Afternoon 1:30-3:30 PM — equally preferred as morning
                elif start >= "12:30":
                    cost = 90   # Lunch slot 12:30-13:30 — near-blocked by hard constraint
                elif start >= "10:30":
                    cost = 15   # Late morning — slight nudge to not over-pack
                else:
                    cost = 10   # Early morning 08:30-10:30 — preferred
                objective_terms.append(cost * var)

    if objective_terms or penalty_terms:
        model.Minimize(sum(objective_terms) + sum(penalty_terms))

    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10.0
    status = solver.Solve(model)
    
    if status == cp_model.FEASIBLE or status == cp_model.OPTIMAL:
        schedule = []
        for s_idx, session in enumerate(sessions):
            for t in slots:
                for h in halls:
                    if solver.BooleanValue(x[s_idx, t.slotId, h.hallId]):
                        schedule.append(TimetableEntryOutput(
                            batchModuleId=session["batchModuleId"],
                            slotId=t.slotId,
                            hallId=h.hallId
                        ))
        return "success", schedule
    else:
        return "infeasible", []

def solve_hard_constraints(req: OptimizeRequest) -> Tuple[str, List[TimetableEntryOutput]]:
    status, schedule = solve_hard_constraints_internal(req, relaxed=False)
    if status == "success":
        return status, schedule
    print("Baseline constraints infeasible. Retrying with relaxed lecturer/hall unavailability...")
    return solve_hard_constraints_internal(req, relaxed=True)
