import random
import copy
from typing import List
from models import OptimizeRequest, TimetableEntryOutput

# Weights for soft constraints
W_GAPS = 2.0           # Penalty for gaps within the same half-day block
W_LECTURER_PREF = 3.0
W_STUDENT_PREF = 2.0
W_DISTRIBUTION = 2.0   # Even spread across weekdays
W_LATE_LECTURES = 8.0  # Strongly avoid lectures after 4:30 PM
W_DAY_BALANCE = 6.0    # Penalise days that are ALL-morning or ALL-afternoon
W_MAX_GAP = 4.0        # Penalise erratic intra-block gaps
W_CONSEC_LIMIT = 9.0   # Strongly penalise > 3 consecutive lecture hours

def calculate_fitness(schedule: List[TimetableEntryOutput], req: OptimizeRequest) -> float:
    # 1. Check Hard Constraints first. If any hard constraint is violated, fitness = 0.0
    slot_to_session = {}
    lecturer_scheduled = {} # (lecturerId, slotId) -> count
    hall_scheduled = {}     # (hallId, slotId) -> count
    day_lecture_counts = {} # dayOfWeek -> count
    mod_slots = {}          # batchModuleId -> list of slots
    
    # Mappings for convenience
    lec_map = {mod.batchModuleId: mod.lecturerId for mod in req.modules}
    slot_map = {t.slotId: t for t in req.timeSlots}
    hall_map = {h.hallId: h for h in req.halls}
    pref_hall_map = {mod.batchModuleId: mod.preferredHallId for mod in req.modules}
    mod_sessions_needed = {mod.batchModuleId: mod.sessionsNeeded for mod in req.modules}
    
    for entry in schedule:
        t = slot_map.get(entry.slotId)
        h = hall_map.get(entry.hallId)
        if not t or not h:
            return 0.0
            
        # H1: Hall capacity must exceed batch size
        if h.capacity < req.studentCount:
            return 0.0
            
        # H2: Batch double-booking
        if entry.slotId in slot_to_session:
            return 0.0
        slot_to_session[entry.slotId] = entry
        
        # H3: Lecturer double-booking
        lec_id = lec_map.get(entry.batchModuleId)
        if lec_id is not None:
            key = (lec_id, entry.slotId)
            lecturer_scheduled[key] = lecturer_scheduled.get(key, 0) + 1
            if lecturer_scheduled[key] > 1:
                return 0.0
                
            # H4: Lecturer unavailability
            unavail_slots = req.lecturerUnavailability.get(str(lec_id), [])
            if entry.slotId in unavail_slots:
                return 0.0
                
        # H5: Hall double-booking
        key_h = (entry.hallId, entry.slotId)
        hall_scheduled[key_h] = hall_scheduled.get(key_h, 0) + 1
        if hall_scheduled[key_h] > 1:
            return 0.0
            
        # H6: Hall unavailability
        unavail_h_slots = req.hallUnavailability.get(str(entry.hallId), [])
        if entry.slotId in unavail_h_slots:
            return 0.0
            
        # H7: Batch lab schedules
        blocked_slots = req.batchLabSchedules.get(str(entry.batchModuleId), [])
        if entry.slotId in blocked_slots:
            return 0.0
            
        # H8: Lunch break
        lunch_start = req.lunchStartTime[:5] if req.lunchStartTime else "12:30"
        lunch_end = req.lunchEndTime[:5] if req.lunchEndTime else "13:30"
        slot_start = t.startTime[:5]
        slot_end = t.endTime[:5]
        if slot_start < lunch_end and slot_end > lunch_start:
            return 0.0
            
        # H12: Wednesday Common Hours (Wednesday 14:30 to 16:30)
        if t.dayOfWeek == "Wednesday":
            if slot_start < "16:30" and slot_end > "14:30":
                return 0.0
            
        # H10: Preferred Hall Check
        pref_hall_id = pref_hall_map.get(entry.batchModuleId)
        if pref_hall_id is not None and entry.hallId != pref_hall_id:
            return 0.0
            
        mod_slots.setdefault(entry.batchModuleId, []).append(t)
        day_lecture_counts[t.dayOfWeek] = day_lecture_counts.get(t.dayOfWeek, 0) + 1
        
    # H9: Dynamic daily limit
    import math
    min_needed_per_day = math.ceil(len(schedule) / 5.0)
    max_hours_limit = max(4, min_needed_per_day + 1)
    for day, count in day_lecture_counts.items():
        if count > max_hours_limit:
            return 0.0
            
    # H11: 3-Credit (3-Hour) and 4-Credit (4-Hour) Split Constraint Check
    for bm_id, s_list in mod_slots.items():
        needed = mod_sessions_needed.get(bm_id, 0)
        if needed == 3:
            # Group slots by day
            day_slots = {}
            for slot in s_list:
                day_slots.setdefault(slot.dayOfWeek, []).append(slot)
            if len(day_slots) != 2:
                return 0.0
            counts = [len(lst) for lst in day_slots.values()]
            if sorted(counts) != [1, 2]:
                return 0.0
            # Check if the 2 slots on the same day are consecutive in time
            for day, slots_on_day in day_slots.items():
                if len(slots_on_day) == 2:
                    slots_on_day.sort(key=lambda s: s.slotNumber)
                    t1, t2 = slots_on_day[0], slots_on_day[1]
                    t1_end = t1.endTime[:5]
                    t2_start = t2.startTime[:5]
                    if t1_end != t2_start:
                        return 0.0
        elif needed == 4:
            # Group slots by day
            day_slots = {}
            for slot in s_list:
                day_slots.setdefault(slot.dayOfWeek, []).append(slot)
            if len(day_slots) != 2:
                return 0.0
            counts = [len(lst) for lst in day_slots.values()]
            if sorted(counts) != [2, 2]:
                return 0.0
            # On each of the 2 days, the 2 slots must be consecutive
            for day, slots_on_day in day_slots.items():
                slots_on_day.sort(key=lambda s: s.slotNumber)
                t1, t2 = slots_on_day[0], slots_on_day[1]
                t1_end = t1.endTime[:5]
                t2_start = t2.startTime[:5]
                if t1_end != t2_start:
                    return 0.0
                        
    # ── Soft constraints ─────────────────────────────────────────────────────
    score = 1000.0  # Base score

    lunch_start_str = req.lunchStartTime[:5] if req.lunchStartTime else "12:30"
    lunch_end_str   = req.lunchEndTime[:5]   if req.lunchEndTime   else "13:30"

    # Build per-day slot data for this schedule
    entries_by_day = {}   # day -> sorted list of (startTime, endTime, slotNumber)
    for entry in schedule:
        t = slot_map.get(entry.slotId)
        if t:
            entries_by_day.setdefault(t.dayOfWeek, []).append(
                (t.startTime[:5], t.endTime[:5], t.slotNumber)
            )
    for day in entries_by_day:
        entries_by_day[day].sort(key=lambda p: p[0])  # sort by start time

    # ── S1: Penalise intra-block gaps (within the same morning or afternoon block)
    # A gap through the lunch break is NATURAL and NOT penalised.
    # A gap within the morning block (e.g. 08:30, 10:30 — skip 09:30) IS penalised.
    intra_gap_penalty = 0.0
    for day, pairs in entries_by_day.items():
        # Split into morning block (before lunch) and afternoon block (after lunch)
        morning_nums = sorted([p[2] for p in pairs if p[0] < lunch_start_str])
        afternoon_nums = sorted([p[2] for p in pairs if p[0] >= lunch_end_str])

        for block in [morning_nums, afternoon_nums]:
            for i in range(len(block) - 1):
                gap = block[i+1] - block[i] - 1
                if gap > 0:
                    intra_gap_penalty += (gap * gap) * 10.0
    score -= intra_gap_penalty * W_GAPS

    # ── S2: Lecturer preferences
    lecturer_pref_score = 0.0
    for entry in schedule:
        lec_id = lec_map.get(entry.batchModuleId)
        if lec_id is not None:
            prefs = req.lecturerPreferences.get(str(lec_id), [])
            if entry.slotId in prefs:
                lecturer_pref_score += 10.0
    score += lecturer_pref_score * W_LECTURER_PREF

    # ── S3: Student preferences
    student_pref_score = 0.0
    for entry in schedule:
        if entry.slotId in req.studentPreferences:
            student_pref_score += 10.0
    score += student_pref_score * W_STUDENT_PREF

    # ── S4: Distribute sessions evenly across weekdays
    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    total_sessions = len(schedule)
    ideal_per_day = total_sessions / len(days_of_week)
    dist_penalty = 0.0
    for day in days_of_week:
        count = day_lecture_counts.get(day, 0)
        dist_penalty += abs(count - ideal_per_day) * 5.0
    score -= dist_penalty * W_DISTRIBUTION

    # ── S5: Avoid lectures after 4:30 PM
    late_penalty = 0.0
    for entry in schedule:
        t = slot_map.get(entry.slotId)
        if t and t.startTime[:5] >= "16:30":
            late_penalty += 10.0
    score -= late_penalty * W_LATE_LECTURES

    # ── S6: Balanced day distribution — each active day should have BOTH
    # morning (before lunch) AND afternoon (after lunch) sessions.
    # A day that is ALL morning or ALL afternoon is penalised.
    balance_penalty = 0.0
    for day, pairs in entries_by_day.items():
        morning_count  = sum(1 for p in pairs if p[0] < lunch_start_str)
        afternoon_count = sum(1 for p in pairs if p[0] >= lunch_end_str)
        total_day = morning_count + afternoon_count

        if total_day < 2:
            continue  # Only 1 session — can't balance, skip

        # Perfect balance = morning_count / total_day ≈ 0.5
        # Imbalance = how far we are from 50/50
        imbalance = abs(morning_count - afternoon_count)

        if morning_count == 0:
            # ALL afternoon — strongly penalise (no morning at all)
            balance_penalty += total_day * 15.0
        elif afternoon_count == 0:
            # ALL morning — penalise (no afternoon at all)
            balance_penalty += total_day * 15.0
        else:
            # Some imbalance but both halves have sessions — lighter penalty
            balance_penalty += imbalance * 5.0
    score -= balance_penalty * W_DAY_BALANCE

    # ── S7: Penalise erratic gaps within a half-day block (> 1 free slot)
    # This catches cases like morning block having 08:30, 11:30 (2 slots skipped).
    # The inter-block gap (through lunch) is intentional and not penalised.
    intra_large_gap_penalty = 0.0
    for day, pairs in entries_by_day.items():
        morning_nums  = sorted([p[2] for p in pairs if p[0] < lunch_start_str])
        afternoon_nums = sorted([p[2] for p in pairs if p[0] >= lunch_end_str])

        for block in [morning_nums, afternoon_nums]:
            for i in range(len(block) - 1):
                gap = block[i+1] - block[i] - 1
                if gap > 1:
                    intra_large_gap_penalty += (gap - 1) * 12.0
    score -= intra_large_gap_penalty * W_MAX_GAP

    # ── S8: Maximum 3 CONSECUTIVE hours (no break)
    # Find runs of back-to-back sessions; penalise any run > 3 hours.
    consec_penalty = 0.0
    for day, pairs in entries_by_day.items():
        current_run = 1
        for i in range(1, len(pairs)):
            if pairs[i-1][1] == pairs[i][0]:   # end of prev == start of next
                current_run += 1
            else:
                if current_run > 3:
                    extra = current_run - 3
                    consec_penalty += (extra * extra) * 20.0
                current_run = 1
        if current_run > 3:
            extra = current_run - 3
            consec_penalty += (extra * extra) * 20.0
    score -= consec_penalty * W_CONSEC_LIMIT

    return max(0.1, score)

def mutate(schedule: List[TimetableEntryOutput], req: OptimizeRequest) -> List[TimetableEntryOutput]:
    mutated = copy.deepcopy(schedule)
    if not mutated:
        return mutated
        
    choice = random.random()
    if choice < 0.5:
        # Mutate a single session's slot and hall
        idx = random.randint(0, len(mutated) - 1)
        random_slot = random.choice(req.timeSlots)
        suitable_halls = [h for h in req.halls if h.capacity >= req.studentCount]
        if suitable_halls:
            random_hall = random.choice(suitable_halls)
            mutated[idx].slotId = random_slot.slotId
            mutated[idx].hallId = random_hall.hallId
    else:
        # Swap slots/halls of two sessions
        if len(mutated) > 1:
            idx1, idx2 = random.sample(range(len(mutated)), 2)
            mutated[idx1].slotId, mutated[idx2].slotId = mutated[idx2].slotId, mutated[idx1].slotId
            mutated[idx1].hallId, mutated[idx2].hallId = mutated[idx2].hallId, mutated[idx1].hallId
            
    return mutated

def crossover(parent1: List[TimetableEntryOutput], parent2: List[TimetableEntryOutput]) -> List[TimetableEntryOutput]:
    if not parent1 or not parent2 or len(parent1) != len(parent2):
        return copy.deepcopy(parent1)
        
    cut = random.randint(1, len(parent1) - 1)
    child = copy.deepcopy(parent1[:cut]) + copy.deepcopy(parent2[cut:])
    return child

def optimize_soft_constraints(feasible_schedule: List[TimetableEntryOutput], req: OptimizeRequest, generations: int = 100, pop_size: int = 30) -> List[TimetableEntryOutput]:
    if not feasible_schedule:
        return feasible_schedule
        
    population = [feasible_schedule]
    for _ in range(pop_size - 1):
        mutated = mutate(feasible_schedule, req)
        if calculate_fitness(mutated, req) > 0.0:
            population.append(mutated)
        else:
            population.append(feasible_schedule)
            
    best_schedule = feasible_schedule
    best_fitness = calculate_fitness(feasible_schedule, req)
    
    for gen in range(generations):
        fitnesses = [calculate_fitness(ind, req) for ind in population]
        
        for ind, fit in zip(population, fitnesses):
            if fit > best_fitness:
                best_fitness = fit
                best_schedule = copy.deepcopy(ind)
                
        next_population = []
        for _ in range(pop_size):
            participants = random.sample(list(zip(population, fitnesses)), k=min(3, len(population)))
            winner = max(participants, key=lambda x: x[1])[0]
            next_population.append(copy.deepcopy(winner))
            
        for i in range(0, pop_size - 1, 2):
            if random.random() < 0.7:
                next_population[i] = crossover(next_population[i], next_population[i+1])
                
        for i in range(pop_size):
            if random.random() < 0.2:
                mutated = mutate(next_population[i], req)
                if calculate_fitness(mutated, req) > 0.0:
                    next_population[i] = mutated
                    
        population = next_population
        
    return best_schedule
