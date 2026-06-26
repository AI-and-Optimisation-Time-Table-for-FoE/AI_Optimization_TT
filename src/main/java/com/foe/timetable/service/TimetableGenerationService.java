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
                .filter(bm -> bm.getModule() != null &&
                              bm.getModule().getDepartment() != null &&
                              bm.getModule().getDepartment().getDepartmentId().equals(deptId))
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

        // Get or create Timetable
        Timetable timetable = timetableRepository.findFirstByBatchIdOrderByGeneratedAtDesc(batchId)
            .orElseGet(() -> createTimetable(batch));

        // Clear existing entries for this batch schedule and department
        if (batch.getSemester() >= 3 && departmentId != null) {
            timetableEntryRepository.deleteByTimetableIdAndDepartmentId(timetable.getTimetableId(), departmentId);
        } else {
            timetableEntryRepository.deleteByTimetableId(timetable.getTimetableId());
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

        // Map Modules
        List<OptimizationRequest.ModuleInput> moduleInputs = batchModules.stream().map(bm -> {
            OptimizationRequest.ModuleInput mInput = new OptimizationRequest.ModuleInput();
            mInput.setBatchModuleId(bm.getBatchModuleId());
            mInput.setModuleCode(bm.getModule().getModuleCode());
            mInput.setModuleName(bm.getModule().getModuleName());
            
            int hours = bm.getModule().getLectureHoursPerWeek() != null && bm.getModule().getLectureHoursPerWeek() > 0
                ? bm.getModule().getLectureHoursPerWeek()
                : 1;
            mInput.setSessionsNeeded(hours);
            mInput.setLecturerId(bm.getLecturerId());
            mInput.setPreferredHallId(bm.getPreferredHall() != null ? bm.getPreferredHall().getHallId() : null);
            return mInput;
        }).collect(Collectors.toList());
        optRequest.setModules(moduleInputs);

        // Map Halls
        List<OptimizationRequest.HallInput> hallInputs = halls.stream().map(h -> {
            OptimizationRequest.HallInput hInput = new OptimizationRequest.HallInput();
            hInput.setHallId(h.getHallId());
            hInput.setHallName(h.getHallName());
            hInput.setCapacity(h.getCapacity() != null ? h.getCapacity() : 60);
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
            if (bm.getLecturerId() == null) continue;
            String lecIdStr = String.valueOf(bm.getLecturerId());
            if (!lecturerUnavailability.containsKey(lecIdStr)) {
                // Fetch predefined unavailability
                List<Integer> unavail = jdbcTemplate.queryForList(
                    "SELECT slot_id FROM lecturer_unavailability WHERE lecturer_id = ?",
                    Integer.class, bm.getLecturerId()
                );
                // Fetch other batch/department bookings
                List<Integer> otherBookings;
                if (batch.getSemester() >= 3 && departmentId != null) {
                    otherBookings = jdbcTemplate.queryForList(
                        "SELECT te.slot_id FROM timetable_entry te " +
                        "JOIN batch_module bm2 ON te.batch_module_id = bm2.batch_module_id " +
                        "JOIN module m2 ON bm2.module_id = m2.module_id " +
                        "WHERE bm2.lecturer_id = ? AND NOT (te.timetable_id = ? AND m2.department_id = ?)",
                        Integer.class, bm.getLecturerId(), timetable.getTimetableId(), departmentId
                    );
                } else {
                    otherBookings = jdbcTemplate.queryForList(
                        "SELECT te.slot_id FROM timetable_entry te " +
                        "JOIN batch_module bm2 ON te.batch_module_id = bm2.batch_module_id " +
                        "WHERE bm2.lecturer_id = ? AND te.timetable_id != ?",
                        Integer.class, bm.getLecturerId(), timetable.getTimetableId()
                    );
                }
                List<Integer> combined = new ArrayList<>(unavail);
                combined.addAll(otherBookings);
                lecturerUnavailability.put(lecIdStr, combined);
            }
            if (!lecturerPreferences.containsKey(lecIdStr)) {
                List<Integer> prefs = jdbcTemplate.queryForList(
                    "SELECT slot_id FROM lecturer_preference WHERE lecturer_id = ? AND preference_level = 'preferred'",
                    Integer.class, bm.getLecturerId()
                );
                lecturerPreferences.put(lecIdStr, prefs);
            }
        }
        optRequest.setLecturerUnavailability(lecturerUnavailability);
        optRequest.setLecturerPreferences(lecturerPreferences);

        // Fetch hall unavailabilities (predefined + other batch bookings)
        Map<String, List<Integer>> hallUnavailability = new HashMap<>();
        for (Hall h : halls) {
            String hIdStr = String.valueOf(h.getHallId());
            List<Integer> unavail = jdbcTemplate.queryForList(
                "SELECT slot_id FROM hall_unavailability WHERE hall_id = ?",
                Integer.class, h.getHallId()
            );
            List<Integer> otherBookings;
            if (batch.getSemester() >= 3 && departmentId != null) {
                otherBookings = jdbcTemplate.queryForList(
                    "SELECT te.slot_id FROM timetable_entry te " +
                    "JOIN batch_module bm2 ON te.batch_module_id = bm2.batch_module_id " +
                    "JOIN module m2 ON bm2.module_id = m2.module_id " +
                    "WHERE te.hall_id = ? AND NOT (te.timetable_id = ? AND m2.department_id = ?)",
                    Integer.class, h.getHallId(), timetable.getTimetableId(), departmentId
                );
            } else {
                otherBookings = jdbcTemplate.queryForList(
                    "SELECT te.slot_id FROM timetable_entry te WHERE te.hall_id = ? AND te.timetable_id != ?",
                    Integer.class, h.getHallId(), timetable.getTimetableId()
                );
            }
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
                    if (lab.getDepartment() != null && bm.getModule().getDepartment() != null &&
                        lab.getDepartment().getDepartmentId().equals(bm.getModule().getDepartment().getDepartmentId())) {
                        applies = true;
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
        String url = "http://localhost:8000/optimize";
        
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
        timetableRepository.save(timetable);

        List<TimetableEntry> savedEntries = timetableEntryRepository.findByBatchId(batchId);
        return timetableMapperService.toViewDtos(savedEntries, batch);
    }

    private Timetable createTimetable(Batch batch) {
        Timetable timetable = new Timetable();
        timetable.setBatchId(batch.getBatchId());
        timetable.setTimetableName(batch.getBatchName() + " Timetable");
        timetable.setAcademicYear(batch.getAcademicYear());
        timetable.setSemester(batch.getSemester());
        timetable.setStatus("draft");
        timetable.setGeneratedAt(LocalDateTime.now());
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
}
