package com.foe.timetable.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.foe.timetable.model.Batch;
import com.foe.timetable.model.BatchLabSchedule;
import com.foe.timetable.model.BatchModule;
import com.foe.timetable.model.Hall;
import com.foe.timetable.model.TimeSlot;
import com.foe.timetable.model.Timetable;
import com.foe.timetable.model.TimetableEntry;
import com.foe.timetable.model.dto.OptimizationRequest;
import com.foe.timetable.model.dto.OptimizationResult;
import com.foe.timetable.model.dto.TimetableEntryViewDto;
import com.foe.timetable.repository.BatchLabScheduleRepository;
import com.foe.timetable.repository.BatchModuleRepository;
import com.foe.timetable.repository.BatchRepository;
import com.foe.timetable.repository.HallRepository;
import com.foe.timetable.repository.TimeSlotRepository;
import com.foe.timetable.repository.TimetableEntryRepository;
import com.foe.timetable.repository.TimetableRepository;
import com.foe.timetable.model.Module;
import com.foe.timetable.model.Lecturer;
import com.foe.timetable.repository.ModuleRepository;
import com.foe.timetable.repository.LecturerRepository;

@Service
public class TimetableGenerationService {

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private BatchModuleRepository batchModuleRepository;

    @Autowired
    private HallRepository hallRepository;

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    @Autowired
    private TimetableRepository timetableRepository;

    @Autowired
    private TimetableEntryRepository timetableEntryRepository;

    @Autowired
    private TimetableMapperService timetableMapperService;

    @Autowired
    private BatchLabScheduleRepository batchLabScheduleRepository;

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private LecturerRepository lecturerRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Transactional
    public List<TimetableEntryViewDto> generateForBatch(Integer batchId, Integer departmentId) {
        Batch batch = batchRepository.findById(batchId)
            .orElseThrow(() -> new IllegalArgumentException("Batch not found: " + batchId));

        // Auto-link shared modules across departments for this batch (e.g. EE and EC shared modules)
        autoLinkSharedModules(batchId);

        List<BatchModule> batchModules = batchModuleRepository.findByBatch_BatchId(batchId);
        if (batchModules.isEmpty()) {
            // Auto-populate batch modules for this batch based on modules in the same semester
            autoPopulateBatchModules(batch);
            batchModules = batchModuleRepository.findByBatch_BatchId(batchId);
            if (batchModules.isEmpty()) {
                throw new IllegalStateException("No modules assigned to this batch's semester (" + batch.getSemester() + ") in the database.");
            }
        }

        // Filter by department if batch semester >= 3 and departmentId is not null
        if (batch.getSemester() >= 3 && departmentId != null) {
            final Integer deptId = departmentId;
            batchModules = batchModules.stream()
                .filter(bm -> bm.isOfferedByDepartment(deptId))
                .collect(Collectors.toList());
            if (batchModules.isEmpty()) {
                throw new IllegalStateException("No modules assigned for department ID " + departmentId + " in this batch.");
            }
        }

        List<Hall> halls = hallRepository.findByIsActiveTrue();
        List<TimeSlot> timeSlots = timeSlotRepository.findAll();

        if (halls.isEmpty()) {
            throw new IllegalStateException("No active halls found in the database.");
        }
        if (timeSlots.isEmpty()) {
            throw new IllegalStateException("No time slots found in the database.");
        }

        // Always create a new draft timetable version on generation to preserve version history
        Timetable timetable = createTimetable(batch, (batch.getSemester() >= 3) ? departmentId : null);

        // Delete existing entries for IS modules and linked shared modules of this batch across ALL timetables of the batch (only if they are not scheduled elsewhere)
        if (batch.getSemester() >= 3 && departmentId != null) {
            List<BatchModule> allBms = batchModuleRepository.findByBatch_BatchId(batchId);
            for (BatchModule bm : allBms) {
                boolean isISModule = bm.getModule() != null && 
                                     bm.getModule().getDepartment() != null && 
                                     (bm.getModule().getDepartment().getDepartmentId().equals(4) || 
                                      "IS".equals(bm.getModule().getDepartment().getDepartmentCode()));
                boolean isLinkedModule = bm.getLinkedBatchModuleId() != null || (bm.getIsShared() != null && bm.getIsShared());
                
                if (isISModule || isLinkedModule) {
                    List<TimetableEntry> entries = timetableEntryRepository.findByBatchModule_BatchModuleId(bm.getBatchModuleId());
                    long count = entries.stream()
                        .filter(te -> !te.getTimetableId().equals(timetable.getTimetableId()))
                        .count();
                    if (count == 0) {
                        timetableEntryRepository.deleteByBatchModuleId(bm.getBatchModuleId());
                    }
                }
            }
        }

        // Build Optimization Request
        OptimizationRequest optRequest = new OptimizationRequest();
        optRequest.setBatchId(batchId);
        
        int optStudentCount = batch.getStudentCount() != null ? batch.getStudentCount() : 40;
        if (batch.getSemester() >= 3 && departmentId != null) {
            try {
                Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM user_account WHERE batch_id = ? AND department_id = ? AND role = 'student'",
                    Integer.class, batchId, departmentId
                );
                if (count != null && count > 0) {
                    optStudentCount = count;
                } else {
                    optStudentCount = Math.min(150, optStudentCount / 3);
                    if (optStudentCount < 30) optStudentCount = 40;
                }
            } catch (Exception e) {
                optStudentCount = Math.min(150, optStudentCount / 3);
                if (optStudentCount < 30) optStudentCount = 40;
            }
        }
        // Cap student count by the capacity of preferred halls to avoid infeasibility
        for (BatchModule bm : batchModules) {
            if (bm.getPreferredHall() != null && bm.getPreferredHall().getCapacity() != null) {
                if (optStudentCount > bm.getPreferredHall().getCapacity()) {
                    optStudentCount = bm.getPreferredHall().getCapacity();
                }
            }
        }
        optRequest.setStudentCount(optStudentCount);
        optRequest.setLunchStartTime(batch.getLunchStartTime() != null ? batch.getLunchStartTime() : "12:30");
        optRequest.setLunchEndTime(batch.getLunchEndTime() != null ? batch.getLunchEndTime() : "13:30");

        List<BatchModule> ownModules = new ArrayList<>();
        List<BatchModule> sharedModulesToClone = new ArrayList<>();

        for (BatchModule bm : batchModules) {
            boolean isSharedConfig = bm.getIsShared() != null && bm.getIsShared() && departmentId != null;
            boolean isISModule = bm.getModule() != null && 
                                 bm.getModule().getDepartment() != null && 
                                 (bm.getModule().getDepartment().getDepartmentId().equals(4) || 
                                  "IS".equals(bm.getModule().getDepartment().getDepartmentCode()));
            
            boolean alreadyScheduledElsewhere = false;
            if (isISModule && departmentId != null) {
                // If the IS module is already scheduled in any other timetable (e.g. by another department),
                // we should clone it rather than re-scheduling it and creating conflicts.
                List<TimetableEntry> entries = timetableEntryRepository.findByBatchModule_BatchModuleId(bm.getBatchModuleId());
                long count = entries.stream()
                    .filter(te -> !te.getTimetableId().equals(timetable.getTimetableId()))
                    .count();
                if (count > 0) {
                    alreadyScheduledElsewhere = true;
                }
            }

            if (isSharedConfig || alreadyScheduledElsewhere) {
                sharedModulesToClone.add(bm);
            } else {
                ownModules.add(bm);
            }
        }

        // Map Modules
        final int finalOptStudentCount = optStudentCount;
        List<OptimizationRequest.ModuleInput> moduleInputs = ownModules.stream().map(bm -> {
            OptimizationRequest.ModuleInput mInput = new OptimizationRequest.ModuleInput();
            mInput.setBatchModuleId(bm.getBatchModuleId());
            mInput.setModuleCode(bm.getModule().getModuleCode());
            mInput.setModuleName(bm.getModule().getModuleName());
            
            int hours = bm.getModule().getLectureHoursPerWeek() != null && bm.getModule().getLectureHoursPerWeek() > 0
                ? bm.getModule().getLectureHoursPerWeek()
                : 1;
            mInput.setSessionsNeeded(hours);
            mInput.setLecturerId(bm.getLecturerId());
            mInput.setLecturerIds(new java.util.ArrayList<>(bm.getAllLecturerIds()));
            mInput.setPreferredHallId(bm.getPreferredHall() != null ? bm.getPreferredHall().getHallId() : null);
            
            boolean isComputerNeeded = bm.getModule().getNeedsComputer() != null ? bm.getModule().getNeedsComputer() : false;
            if (!isComputerNeeded && bm.getModule().getModuleName() != null) {
                String name = bm.getModule().getModuleName().toLowerCase();
                if (name.contains("computer") || name.contains("programming") || 
                    name.contains("software") || name.contains("database") || 
                    name.contains("network") || name.contains("information")) {
                    isComputerNeeded = true;
                }
            }
            mInput.setNeedsComputer(isComputerNeeded);
            int moduleStudentCount = finalOptStudentCount;
            boolean isSharedModuleConfig = (Boolean.TRUE.equals(bm.getIsShared())) || bm.getLinkedBatchModuleId() != null;

            if (isSharedModuleConfig) {
                String normalizedName = normalizeModuleName(bm.getModule() != null ? bm.getModule().getModuleName() : "");
                List<BatchModule> allBatchModules = batchModuleRepository.findByBatch_BatchId(batchId);
                int sharedTotalStudentCount = 0;
                java.util.Set<Integer> countedDeptIds = new java.util.HashSet<>();

                for (BatchModule otherBm : allBatchModules) {
                    if (otherBm.getModule() != null && normalizeModuleName(otherBm.getModule().getModuleName()).equals(normalizedName)) {
                        Integer deptId = (otherBm.getModule().getDepartment() != null) ? otherBm.getModule().getDepartment().getDepartmentId() : null;
                        if (deptId != null && !countedDeptIds.contains(deptId)) {
                            countedDeptIds.add(deptId);
                            try {
                                Integer count = jdbcTemplate.queryForObject("SELECT student_count FROM department WHERE department_id = ?", Integer.class, deptId);
                                if (count != null && count > 0) {
                                    sharedTotalStudentCount += count;
                                }
                            } catch (Exception e) {}
                        }
                    }
                }
                if (sharedTotalStudentCount > 0) {
                    moduleStudentCount = sharedTotalStudentCount;
                }
            } else if (bm.getOfferingDeptIds() != null && !bm.getOfferingDeptIds().isEmpty()) {
                String[] deptIds = bm.getOfferingDeptIds().split(",");
                int totalCount = 0;
                for (String dIdStr : deptIds) {
                    try {
                        Integer count = jdbcTemplate.queryForObject("SELECT student_count FROM department WHERE department_id = ?", Integer.class, Integer.parseInt(dIdStr.trim()));
                        if (count != null) totalCount += count;
                    } catch (Exception e) {}
                }
                if (totalCount > 0) moduleStudentCount = totalCount;
            } else if (bm.getModule() != null && bm.getModule().getDepartment() != null) {
                try {
                    Integer count = jdbcTemplate.queryForObject("SELECT student_count FROM department WHERE department_id = ?", Integer.class, bm.getModule().getDepartment().getDepartmentId());
                    if (count != null && count > 0) moduleStudentCount = count;
                } catch (Exception e) {}
            }
            mInput.setStudentCount(moduleStudentCount);

            return mInput;
        }).collect(Collectors.toList());
        optRequest.setModules(moduleInputs);

        // Map Halls
        List<OptimizationRequest.HallInput> hallInputs = halls.stream().map(h -> {
            OptimizationRequest.HallInput hInput = new OptimizationRequest.HallInput();
            hInput.setHallId(h.getHallId());
            hInput.setHallName(h.getHallName());
            hInput.setCapacity(h.getCapacity() != null ? h.getCapacity() : 60);
            hInput.setIsComputerLab(h.getIsComputerLab() != null ? h.getIsComputerLab() : false);
            return hInput;
        }).collect(Collectors.toList());
        optRequest.setHalls(hallInputs);

        // Map Time Slots
        List<OptimizationRequest.TimeSlotInput> slotInputs = timeSlots.stream().map(ts -> {
            OptimizationRequest.TimeSlotInput sInput = new OptimizationRequest.TimeSlotInput();
            sInput.setSlotId(ts.getSlotId());
            sInput.setDayOfWeek(ts.getDayOfWeek());
            sInput.setStartTime(ts.getStartTime());
            sInput.setEndTime(ts.getEndTime());
            sInput.setSlotNumber(ts.getSlotId()); // Using ID as sequential slot ordering
            return sInput;
        }).collect(Collectors.toList());
        optRequest.setTimeSlots(slotInputs);

        // Fetch lecturer unavailabilities and preferences
        Map<String, List<Integer>> lecturerUnavailability = new HashMap<>();
        Map<String, List<Integer>> lecturerPreferences = new HashMap<>();
        for (BatchModule bm : batchModules) {
            for (Integer lecId : bm.getAllLecturerIds()) {
                if (lecId == null) continue;
                String lecIdStr = String.valueOf(lecId);
                if (!lecturerUnavailability.containsKey(lecIdStr)) {
                    // Fetch predefined unavailability
                    List<Integer> unavail = jdbcTemplate.queryForList(
                        "SELECT slot_id FROM lecturer_unavailability WHERE lecturer_id = ?",
                        Integer.class, lecId
                    );
                     // Fetch other batch/department bookings (restricted to active/published timetables, excluding same batch/department and shared/IS modules of same batch)
                    Integer currentDeptId = (departmentId != null) ? departmentId : -1;
                    List<Integer> otherBookings = jdbcTemplate.queryForList(
                        "SELECT te.slot_id FROM timetable_entry te " +
                        "JOIN timetable t2 ON te.timetable_id = t2.timetable_id " +
                        "JOIN batch_module bm2 ON te.batch_module_id = bm2.batch_module_id " +
                        "JOIN module m2 ON bm2.module_id = m2.module_id " +
                        "LEFT JOIN batch_module_lecturer bml ON bm2.batch_module_id = bml.batch_module_id " +
                        "WHERE (bm2.lecturer_id = ? OR bml.lecturer_id = ?) AND t2.status = 'active' " +
                        "AND NOT (t2.batch_id = ? AND COALESCE(t2.department_id, -1) = ?) " +
                        "AND NOT (t2.batch_id = ? AND (bm2.is_shared = 1 OR m2.department_id = 4))",
                        Integer.class, lecId, lecId, batch.getBatchId(), currentDeptId, batch.getBatchId()
                    );
                    List<Integer> combined = new ArrayList<>(unavail);
                    combined.addAll(otherBookings);
                    lecturerUnavailability.put(lecIdStr, combined);
                }
                if (!lecturerPreferences.containsKey(lecIdStr)) {
                    List<Integer> prefs = jdbcTemplate.queryForList(
                        "SELECT slot_id FROM lecturer_preference WHERE lecturer_id = ? AND preference_level = 'preferred'",
                        Integer.class, lecId
                    );
                    lecturerPreferences.put(lecIdStr, prefs);
                }
            }
        }
        optRequest.setLecturerUnavailability(lecturerUnavailability);
        optRequest.setLecturerPreferences(lecturerPreferences);

        // Fetch hall unavailabilities (predefined + active other batch bookings)
        Map<String, List<Integer>> hallUnavailability = new HashMap<>();
        for (Hall h : halls) {
            String hIdStr = String.valueOf(h.getHallId());
            List<Integer> unavail = jdbcTemplate.queryForList(
                "SELECT slot_id FROM hall_unavailability WHERE hall_id = ?",
                Integer.class, h.getHallId()
            );
            Integer currentDeptId = (departmentId != null) ? departmentId : -1;
            List<Integer> otherBookings = jdbcTemplate.queryForList(
                "SELECT te.slot_id FROM timetable_entry te " +
                "JOIN timetable t2 ON te.timetable_id = t2.timetable_id " +
                "JOIN batch_module bm2 ON te.batch_module_id = bm2.batch_module_id " +
                "JOIN module m2 ON bm2.module_id = m2.module_id " +
                "WHERE te.hall_id = ? AND t2.status = 'active' " +
                "AND NOT (t2.batch_id = ? AND COALESCE(t2.department_id, -1) = ?) " +
                "AND NOT (t2.batch_id = ? AND (bm2.is_shared = 1 OR m2.department_id = 4))",
                Integer.class, h.getHallId(), batch.getBatchId(), currentDeptId, batch.getBatchId()
            );
            List<Integer> combined = new ArrayList<>(unavail);
            combined.addAll(otherBookings);
            hallUnavailability.put(hIdStr, combined);
        }
        optRequest.setHallUnavailability(hallUnavailability);

        // Fetch Batch Lab schedules mapped to slotId per module
        List<BatchLabSchedule> labs = batchLabScheduleRepository.findByBatch_BatchId(batchId);
        Map<String, List<Integer>> batchLabSchedules = new HashMap<>();

        for (BatchModule bm : batchModules) {
            String bmIdStr = String.valueOf(bm.getBatchModuleId());
            List<Integer> blockedSlots = new ArrayList<>();

            for (BatchLabSchedule lab : labs) {
                boolean applies = false;
                if (batch.getSemester() == 1 || batch.getSemester() == 2) {
                    if (lab.getDepartment() == null) {
                        applies = true;
                    }
                } else {
                    if (lab.getDepartment() != null) {
                        boolean isSharedModule = (bm.getIsShared() != null && bm.getIsShared()) || 
                                                 (bm.getModule() != null && 
                                                  bm.getModule().getDepartment() != null && 
                                                  (bm.getModule().getDepartment().getDepartmentId().equals(4) || 
                                                   "IS".equals(bm.getModule().getDepartment().getDepartmentCode())));
                        if (isSharedModule) {
                            applies = true;
                        } else {
                            Integer targetDeptId = (departmentId != null) ? departmentId : (bm.getModule().getDepartment() != null ? bm.getModule().getDepartment().getDepartmentId() : null);
                            if (lab.getDepartment().getDepartmentId().equals(targetDeptId)) {
                                applies = true;
                            }
                        }
                    }
                }

                if (applies) {
                    java.time.LocalTime labStart = parseTime(lab.getStartTime());
                    java.time.LocalTime labEnd = parseTime(lab.getEndTime());
                    if (labStart != null && labEnd != null) {
                        for (TimeSlot slot : timeSlots) {
                            if (slot.getDayOfWeek().equalsIgnoreCase(lab.getDayOfWeek())) {
                                java.time.LocalTime slotStart = parseTime(slot.getStartTime());
                                java.time.LocalTime slotEnd = parseTime(slot.getEndTime());
                                if (slotStart != null && slotEnd != null) {
                                    if (!slotStart.isBefore(labStart) && !slotEnd.isAfter(labEnd)) {
                                        blockedSlots.add(slot.getSlotId());
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Block slots occupied by shared modules already scheduled in sibling timetables
            // so the optimizer doesn't schedule this core module in those slots (student clash prevention)
            for (BatchModule sharedBm : sharedModulesToClone) {
                Integer sourceBatchModuleId;
                if (sharedBm.getIsShared() != null && sharedBm.getIsShared() && sharedBm.getLinkedBatchModuleId() != null) {
                    sourceBatchModuleId = sharedBm.getLinkedBatchModuleId();
                } else {
                    sourceBatchModuleId = sharedBm.getBatchModuleId();
                }
                if (sourceBatchModuleId != null) {
                    List<TimetableEntry> sourceEntries = timetableEntryRepository.findByBatchModule_BatchModuleId(sourceBatchModuleId);
                    if (!sourceEntries.isEmpty()) {
                        Map<Integer, List<TimetableEntry>> grouped = sourceEntries.stream()
                            .collect(Collectors.groupingBy(TimetableEntry::getTimetableId));
                        Integer latestTimetableId = grouped.keySet().stream()
                            .max(Integer::compareTo)
                            .orElse(null);
                        if (latestTimetableId != null) {
                            List<TimetableEntry> externalEntries = grouped.get(latestTimetableId).stream()
                                .filter(te -> !te.getTimetableId().equals(timetable.getTimetableId()))
                                .toList();
                            for (TimetableEntry te : externalEntries) {
                                blockedSlots.add(te.getTimeSlot().getSlotId());
                            }
                        }
                    }
                }
            }

            batchLabSchedules.put(bmIdStr, blockedSlots);
        }
        optRequest.setBatchLabSchedules(batchLabSchedules);

        // Fetch Student Preferences
        List<Integer> studentPreferences = jdbcTemplate.queryForList(
            "SELECT ts.slot_id FROM student_preference sp JOIN time_slot ts ON sp.preferred_day COLLATE utf8mb4_unicode_ci = ts.day_of_week AND ts.start_time LIKE CONCAT(sp.preferred_time, '%') JOIN user_account ua ON sp.student_id = ua.user_id WHERE ua.batch_id = ?",
            Integer.class, batchId
        );
        optRequest.setStudentPreferences(studentPreferences);

        // Debug prints
        System.out.println("=== OPTIMIZATION REQUEST DEBUG ===");
        System.out.println("Batch ID: " + optRequest.getBatchId());
        System.out.println("Student Count: " + optRequest.getStudentCount());
        System.out.println("Lunch Start: " + optRequest.getLunchStartTime() + ", End: " + optRequest.getLunchEndTime());
        System.out.println("Total TimeSlots: " + (optRequest.getTimeSlots() != null ? optRequest.getTimeSlots().size() : 0));
        System.out.println("Total Halls: " + (optRequest.getHalls() != null ? optRequest.getHalls().size() : 0));
        if (optRequest.getModules() != null) {
            System.out.println("Modules Count: " + optRequest.getModules().size());
            int totalSessions = optRequest.getModules().stream().mapToInt(m -> m.getSessionsNeeded()).sum();
            System.out.println("Total Sessions Needed: " + totalSessions);
            for (var m : optRequest.getModules()) {
                System.out.println("  Module " + m.getModuleCode() + " (ID: " + m.getBatchModuleId() + "): Lecturer ID: " + m.getLecturerId() + ", Sessions: " + m.getSessionsNeeded());
            }
        }
        System.out.println("Lecturer Unavailability: " + optRequest.getLecturerUnavailability());
        System.out.println("Hall Unavailability: " + optRequest.getHallUnavailability());
        System.out.println("Batch Lab Schedules: " + optRequest.getBatchLabSchedules());
        System.out.println("==================================");

        // Call FastAPI microservice
        RestTemplate restTemplate = new RestTemplate();
        String url = "http://timetable-optimizer-env.eba-j5hc3u2e.eu-north-1.elasticbeanstalk.com/optimize";
        
        try {
            ResponseEntity<OptimizationResult> response = restTemplate.postForEntity(url, optRequest, OptimizationResult.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                OptimizationResult result = response.getBody();
                if ("success".equals(result.getStatus())) {
                    for (OptimizationResult.TimetableEntryOutput entryOut : result.getSchedule()) {
                        TimetableEntry entry = new TimetableEntry();
                        entry.setTimetableId(timetable.getTimetableId());
                        
                        BatchModule bm = batchModuleRepository.findById(entryOut.getBatchModuleId()).orElse(null);
                        Hall hall = hallRepository.findById(entryOut.getHallId()).orElse(null);
                        TimeSlot slot = timeSlotRepository.findById(entryOut.getSlotId()).orElse(null);
                        
                        if (bm != null && hall != null && slot != null) {
                            entry.setBatchModule(bm);
                            entry.setHall(hall);
                            entry.setTimeSlot(slot);
                            entry.setSessionType(bm.getModule().getSessionType() != null ? bm.getModule().getSessionType().name() : "lecture");
                            entry.setIsRecurring(true);
                            timetableEntryRepository.save(entry);
                        }
                    }

                    // Clone shared module entries from their linked modules
                    for (BatchModule sharedBm : sharedModulesToClone) {
                        Integer sourceBatchModuleId = null;
                        if (sharedBm.getIsShared() != null && sharedBm.getIsShared() && sharedBm.getLinkedBatchModuleId() != null) {
                            sourceBatchModuleId = sharedBm.getLinkedBatchModuleId();
                        } else {
                            sourceBatchModuleId = sharedBm.getBatchModuleId();
                        }

                        if (sourceBatchModuleId != null) {
                            List<TimetableEntry> sourceEntries = timetableEntryRepository.findByBatchModule_BatchModuleId(sourceBatchModuleId);
                            List<TimetableEntry> externalEntries = new ArrayList<>();
                            if (!sourceEntries.isEmpty()) {
                                Map<Integer, List<TimetableEntry>> grouped = sourceEntries.stream()
                                    .collect(Collectors.groupingBy(TimetableEntry::getTimetableId));
                                Integer latestTimetableId = grouped.keySet().stream()
                                    .max(Integer::compareTo)
                                    .orElse(null);
                                if (latestTimetableId != null) {
                                    externalEntries = grouped.get(latestTimetableId).stream()
                                        .filter(te -> !te.getTimetableId().equals(timetable.getTimetableId()))
                                        .toList();
                                }
                            }
                            for (TimetableEntry le : externalEntries) {
                                TimetableEntry entry = new TimetableEntry();
                                entry.setTimetableId(timetable.getTimetableId());
                                entry.setBatchModule(sharedBm);
                                entry.setHall(le.getHall());
                                entry.setTimeSlot(le.getTimeSlot());
                                entry.setSessionType(le.getSessionType());
                                entry.setIsRecurring(le.getIsRecurring());
                                timetableEntryRepository.save(entry);
                            }
                        }
                    }

                    // Sync IS modules and shared modules across all other timetables of the batch (restricted to latest version of each department, only for department-specific semesters)
                    if (departmentId != null) {
                        List<TimetableEntry> currentEntries = timetableEntryRepository.findByTimetableId(timetable.getTimetableId());
                        for (TimetableEntry te : currentEntries) {
                            BatchModule bm = te.getBatchModule();
                            if (bm == null) continue;
                            
                            final Integer bmId = bm.getBatchModuleId();
                            boolean isOwn = ownModules.stream().anyMatch(om -> om.getBatchModuleId().equals(bmId));
                            if (!isOwn) continue;
                            
                            boolean isISModule = bm.getModule() != null && 
                                                 bm.getModule().getDepartment() != null && 
                                                 (bm.getModule().getDepartment().getDepartmentId().equals(4) || 
                                                  "IS".equals(bm.getModule().getDepartment().getDepartmentCode()));
                            
                            if (isISModule) {
                                List<com.foe.timetable.model.Timetable> otherTimetables = timetableRepository.findByBatchIdOrderByGeneratedAtDesc(batchId).stream()
                                    .filter(tt -> !tt.getTimetableId().equals(timetable.getTimetableId()))
                                    .collect(Collectors.groupingBy(tt -> tt.getDepartmentId() == null ? -1 : tt.getDepartmentId()))
                                    .values().stream()
                                    .map(list -> list.stream().max(java.util.Comparator.comparing(com.foe.timetable.model.Timetable::getTimetableId)).get())
                                    .toList();
                                
                                for (com.foe.timetable.model.Timetable ot : otherTimetables) {
                                    if (ot.getDepartmentId() != null && !bm.isOfferedByDepartment(ot.getDepartmentId())) {
                                        continue;
                                    }
                                    try {
                                        jdbcTemplate.update(
                                            "DELETE te FROM timetable_entry te " +
                                            "JOIN batch_module bm2 ON te.batch_module_id = bm2.batch_module_id " +
                                            "JOIN module m2 ON bm2.module_id = m2.module_id " +
                                            "WHERE te.timetable_id = ? AND m2.module_code = ?",
                                            ot.getTimetableId(), bm.getModule().getModuleCode()
                                        );
                                    } catch (Exception e) {
                                        System.out.println("Sync warning: Could not delete old entries: " + e.getMessage());
                                    }
                                     try {
                                         jdbcTemplate.update(
                                             "INSERT INTO timetable_entry (timetable_id, batch_module_id, hall_id, slot_id, session_type, is_recurring) " +
                                             "VALUES (?, ?, ?, ?, ?, ?)",
                                             ot.getTimetableId(), bm.getBatchModuleId(), te.getHall().getHallId(), te.getTimeSlot().getSlotId(), te.getSessionType(), te.getIsRecurring()
                                         );
                                     } catch (Exception e) {
                                         System.out.println("Sync warning: Could not copy IS entry to timetable " + ot.getTimetableId() + ": " + e.getMessage());
                                         e.printStackTrace();
                                     }
                                }
                            }
                            
                            final Integer ownerBmId = bm.getBatchModuleId();
                            List<BatchModule> allBm = batchModuleRepository.findByBatch_BatchId(batchId);
                            List<BatchModule> linkedModules = allBm.stream()
                                .filter(item -> ownerBmId.equals(item.getLinkedBatchModuleId()))
                                .toList();
                            
                            if (!linkedModules.isEmpty()) {
                                List<com.foe.timetable.model.Timetable> otherTimetables = timetableRepository.findByBatchIdOrderByGeneratedAtDesc(batchId).stream()
                                    .filter(tt -> !tt.getTimetableId().equals(timetable.getTimetableId()))
                                    .collect(Collectors.groupingBy(tt -> tt.getDepartmentId() == null ? -1 : tt.getDepartmentId()))
                                    .values().stream()
                                    .map(list -> list.stream().max(java.util.Comparator.comparing(com.foe.timetable.model.Timetable::getTimetableId)).get())
                                    .toList();
                                    
                                for (BatchModule lm : linkedModules) {
                                    for (com.foe.timetable.model.Timetable ot : otherTimetables) {
                                        if (ot.getDepartmentId() != null && !lm.isOfferedByDepartment(ot.getDepartmentId())) {
                                            continue;
                                        }
                                        try {
                                            jdbcTemplate.update(
                                                "DELETE te FROM timetable_entry te " +
                                                "JOIN batch_module bm2 ON te.batch_module_id = bm2.batch_module_id " +
                                                "JOIN module m2 ON bm2.module_id = m2.module_id " +
                                                "WHERE te.timetable_id = ? AND m2.module_code = ?",
                                                ot.getTimetableId(), lm.getModule().getModuleCode()
                                            );
                                        } catch (Exception e) {
                                            System.out.println("Sync warning: Could not delete old entries: " + e.getMessage());
                                        }
                                        try {
                                            jdbcTemplate.update(
                                                "INSERT INTO timetable_entry (timetable_id, batch_module_id, hall_id, slot_id, session_type, is_recurring) " +
                                                "VALUES (?, ?, ?, ?, ?, ?)",
                                                ot.getTimetableId(), lm.getBatchModuleId(), te.getHall().getHallId(), te.getTimeSlot().getSlotId(), te.getSessionType(), te.getIsRecurring()
                                            );
                                        } catch (Exception e) {
                                            System.out.println("Sync warning: Could not copy linked entry to timetable " + ot.getTimetableId() + ": " + e.getMessage());
                                            e.printStackTrace();
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    throw new IllegalStateException("Optimization failed: " + result.getMessage());
                }
            } else {
                throw new IllegalStateException("Optimization service returned error: " + response.getStatusCode());
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to communicate with the Optimization Service (FastAPI). Make sure it is running on port 8000. Error: " + e.getMessage(), e);
        }

        timetable.setStatus("draft");
        timetable.setGeneratedAt(LocalDateTime.now());
        timetable.setDepartmentId(batch.getSemester() >= 3 ? departmentId : null);
        timetableRepository.save(timetable);

        List<TimetableEntry> savedEntries = timetableEntryRepository.findByTimetableId(timetable.getTimetableId());
        return timetableMapperService.toViewDtos(savedEntries, batch);
    }

    private Timetable createTimetable(Batch batch, Integer departmentId) {
        Timetable timetable = new Timetable();
        timetable.setBatchId(batch.getBatchId());
        timetable.setTimetableName(batch.getBatchName() + " Timetable");
        timetable.setAcademicYear(batch.getAcademicYear());
        timetable.setSemester(batch.getSemester());
        timetable.setStatus("draft");
        timetable.setGeneratedAt(LocalDateTime.now());
        timetable.setDepartmentId(departmentId);
        return timetableRepository.save(timetable);
    }

    private void autoPopulateBatchModules(Batch batch) {
        // 1. Find all modules for the batch's semester
        List<Module> semesterModules = moduleRepository.findBySemester(batch.getSemester());
        if (semesterModules.isEmpty()) {
            return;
        }

        // 2. Fetch all lecturers in the system
        List<Lecturer> allLecturers = lecturerRepository.findAll();
        if (allLecturers.isEmpty()) {
            throw new IllegalStateException("No lecturers found in the database to assign to batch modules.");
        }

        // Map department_id -> list of lecturers in that department
        Map<Integer, List<Lecturer>> lecturersByDept = allLecturers.stream()
            .collect(Collectors.groupingBy(l -> l.getDepartment().getDepartmentId()));

        // 3. For each module, create a BatchModule association
        for (Module module : semesterModules) {
            BatchModule bm = new BatchModule();
            bm.setBatch(batch);
            bm.setModule(module);
            bm.setSemester(batch.getSemester());
            bm.setAcademicYear(batch.getAcademicYear());
            
            // Assign a lecturer from the module's department
            List<Lecturer> deptLecturers = lecturersByDept.get(module.getDepartment().getDepartmentId());
            Lecturer assignedLecturer = null;
            if (deptLecturers != null && !deptLecturers.isEmpty()) {
                assignedLecturer = deptLecturers.get(0);
            } else {
                assignedLecturer = allLecturers.get(0);
            }
            
            bm.setLecturerId(assignedLecturer.getLecturerId());
            batchModuleRepository.save(bm);
        }
    }

    private java.time.LocalTime parseTime(String timeStr) {
        if (timeStr == null) return null;
        timeStr = timeStr.trim().replace('.', ':');
        if (timeStr.indexOf(':') == 1) {
            timeStr = "0" + timeStr;
        }
        if (timeStr.length() == 5) {
            return java.time.LocalTime.parse(timeStr);
        } else if (timeStr.length() == 8) {
            return java.time.LocalTime.parse(timeStr);
        } else {
            try {
                String[] parts = timeStr.split(":");
                int h = Integer.parseInt(parts[0]);
                int m = Integer.parseInt(parts[1]);
                int s = parts.length > 2 ? Integer.parseInt(parts[2]) : 0;
                return java.time.LocalTime.of(h, m, s);
            } catch (Exception e) {
                return null;
            }
        }
    }

    public static String normalizeModuleName(String name) {
        if (name == null) return "";
        String s = name.toLowerCase().trim();
        s = s.replaceAll("(?i)\\(te\\)", "").replaceAll("(?i)\\[te\\]", "").trim();
        s = s.replaceAll("[^a-z0-9]", "");
        if (s.endsWith("s")) {
            s = s.substring(0, s.length() - 1);
        }
        return s;
    }

    @Transactional
    public void autoLinkSharedModules(Integer batchId) {
        if (batchId == null) return;
        List<BatchModule> allBms = batchModuleRepository.findByBatch_BatchId(batchId);
        if (allBms.size() <= 1) return;

        Map<String, List<BatchModule>> grouped = new HashMap<>();
        for (BatchModule bm : allBms) {
            if (bm.getModule() == null || bm.getModule().getModuleName() == null) continue;
            String norm = normalizeModuleName(bm.getModule().getModuleName());
            if (norm.isEmpty()) continue;
            grouped.computeIfAbsent(norm, k -> new ArrayList<>()).add(bm);
        }

        for (Map.Entry<String, List<BatchModule>> entry : grouped.entrySet()) {
            List<BatchModule> list = entry.getValue();
            if (list.size() > 1) {
                BatchModule primary = list.get(0);
                for (BatchModule bm : list) {
                    bm.setIsShared(true);
                    if (bm.getBatchModuleId().equals(primary.getBatchModuleId())) {
                        bm.setLinkedBatchModuleId(null);
                    } else {
                        bm.setLinkedBatchModuleId(primary.getBatchModuleId());
                    }
                    batchModuleRepository.save(bm);
                }
            }
        }
    }
}
