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

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private StudentModuleEnrollmentRepository studentModuleEnrollmentRepository;

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

        // Ensure every entry has a valid, calculated student ID range if currently null/empty
        Map<String, Integer> runningModuleIndex = new HashMap<>();
        for (ExamEntry entry : entries) {
            if (entry.getStudentIdRange() == null || entry.getStudentIdRange().trim().isEmpty()) {
                String modKey = entry.getModule() != null ? String.valueOf(entry.getModule().getModuleId()) : "0";
                int currentIndex = runningModuleIndex.getOrDefault(modKey, 0);
                int count = (entry.getAllocatedCount() != null && entry.getAllocatedCount() > 0) ? entry.getAllocatedCount() : 100;
                String deptPrefix = (entry.getModule() != null && entry.getModule().getDepartment() != null && !"IS".equalsIgnoreCase(entry.getModule().getDepartment().getDepartmentCode()))
                        ? entry.getModule().getDepartment().getDepartmentCode() : null;
                String generatedRange = generateStudentIdRange(null, currentIndex, count, et.getBatch(), deptPrefix, count, false);
                entry.setStudentIdRange(generatedRange);
                runningModuleIndex.put(modKey, currentIndex + count);
                examEntryRepository.save(entry);
            }
        }

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

        // Fetch registered student accounts for this batch — used for real student ID ranges when available
        List<UserAccount> registeredStudents = userAccountRepository.findByBatchIdAndRole(et.getBatch().getBatchId(), UserAccount.Role.student);
        registeredStudents.sort((a, b) -> {
            String idA = a.getStudentIdNumber() != null ? a.getStudentIdNumber() : a.getUsername();
            String idB = b.getStudentIdNumber() != null ? b.getStudentIdNumber() : b.getUsername();
            return idA.compareToIgnoreCase(idB);
        });

        List<BatchModule> batchModules = batchModuleRepository.findByBatch_BatchId(et.getBatch().getBatchId());

        // ALWAYS use batch.studentCount as the guaranteed total for hall planning.
        // Registered students may be fewer than actual (project not yet published, not all signed up).
        // batchStudentCount is the authoritative headcount set by admin in the batch record.
        int effectiveTotalStudents = batchStudentCount;
        if (registeredStudents.size() > batchStudentCount) {
            effectiveTotalStudents = registeredStudents.size(); // if more registered than expected, scale up
        }

        // Build per-department registered counts to estimate department ratios
        Map<Integer, List<UserAccount>> registeredByDept = new HashMap<>();
        for (UserAccount s : registeredStudents) {
            if (s.getDepartmentId() != null) {
                registeredByDept.computeIfAbsent(s.getDepartmentId(), k -> new ArrayList<>()).add(s);
            }
        }
        int totalRegistered = registeredStudents.size();

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
            if (u.getHall() != null) {
                if (u.getUnavailableDate() == null) {
                    unavailSet.add(u.getHall().getHallId() + "_ALL");
                } else {
                    unavailSet.add(u.getHall().getHallId() + "_" + u.getUnavailableDate().toString());
                }
            }
        }

        List<ExamEntry> entries = new ArrayList<>();
        Set<Integer> latestOtherTimetableIds = new HashSet<>();
        for (Batch b : batchRepository.findAll()) {
            if (!b.getBatchId().equals(et.getBatch().getBatchId())) {
                List<ExamTimetable> otherTts = examTimetableRepository.findByBatch_BatchIdOrderByCreatedAtDesc(b.getBatchId());
                if (!otherTts.isEmpty()) {
                    latestOtherTimetableIds.add(otherTts.get(0).getExamTimetableId());
                }
            }
        }

        Set<LocalDate> usedDatesForBatch = new HashSet<>();
        Set<String> usedHallSlots = new HashSet<>();
        List<ExamEntry> allExistingEntries = examEntryRepository.findAll();
        for (ExamEntry existing : allExistingEntries) {
            if (existing.getExamTimetable() != null &&
                latestOtherTimetableIds.contains(existing.getExamTimetable().getExamTimetableId()) &&
                existing.getHall() != null &&
                existing.getExamDate() != null &&
                existing.getSessionName() != null) {
                String slotKey = existing.getHall().getHallId() + "_" + existing.getExamDate().toString() + "_" + existing.getSessionName();
                usedHallSlots.add(slotKey);
            }
        }

        int numModules = modules.size();
        int numDates = availableDates.size();

        for (int mIdx = 0; mIdx < numModules; mIdx++) {
            Module mod = modules.get(mIdx);
            int idealDateIdx = (int) Math.round((double) mIdx * (numDates - 1) / Math.max(1, numModules - 1));

            LocalDate assignedDate = null;
            String assignedSession = null;

            // Pick a date and session for this exam module where there is at least one candidate hall available
            for (int offset = 0; offset < numDates; offset++) {
                int candidateIdx = (idealDateIdx + offset) % numDates;
                LocalDate candidateDate = availableDates.get(candidateIdx);

                if (!usedDatesForBatch.contains(candidateDate)) {
                    boolean morningFree = hasAvailableHalls(halls, candidateDate, "Morning Session", usedHallSlots, unavailSet);
                    boolean afternoonFree = hasAvailableHalls(halls, candidateDate, "Afternoon Session", usedHallSlots, unavailSet);

                    if (morningFree || afternoonFree) {
                        assignedDate = candidateDate;
                        assignedSession = morningFree ? "Morning Session" : "Afternoon Session";
                        break;
                    }
                }
            }

            if (assignedDate == null) {
                for (int offset = 0; offset < numDates; offset++) {
                    int candidateIdx = (idealDateIdx + offset) % numDates;
                    LocalDate candidateDate = availableDates.get(candidateIdx);

                    boolean morningFree = hasAvailableHalls(halls, candidateDate, "Morning Session", usedHallSlots, unavailSet);
                    boolean afternoonFree = hasAvailableHalls(halls, candidateDate, "Afternoon Session", usedHallSlots, unavailSet);

                    if (morningFree || afternoonFree) {
                        assignedDate = candidateDate;
                        assignedSession = morningFree ? "Morning Session" : "Afternoon Session";
                        break;
                    }
                }
            }

            if (assignedDate == null) {
                assignedDate = availableDates.get(mIdx % numDates);
                assignedSession = sessions[mIdx % 2];
            }

            usedDatesForBatch.add(assignedDate);

            // Determine hall venue allocation using the FULL expected student count.
            // For IS (common) modules: use full batch count.
            // For department-specific modules: use registered dept students if available;
            //   otherwise estimate proportionally from batch total using registered dept ratios.
            List<UserAccount> targetStudents = registeredStudents;
            int totalForThisModule;

            boolean isFirstOrSecondSem = (et.getBatch().getSemester() != null && (et.getBatch().getSemester() == 1 || et.getBatch().getSemester() == 2))
                                      || (mod.getSemester() != null && (mod.getSemester() == 1 || mod.getSemester() == 2));
            boolean isDeptModule = !isFirstOrSecondSem && mod.getDepartment() != null && !"IS".equalsIgnoreCase(mod.getDepartment().getDepartmentCode());
            if (isDeptModule) {
                Integer modDeptId = mod.getDepartment().getDepartmentId();
                List<UserAccount> deptStudents = registeredByDept.getOrDefault(modDeptId, Collections.emptyList());

                Integer deptCountDb = mod.getDepartment().getStudentCount();
                if (deptCountDb != null && deptCountDb > 0) {
                    totalForThisModule = Math.max(deptCountDb, deptStudents.size());
                } else {
                    int defaultDeptSize = Math.max(20, effectiveTotalStudents / 5);
                    totalForThisModule = Math.max(defaultDeptSize, deptStudents.size());
                }
                String prefix = mod.getDepartment().getDepartmentCode();
                allocateHallsForGroup(et, mod, assignedDate, assignedSession, deptStudents, totalForThisModule, prefix, halls, usedHallSlots, unavailSet, entries);
            } else if (isFirstOrSecondSem) {
                allocateHallsForGroup(et, mod, assignedDate, assignedSession, registeredStudents, effectiveTotalStudents, null, halls, usedHallSlots, unavailSet, entries);
            } else {
                BatchModule bm = batchModules.stream()
                        .filter(b -> b.getModule() != null && b.getModule().getModuleId().equals(mod.getModuleId()))
                        .findFirst()
                        .orElse(null);

                Set<Integer> allowedDeptIds = new HashSet<>();
                Set<String> allowedDeptCodes = new HashSet<>();
                if (bm != null && bm.getOfferingDeptIds() != null && !bm.getOfferingDeptIds().isBlank()) {
                    for (String idStr : bm.getOfferingDeptIds().split(",")) {
                        String trimmed = idStr.trim();
                        try {
                            allowedDeptIds.add(Integer.parseInt(trimmed));
                        } catch (NumberFormatException ignored) {
                            allowedDeptCodes.add(trimmed.toUpperCase());
                        }
                    }
                }

                List<Department> studentDepts = departmentRepository.findAll().stream()
                        .filter(d -> !"IS".equalsIgnoreCase(d.getDepartmentCode()))
                        .filter(d -> (allowedDeptIds.isEmpty() && allowedDeptCodes.isEmpty())
                                || allowedDeptIds.contains(d.getDepartmentId())
                                || (d.getDepartmentCode() != null && allowedDeptCodes.contains(d.getDepartmentCode().toUpperCase())))
                        .sorted(Comparator.comparingInt(Department::getDepartmentId))
                        .collect(Collectors.toList());

                for (Department dept : studentDepts) {
                    List<UserAccount> deptStudents = registeredByDept.getOrDefault(dept.getDepartmentId(), Collections.emptyList());
                    Integer deptCountDb = dept.getStudentCount();
                    int totalForThisDept;
                    if (deptCountDb != null && deptCountDb > 0) {
                        totalForThisDept = Math.max(deptCountDb, deptStudents.size());
                    } else {
                        int defaultDeptSize = Math.max(20, effectiveTotalStudents / 5);
                        totalForThisDept = Math.max(defaultDeptSize, deptStudents.size());
                    }
                    String prefix = dept.getDepartmentCode();
                    allocateHallsForGroup(et, mod, assignedDate, assignedSession, deptStudents, totalForThisDept, prefix, halls, usedHallSlots, unavailSet, entries);
                }
            }
        }

        return entries;
    }

    private void allocateHallsForGroup(ExamTimetable et, Module mod, LocalDate assignedDate, String assignedSession,
                                       List<UserAccount> targetStudents, int totalStudents, String deptPrefix,
                                       List<Hall> halls, Set<String> usedHallSlots, Set<String> unavailSet,
                                       List<ExamEntry> entries) {
        int remainingStudents = totalStudents;
        int currentStudentIndex = 0;

        while (remainingStudents > 0) {
            final int currentRemaining = remainingStudents;
            final String targetDateStr = assignedDate.toString();
            final String targetSessStr = assignedSession;

            List<Hall> candidates = halls.stream()
                .filter(h -> !isDepartmentSpecificHall(h))
                .filter(h -> {
                    String hallKey = h.getHallId() + "_" + targetDateStr;
                    String allDatesKey = h.getHallId() + "_ALL";
                    String slotKey = h.getHallId() + "_" + targetDateStr + "_" + targetSessStr;
                    return !unavailSet.contains(hallKey) && !unavailSet.contains(allDatesKey) && !usedHallSlots.contains(slotKey);
                })
                .collect(Collectors.toList());

            if (totalStudents <= 350) {
                List<Hall> nonAudi = candidates.stream()
                    .filter(h -> !h.getHallName().equalsIgnoreCase("Auditorium"))
                    .collect(Collectors.toList());
                if (!nonAudi.isEmpty()) {
                    candidates = nonAudi;
                }
            }

            if (candidates.isEmpty()) break;

            java.util.function.Function<Hall, Integer> getExamCap = (h) -> {
                int cap = (h.getCapacity() != null && h.getCapacity() > 0) ? h.getCapacity() : 100;
                if (cap > 200) return Math.min(cap, 250);
                return Math.max(25, cap / 2);
            };

            List<Hall> fittingHalls = candidates.stream()
                .filter(h -> getExamCap.apply(h) >= currentRemaining)
                .sorted(Comparator.comparingInt(h -> (getExamCap.apply(h) - currentRemaining)))
                .collect(Collectors.toList());

            Hall selectedHall = null;
            if (!fittingHalls.isEmpty()) {
                selectedHall = fittingHalls.get(0);
            } else {
                candidates.sort(Comparator.comparingInt((Hall h) -> getExamCap.apply(h)).reversed());
                selectedHall = candidates.get(0);
            }

            int effectiveCap = getExamCap.apply(selectedHall);
            int allocatedForThisHall = Math.min(remainingStudents, effectiveCap);

            boolean isLastHall = (remainingStudents <= effectiveCap);
            String idRange = generateStudentIdRange(targetStudents, currentStudentIndex, allocatedForThisHall, et.getBatch(), deptPrefix, totalStudents, isLastHall);

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
            entry.setHall(selectedHall);
            entry.setStudentIdRange(idRange);
            entry.setAllocatedCount(allocatedForThisHall);

            entries.add(entry);
            String slotKey = selectedHall.getHallId() + "_" + targetDateStr + "_" + targetSessStr;
            usedHallSlots.add(slotKey);

            currentStudentIndex += allocatedForThisHall;
            remainingStudents -= allocatedForThisHall;
        }
    }

    private boolean hasAvailableHalls(List<Hall> halls, LocalDate targetDate, String targetSess, Set<String> usedHallSlots, Set<String> unavailSet) {
        String targetDateStr = targetDate.toString();
        return halls.stream()
            .filter(h -> !isDepartmentSpecificHall(h))
            .anyMatch(h -> {
                String hallKey = h.getHallId() + "_" + targetDateStr;
                String allDatesKey = h.getHallId() + "_ALL";
                String slotKey = h.getHallId() + "_" + targetDateStr + "_" + targetSess;
                return !unavailSet.contains(hallKey) && !unavailSet.contains(allDatesKey) && !usedHallSlots.contains(slotKey);
            });
    }

    private String generateStudentIdRange(List<UserAccount> students, int startIndex, int count, Batch batch, String deptPrefix, int totalDeptStudents, boolean isLastHall) {
        String prefixStr = (deptPrefix != null && !deptPrefix.isBlank() && !"ALL".equalsIgnoreCase(deptPrefix)) ? (deptPrefix + ": ") : "";

        // Official Faculty Batch Registration Configurations
        int batchNum = 27;
        if (batch != null && batch.getBatchName() != null) {
            String numOnly = batch.getBatchName().replaceAll("\\D+", "");
            if (!numOnly.isEmpty()) {
                try {
                    batchNum = Integer.parseInt(numOnly);
                } catch (Exception ignored) {}
            }
        }

        int regYear;
        int startBase;
        int endBase;

        switch (batchNum) {
            case 23:
                regYear = 2021;
                startBase = 4376;
                endBase = 4894;
                break;
            case 24:
                regYear = 2022;
                startBase = 4904;
                endBase = 5453;
                break;
            case 25:
                regYear = 2023;
                startBase = 5456;
                endBase = 5998;
                break;
            case 27:
            default:
                regYear = 2025;
                startBase = 6560;
                endBase = 7112;
                break;
        }

        int startNum = startBase + startIndex;
        int endNum = Math.min(startBase + startIndex + count - 1, endBase);
        if (startNum > endBase) {
            startNum = endBase;
        }

        String rangeStr = prefixStr + "EG/" + regYear + "/" + String.format("%04d", startNum) + " - EG/" + regYear + "/" + String.format("%04d", endNum);
        if (isLastHall) {
            rangeStr += " + Repeaters";
        }
        return rangeStr;
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

            // Check for clashes with unavailabilities or other active exam entries
            if (entry.getHall() != null && entry.getExamDate() != null && entry.getSessionName() != null) {
                List<ExamHallUnavailability> unavailabilities = examHallUnavailabilityRepository.findAll();
                for (ExamHallUnavailability u : unavailabilities) {
                    if (u.getHall() != null && u.getHall().getHallId().equals(entry.getHall().getHallId())) {
                        if (u.getUnavailableDate() == null || u.getUnavailableDate().equals(entry.getExamDate())) {
                            return ResponseEntity.badRequest().body(Map.of("message", "Clash detected: " + entry.getHall().getHallName() + " is recorded as Unavailable on " + (u.getUnavailableDate() == null ? "All Dates" : entry.getExamDate()) + "!"));
                        }
                    }
                }

                Set<Integer> activeTimetableIds = new HashSet<>();
                activeTimetableIds.add(et.getExamTimetableId());
                for (Batch b : batchRepository.findAll()) {
                    if (!b.getBatchId().equals(et.getBatch().getBatchId())) {
                        List<ExamTimetable> otherTts = examTimetableRepository.findByBatch_BatchIdOrderByCreatedAtDesc(b.getBatchId());
                        if (!otherTts.isEmpty()) {
                            activeTimetableIds.add(otherTts.get(0).getExamTimetableId());
                        }
                    }
                }

                List<ExamEntry> allExisting = examEntryRepository.findAll();
                for (ExamEntry existing : allExisting) {
                    if (existing.getExamTimetable() != null && activeTimetableIds.contains(existing.getExamTimetable().getExamTimetableId()) &&
                        (entry.getExamEntryId() == null || !existing.getExamEntryId().equals(entry.getExamEntryId())) &&
                        existing.getHall() != null &&
                        existing.getHall().getHallId().equals(entry.getHall().getHallId()) &&
                        existing.getExamDate() != null &&
                        existing.getExamDate().equals(entry.getExamDate()) &&
                        existing.getSessionName() != null &&
                        existing.getSessionName().equalsIgnoreCase(entry.getSessionName())) {
                        String modCode = existing.getModule() != null ? existing.getModule().getModuleCode() : "Another Exam";
                        return ResponseEntity.badRequest().body(Map.of("message", "Clash detected: " + entry.getHall().getHallName() + " is already booked by " + modCode + " on " + entry.getExamDate() + " (" + entry.getSessionName() + ")!"));
                    }
                }
            }

            examEntryRepository.save(entry);
        }

        return ResponseEntity.ok(Map.of("message", "Exam schedule updated successfully!"));
    }

    // Delete a single exam entry (venue row)
    @DeleteMapping("/{id}/entries/{entryId}")
    @Transactional
    public ResponseEntity<?> deleteExamEntry(@PathVariable Integer id, @PathVariable Integer entryId) {
        Optional<ExamEntry> entryOpt = examEntryRepository.findById(entryId);
        if (entryOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Exam entry not found"));
        }
        ExamEntry entry = entryOpt.get();
        if (!entry.getExamTimetable().getExamTimetableId().equals(id)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Entry does not belong to this timetable"));
        }
        examEntryRepository.deleteById(entryId);
        return ResponseEntity.ok(Map.of("message", "Exam entry deleted successfully."));
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

        if (hallIdNum == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "hallId is required"));
        }

        Hall hall = hallRepository.findById(hallIdNum.intValue()).orElse(null);
        if (hall == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Hall not found"));
        }

        ExamHallUnavailability unavail = new ExamHallUnavailability();
        unavail.setHall(hall);
        if (dateStr != null && !dateStr.trim().isEmpty()) {
            unavail.setUnavailableDate(LocalDate.parse(dateStr.trim()));
        } else {
            unavail.setUnavailableDate(null);
        }
        if (startTimeStr != null && !startTimeStr.trim().isEmpty()) unavail.setStartTime(LocalTime.parse(startTimeStr.trim()));
        if (endTimeStr != null && !endTimeStr.trim().isEmpty()) unavail.setEndTime(LocalTime.parse(endTimeStr.trim()));
        unavail.setReason(reason);

        return ResponseEntity.ok(examHallUnavailabilityRepository.save(unavail));
    }

    @DeleteMapping("/hall-unavailabilities/{id}")
    public ResponseEntity<?> deleteHallUnavailability(@PathVariable Integer id) {
        examHallUnavailabilityRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Hall unavailability record deleted."));
    }

    // Student view endpoint for published exam timetable (with personalized MIS enrollment filtering & repeat exams)
    @GetMapping("/student")
    public ResponseEntity<?> getStudentPublishedExamTimetable(
            @RequestParam Integer batchId,
            @RequestParam(required = false) String identifier) {
        
        Optional<ExamTimetable> publishedOpt = examTimetableRepository.findFirstByBatch_BatchIdAndStatusOrderByCreatedAtDesc(batchId, "published");
        if (publishedOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("status", "none", "entries", Collections.emptyList(), "message", "No published exam timetable available for your batch yet."));
        }

        ExamTimetable et = publishedOpt.get();
        List<ExamEntry> allEntries = examEntryRepository.findByExamTimetable_ExamTimetableIdOrderByExamDateAscStartTimeAsc(et.getExamTimetableId());

        // Resolve student account if identifier provided
        String studentRegNo = null;
        Integer studentDeptId = null;
        if (identifier != null && !identifier.trim().isEmpty()) {
            String search = identifier.trim().toLowerCase();
            Optional<UserAccount> uOpt = userAccountRepository.findAll().stream()
                .filter(u -> (u.getUsername() != null && u.getUsername().equalsIgnoreCase(search)) ||
                             (u.getUniversityEmail() != null && u.getUniversityEmail().equalsIgnoreCase(search)) ||
                             (u.getStudentIdNumber() != null && u.getStudentIdNumber().equalsIgnoreCase(search)))
                .findFirst();
            if (uOpt.isPresent()) {
                studentRegNo = uOpt.get().getStudentIdNumber();
                studentDeptId = uOpt.get().getDepartmentId();
            } else if (identifier.toUpperCase().contains("EG/")) {
                studentRegNo = identifier.trim().toUpperCase();
            }
        }

        List<ExamEntry> candidateEntries = new ArrayList<>();

        // If student identifier (Reg No or Email) is provided and student has specific MIS enrollments
        if (identifier != null && !identifier.trim().isEmpty()) {
            List<StudentModuleEnrollment> enrollments = studentModuleEnrollmentRepository.findByIdentifier(identifier.trim());
            if (!enrollments.isEmpty()) {
                Set<Integer> enrolledModuleIds = enrollments.stream()
                        .map(e -> e.getModule().getModuleId())
                        .collect(Collectors.toSet());

                List<StudentModuleEnrollment> repeatEnrollments = enrollments.stream()
                        .filter(e -> e.getEnrollmentType() == StudentModuleEnrollment.EnrollmentType.repeat || e.getEnrollmentType() == StudentModuleEnrollment.EnrollmentType.resit)
                        .toList();

                Set<Integer> repeatModuleIds = repeatEnrollments.stream()
                        .map(e -> e.getModule().getModuleId())
                        .collect(Collectors.toSet());

                // Filter batch entries to only enrolled modules (TEs, IS, Core)
                for (ExamEntry e : allEntries) {
                    if (e.getModule() != null && enrolledModuleIds.contains(e.getModule().getModuleId())) {
                        if (repeatModuleIds.contains(e.getModule().getModuleId())) {
                            e.setIsRepeatExam(true);
                        }
                        candidateEntries.add(e);
                    }
                }

                // Also check if student has repeat modules in OTHER batches and include their published exam entries!
                for (StudentModuleEnrollment rep : repeatEnrollments) {
                    if (rep.getBatch() != null && !rep.getBatch().getBatchId().equals(batchId)) {
                        Optional<ExamTimetable> otherBatchPublished = examTimetableRepository.findFirstByBatch_BatchIdAndStatusOrderByCreatedAtDesc(rep.getBatch().getBatchId(), "published");
                        if (otherBatchPublished.isPresent()) {
                            List<ExamEntry> otherEntries = examEntryRepository.findByExamTimetable_ExamTimetableIdOrderByExamDateAscStartTimeAsc(otherBatchPublished.get().getExamTimetableId());
                            for (ExamEntry repEntry : otherEntries) {
                                if (repEntry.getModule() != null && repEntry.getModule().getModuleId().equals(rep.getModule().getModuleId())) {
                                    repEntry.setIsRepeatExam(true);
                                    if (!candidateEntries.contains(repEntry)) {
                                        candidateEntries.add(repEntry);
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                candidateEntries.addAll(allEntries);
            }
        } else {
            candidateEntries.addAll(allEntries);
        }

        // Deduplicate multi-hall allocations to student's exact matching hall!
        List<ExamEntry> personalizedEntries = new ArrayList<>();
        Map<String, List<ExamEntry>> groupedByModuleAndSlot = candidateEntries.stream()
            .collect(Collectors.groupingBy(e -> (e.getExamDate() != null ? e.getExamDate().toString() : "") + "_" + 
                                                (e.getStartTime() != null ? e.getStartTime().toString() : "") + "_" + 
                                                (e.getModule() != null ? e.getModule().getModuleId() : 0)));

        for (List<ExamEntry> group : groupedByModuleAndSlot.values()) {
            if (group.size() == 1 || studentRegNo == null) {
                personalizedEntries.addAll(group);
            } else {
                // Find matching hall for student's registration number
                final String sReg = studentRegNo;
                ExamEntry matchedEntry = group.stream()
                    .filter(entry -> matchesStudentRange(entry, sReg, false))
                    .findFirst()
                    .orElse(group.get(0)); // Fallback to first if not explicitly partitioned
                personalizedEntries.add(matchedEntry);
            }
        }

        // Sort combined personalized schedule by date & time
        personalizedEntries.sort(Comparator.comparing(ExamEntry::getExamDate, Comparator.nullsLast(Comparator.naturalOrder()))
                                           .thenComparing(ExamEntry::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())));

        return ResponseEntity.ok(Map.of(
            "examTimetable", et,
            "status", "published",
            "isPersonalized", (studentRegNo != null),
            "studentRegNo", studentRegNo != null ? studentRegNo : "",
            "entries", personalizedEntries
        ));
    }

    private boolean matchesStudentRange(ExamEntry entry, String studentId, boolean isRepeater) {
        String rangeStr = entry.getStudentIdRange();
        if (rangeStr == null || rangeStr.trim().isEmpty()) {
            return true;
        }
        if (studentId == null || studentId.trim().isEmpty()) {
            return true;
        }

        String cleanStudentId = studentId.trim().toUpperCase();

        if (rangeStr.toUpperCase().contains(cleanStudentId)) {
            return true;
        }

        if (isRepeater && (rangeStr.toLowerCase().contains("repeater") || rangeStr.toLowerCase().contains("+ repeater"))) {
            return true;
        }

        int studentNum = extractTrailingNumber(cleanStudentId);
        if (studentNum <= 0) {
            return true;
        }

        java.util.regex.Pattern p = java.util.regex.Pattern.compile("(\\d{4,5})\\s*-\\s*.*?(\\d{4,5})");
        java.util.regex.Matcher m = p.matcher(rangeStr);
        if (m.find()) {
            try {
                int startNum = Integer.parseInt(m.group(1));
                int endNum = Integer.parseInt(m.group(2));
                if (studentNum >= startNum && studentNum <= endNum) {
                    return true;
                }
            } catch (Exception ignored) {}
        }

        return false;
    }

    private int extractTrailingNumber(String str) {
        if (str == null) return -1;
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("(\\d{4,5})$");
        java.util.regex.Matcher m = p.matcher(str.trim());
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (Exception ignored) {}
        }
        return -1;
    }

    private boolean isDepartmentSpecificHall(Hall hall) {
        if (hall == null || hall.getHallName() == null) return false;
        String name = hall.getHallName().toLowerCase();
        return name.contains("electrical") || name.contains("mechanical") || name.contains("civil") ||
               name.contains("computer centre") || name.contains("seminar room") || name.contains("cobeu") ||
               name.contains("audio visual") || name.contains("drawing office") || name.contains("lab");
    }
}
