package com.foe.timetable.Controller;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.foe.timetable.model.*;
import com.foe.timetable.model.Module;
import com.foe.timetable.repository.*;

@RestController
@RequestMapping("/api/exam-timetables")
@CrossOrigin(origins = "*")
public class ExamTimetableController {

    @Autowired
    private ExamTimetableRepository examTimetableRepository;

    @Autowired
    private ExamEntryRepository examEntryRepository;

    @Autowired
    private ExamHallUnavailabilityRepository examHallUnavailabilityRepository;

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private HallRepository hallRepository;

    @Autowired
    private BatchModuleRepository batchModuleRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    // Get all exam timetables for a batch
    @GetMapping
    public ResponseEntity<?> getExamTimetables(@RequestParam(required = false) Integer batchId) {
        if (batchId != null) {
            return ResponseEntity.ok(examTimetableRepository.findByBatch_BatchIdOrderByCreatedAtDesc(batchId));
        }
        return ResponseEntity.ok(examTimetableRepository.findAll());
    }

    // Get specific exam timetable details with entries
    @GetMapping("/{id}")
    public ResponseEntity<?> getExamTimetableDetails(@PathVariable Integer id) {
        Optional<ExamTimetable> etOpt = examTimetableRepository.findById(id);
        if (etOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Exam timetable not found"));
        }

        ExamTimetable et = etOpt.get();
        List<ExamEntry> entries = examEntryRepository.findByExamTimetable_ExamTimetableIdOrderByExamDateAscStartTimeAsc(id);

        Map<String, Object> result = new HashMap<>();
        result.put("examTimetable", et);
        result.put("entries", entries);

        return ResponseEntity.ok(result);
    }

    // Create & Auto-Optimize an exam timetable for a batch
    @PostMapping
    @Transactional
    public ResponseEntity<?> createExamTimetable(@RequestBody Map<String, Object> payload) {
        Number batchIdNum = (Number) payload.get("batchId");
        String startDateStr = (String) payload.get("startDate");
        Number durationWeeksNum = (Number) payload.get("durationWeeks");

        if (batchIdNum == null || startDateStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "batchId and startDate are required"));
        }

        Batch batch = batchRepository.findById(batchIdNum.intValue()).orElse(null);
        if (batch == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Batch not found"));
        }

        ExamTimetable et = new ExamTimetable();
        et.setBatch(batch);
        et.setStartDate(LocalDate.parse(startDateStr));
        et.setDurationWeeks(durationWeeksNum != null ? durationWeeksNum.intValue() : 2);
        et.setStatus("draft");

        ExamTimetable saved = examTimetableRepository.save(et);

        runOptimizationForTimetable(saved);

        return ResponseEntity.ok(saved);
    }

    // Trigger re-optimization for an existing exam timetable
    @PostMapping("/{id}/reoptimize")
    @Transactional
    public ResponseEntity<?> reoptimizeExamTimetable(@PathVariable Integer id) {
        Optional<ExamTimetable> etOpt = examTimetableRepository.findById(id);
        if (etOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Exam timetable not found"));
        }

        ExamTimetable et = etOpt.get();
        examEntryRepository.deleteByExamTimetable_ExamTimetableId(id);
        runOptimizationForTimetable(et);

        return ResponseEntity.ok(Map.of("message", "Exam timetable optimized successfully!"));
    }

    private void runOptimizationForTimetable(ExamTimetable et) {
        Batch batch = et.getBatch();
        List<BatchModule> batchModules = batchModuleRepository.findByBatch_BatchId(batch.getBatchId());
        
        Set<Integer> moduleIds = new HashSet<>();
        List<Module> modules = new ArrayList<>();
        for (BatchModule bm : batchModules) {
            if (bm.getModule() != null && !moduleIds.contains(bm.getModule().getModuleId())) {
                moduleIds.add(bm.getModule().getModuleId());
                modules.add(bm.getModule());
            }
        }

        List<Hall> halls = hallRepository.findAll();
        List<ExamHallUnavailability> unavailabilities = examHallUnavailabilityRepository.findAll();

        int batchStudentCount = (batch.getStudentCount() != null && batch.getStudentCount() > 0) ? batch.getStudentCount() : 100;

        List<ExamEntry> optimizedEntries = generateOptimizedSchedule(et, modules, halls, unavailabilities, batchStudentCount);
        for (ExamEntry entry : optimizedEntries) {
            examEntryRepository.save(entry);
        }
    }

    private List<ExamEntry> generateOptimizedSchedule(ExamTimetable et, List<Module> modules, List<Hall> halls, List<ExamHallUnavailability> unavailabilities, int batchStudentCount) {
        LocalDate startDate = et.getStartDate();
        int totalDays = (et.getDurationWeeks() != null ? et.getDurationWeeks() : 2) * 7;
        List<LocalDate> availableDates = new ArrayList<>();
        for (int i = 0; i < totalDays; i++) {
            LocalDate d = startDate.plusDays(i);
            if (d.getDayOfWeek() != DayOfWeek.SUNDAY) {
                availableDates.add(d);
            }
        }
        if (availableDates.isEmpty()) {
            availableDates.add(startDate);
        }

        String[] sessions = new String[]{"Morning Session", "Afternoon Session"};

        // Fetch registered student accounts for this batch to extract ID numbers and auto-identify total student limit
        List<UserAccount> registeredStudents = userAccountRepository.findByBatchIdAndRole(et.getBatch().getBatchId(), UserAccount.Role.student);
        registeredStudents.sort((a, b) -> {
            String idA = a.getStudentIdNumber() != null ? a.getStudentIdNumber() : a.getUsername();
            String idB = b.getStudentIdNumber() != null ? b.getStudentIdNumber() : b.getUsername();
            return idA.compareToIgnoreCase(idB);
        });

        // Determine effective total student limit directly from registered student count
        int totalStudentsToDivide = (!registeredStudents.isEmpty()) ? registeredStudents.size() : batchStudentCount;

        // Filter main faculty exam halls (excluding department-specific halls for general exams)
        List<Hall> availableHalls = halls.stream()
                .filter(h -> !isDepartmentSpecificHall(h))
                .sorted(Comparator.comparingInt((Hall h) -> h.getCapacity() != null ? h.getCapacity() : 0).reversed())
                .collect(Collectors.toList());
        if (availableHalls.isEmpty()) {
            availableHalls = new ArrayList<>(halls);
        }

        Set<String> unavailSet = new HashSet<>();
        for (ExamHallUnavailability u : unavailabilities) {
            if (u.getHall() != null && u.getUnavailableDate() != null) {
                unavailSet.add(u.getHall().getHallId() + "_" + u.getUnavailableDate().toString());
            }
        }

        List<ExamEntry> entries = new ArrayList<>();
        Set<LocalDate> usedDatesForBatch = new HashSet<>();
        Set<String> usedHallSlots = new HashSet<>();

        int numModules = modules.size();
        int numDates = availableDates.size();

        for (int mIdx = 0; mIdx < numModules; mIdx++) {
            Module mod = modules.get(mIdx);
            int idealDateIdx = (int) Math.round((double) mIdx * (numDates - 1) / Math.max(1, numModules - 1));

            LocalDate assignedDate = null;
            String assignedSession = null;

            // Pick a date for this exam module
            for (int offset = 0; offset < numDates; offset++) {
                int candidateIdx = (idealDateIdx + offset) % numDates;
                LocalDate candidateDate = availableDates.get(candidateIdx);

                if (!usedDatesForBatch.contains(candidateDate)) {
                    assignedDate = candidateDate;
                    assignedSession = sessions[mIdx % 2];
                    break;
                }
            }

            if (assignedDate == null) {
                assignedDate = availableDates.get(mIdx % numDates);
                assignedSession = sessions[mIdx % 2];
            }

            usedDatesForBatch.add(assignedDate);

            // Determine hall venue allocation and split students if needed per module/department
            List<UserAccount> targetStudents = registeredStudents;
            if (mod.getDepartment() != null && !"IS".equalsIgnoreCase(mod.getDepartment().getDepartmentCode())) {
                Integer modDeptId = mod.getDepartment().getDepartmentId();
                List<UserAccount> deptStudents = registeredStudents.stream()
                    .filter(s -> s.getDepartmentId() != null && s.getDepartmentId().equals(modDeptId))
                    .collect(Collectors.toList());
                if (!deptStudents.isEmpty()) {
                    targetStudents = deptStudents;
                }
            }

            int totalForThisModule = (!targetStudents.isEmpty()) ? targetStudents.size() : batchStudentCount;
            int remainingStudents = totalForThisModule;
            int currentStudentIndex = 0;

            for (Hall hall : availableHalls) {
                if (remainingStudents <= 0) break;

                String hallKey = hall.getHallId() + "_" + assignedDate.toString();
                String slotKey = hall.getHallId() + "_" + assignedDate.toString() + "_" + assignedSession;

                if (unavailSet.contains(hallKey) || usedHallSlots.contains(slotKey)) {
                    continue;
                }

                int rawCap = (hall.getCapacity() != null && hall.getCapacity() > 0) ? hall.getCapacity() : 100;
                // Exam spacing rule: max 100 students per exam venue to ensure 1-seat spacing
                int hallCap = Math.min(rawCap, 100);
                int allocatedForThisHall = Math.min(remainingStudents, hallCap);

                // Compute student ID number range for this venue allocation
                String idRange = generateStudentIdRange(targetStudents, currentStudentIndex, allocatedForThisHall, et.getBatch().getBatchId());

                ExamEntry entry = new ExamEntry();
                entry.setExamTimetable(et);
                entry.setModule(mod);
                entry.setExamDate(assignedDate);
                entry.setSessionName(assignedSession);
                if ("Morning Session".equals(assignedSession)) {
                    entry.setStartTime(LocalTime.of(9, 0));
                    entry.setEndTime(LocalTime.of(12, 0));
                } else {
                    entry.setStartTime(LocalTime.of(13, 30));
                    entry.setEndTime(LocalTime.of(16, 30));
                }
                entry.setHall(hall);
                entry.setStudentIdRange(idRange);
                entry.setAllocatedCount(allocatedForThisHall);

                entries.add(entry);
                usedHallSlots.add(slotKey);

                currentStudentIndex += allocatedForThisHall;
                remainingStudents -= allocatedForThisHall;
            }

            // Fallback if no halls were unallocated
            if (remainingStudents > 0 && availableHalls.size() > 0) {
                Hall fallbackHall = availableHalls.get(0);
                String idRange = generateStudentIdRange(targetStudents, 0, remainingStudents, et.getBatch().getBatchId());

                ExamEntry entry = new ExamEntry();
                entry.setExamTimetable(et);
                entry.setModule(mod);
                entry.setExamDate(assignedDate);
                entry.setSessionName(assignedSession);
                entry.setStartTime(LocalTime.of(9, 0));
                entry.setEndTime(LocalTime.of(12, 0));
                entry.setHall(fallbackHall);
                entry.setStudentIdRange(idRange);
                entry.setAllocatedCount(remainingStudents);

                entries.add(entry);
            }
        }

        return entries;
    }

    private String generateStudentIdRange(List<UserAccount> students, int startIndex, int count, Integer batchId) {
        if (students != null && !students.isEmpty() && startIndex < students.size()) {
            int endIndex = Math.min(startIndex + count - 1, students.size() - 1);
            String startId = students.get(startIndex).getStudentIdNumber();
            if (startId == null || startId.isBlank()) startId = students.get(startIndex).getUsername();

            String endId = students.get(endIndex).getStudentIdNumber();
            if (endId == null || endId.isBlank()) endId = students.get(endIndex).getUsername();

            return startId + " - " + endId;
        }

        // Clean default formatted student ID numbers based on batch
        int startNum = 4001 + startIndex;
        int endNum = 4000 + startIndex + count;
        return "EG/2021/" + startNum + " - EG/2021/" + endNum;
    }

    // Save or update exam entries
    @PostMapping("/{id}/entries")
    @Transactional
    public ResponseEntity<?> saveExamEntries(@PathVariable Integer id, @RequestBody List<Map<String, Object>> entriesPayload) {
        Optional<ExamTimetable> etOpt = examTimetableRepository.findById(id);
        if (etOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Exam timetable not found"));
        }

        ExamTimetable et = etOpt.get();

        for (Map<String, Object> item : entriesPayload) {
            Number entryIdNum = (Number) item.get("examEntryId");
            Number moduleIdNum = (Number) item.get("moduleId");
            String dateStr = (String) item.get("examDate");
            String startTimeStr = (String) item.get("startTime");
            String endTimeStr = (String) item.get("endTime");
            Number hallIdNum = (Number) item.get("hallId");
            String sessionName = (String) item.get("sessionName");
            String studentIdRange = (String) item.get("studentIdRange");
            Number allocatedCountNum = (Number) item.get("allocatedCount");

            ExamEntry entry = null;
            if (entryIdNum != null) {
                entry = examEntryRepository.findById(entryIdNum.intValue()).orElse(null);
            }

            if (entry == null) {
                entry = new ExamEntry();
                entry.setExamTimetable(et);
                if (moduleIdNum != null) {
                    Module mod = moduleRepository.findById(moduleIdNum.intValue()).orElse(null);
                    entry.setModule(mod);
                }
            }

            if (dateStr != null) entry.setExamDate(LocalDate.parse(dateStr));
            if (startTimeStr != null) entry.setStartTime(LocalTime.parse(startTimeStr));
            if (endTimeStr != null) entry.setEndTime(LocalTime.parse(endTimeStr));
            if (sessionName != null) entry.setSessionName(sessionName);
            if (studentIdRange != null) entry.setStudentIdRange(studentIdRange);
            if (allocatedCountNum != null) entry.setAllocatedCount(allocatedCountNum.intValue());

            if (hallIdNum != null) {
                Hall hall = hallRepository.findById(hallIdNum.intValue()).orElse(null);
                entry.setHall(hall);
            } else {
                entry.setHall(null);
            }

            examEntryRepository.save(entry);
        }

        return ResponseEntity.ok(Map.of("message", "Exam schedule updated successfully!"));
    }

    // Publish exam timetable to students
    @PostMapping("/{id}/publish")
    @Transactional
    public ResponseEntity<?> publishExamTimetable(@PathVariable Integer id) {
        Optional<ExamTimetable> etOpt = examTimetableRepository.findById(id);
        if (etOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Exam timetable not found"));
        }

        ExamTimetable et = etOpt.get();

        List<ExamTimetable> siblings = examTimetableRepository.findByBatch_BatchIdOrderByCreatedAtDesc(et.getBatch().getBatchId());
        for (ExamTimetable sibling : siblings) {
            if (sibling.getExamTimetableId().equals(id)) {
                sibling.setStatus("published");
                sibling.setPublishedAt(LocalDateTime.now());
            } else {
                sibling.setStatus("draft");
            }
            examTimetableRepository.save(sibling);
        }

        return ResponseEntity.ok(Map.of("message", "Exam timetable published for students successfully!", "status", "published"));
    }

    // Unpublish exam timetable
    @PostMapping("/{id}/unpublish")
    @Transactional
    public ResponseEntity<?> unpublishExamTimetable(@PathVariable Integer id) {
        Optional<ExamTimetable> etOpt = examTimetableRepository.findById(id);
        if (etOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Exam timetable not found"));
        }

        ExamTimetable et = etOpt.get();
        et.setStatus("draft");
        et.setPublishedAt(null);
        examTimetableRepository.save(et);

        return ResponseEntity.ok(Map.of("message", "Exam timetable unpublished. Reverted to draft mode.", "status", "draft"));
    }

    // Delete exam timetable
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteExamTimetable(@PathVariable Integer id) {
        Optional<ExamTimetable> etOpt = examTimetableRepository.findById(id);
        if (etOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Exam timetable not found"));
        }

        examEntryRepository.deleteByExamTimetable_ExamTimetableId(id);
        examTimetableRepository.deleteById(id);

        return ResponseEntity.ok(Map.of("message", "Exam timetable deleted successfully."));
    }

    // Hall unavailabilities endpoints
    @GetMapping("/hall-unavailabilities")
    public ResponseEntity<?> getHallUnavailabilities() {
        return ResponseEntity.ok(examHallUnavailabilityRepository.findAll());
    }

    @PostMapping("/hall-unavailabilities")
    public ResponseEntity<?> addHallUnavailability(@RequestBody Map<String, Object> payload) {
        Number hallIdNum = (Number) payload.get("hallId");
        String dateStr = (String) payload.get("unavailableDate");
        String startTimeStr = (String) payload.get("startTime");
        String endTimeStr = (String) payload.get("endTime");
        String reason = (String) payload.get("reason");

        if (hallIdNum == null || dateStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "hallId and unavailableDate are required"));
        }

        Hall hall = hallRepository.findById(hallIdNum.intValue()).orElse(null);
        if (hall == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Hall not found"));
        }

        ExamHallUnavailability unavail = new ExamHallUnavailability();
        unavail.setHall(hall);
        unavail.setUnavailableDate(LocalDate.parse(dateStr));
        if (startTimeStr != null) unavail.setStartTime(LocalTime.parse(startTimeStr));
        if (endTimeStr != null) unavail.setEndTime(LocalTime.parse(endTimeStr));
        unavail.setReason(reason);

        return ResponseEntity.ok(examHallUnavailabilityRepository.save(unavail));
    }

    @DeleteMapping("/hall-unavailabilities/{id}")
    public ResponseEntity<?> deleteHallUnavailability(@PathVariable Integer id) {
        examHallUnavailabilityRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Hall unavailability record deleted."));
    }

    // Student view endpoint for published exam timetable
    @GetMapping("/student")
    public ResponseEntity<?> getStudentPublishedExamTimetable(@RequestParam Integer batchId) {
        Optional<ExamTimetable> publishedOpt = examTimetableRepository.findFirstByBatch_BatchIdAndStatusOrderByCreatedAtDesc(batchId, "published");
        if (publishedOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("status", "none", "entries", Collections.emptyList(), "message", "No published exam timetable available for your batch yet."));
        }

        ExamTimetable et = publishedOpt.get();
        List<ExamEntry> entries = examEntryRepository.findByExamTimetable_ExamTimetableIdOrderByExamDateAscStartTimeAsc(et.getExamTimetableId());

        return ResponseEntity.ok(Map.of(
            "examTimetable", et,
            "status", "published",
            "entries", entries
        ));
    }

    private boolean isDepartmentSpecificHall(Hall hall) {
        if (hall == null || hall.getHallName() == null) return false;
        String name = hall.getHallName().toLowerCase();
        return name.contains("seminar room") || name.contains("cobeu") || 
               name.contains("electrical lecture room") || name.contains("mechanical lecture room") ||
               name.contains("civil lab") || name.contains("mech lab") || name.contains("eie lab") ||
               name.contains("audio visual");
    }
}
