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

    // Get all exam timetables for a batch (optionally filtered by streamScope)
    @GetMapping
    public ResponseEntity<?> getExamTimetables(@RequestParam(required = false) Integer batchId, @RequestParam(required = false) String streamScope) {
        if (batchId != null) {
            if (streamScope != null && !streamScope.trim().isEmpty() && !"ALL".equalsIgnoreCase(streamScope.trim())) {
                List<ExamTimetable> streamList = examTimetableRepository.findByBatch_BatchIdAndStreamScopeOrderByCreatedAtDesc(batchId, streamScope.trim().toUpperCase());
                if (!streamList.isEmpty()) {
                    return ResponseEntity.ok(streamList);
                }
            }
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

        // Ensure every entry has a valid, calculated student ID range and repeater count strictly grouped per module
        Map<String, Integer> runningModuleIndex = new HashMap<>();
        Map<Integer, List<ExamEntry>> entriesByModule = new HashMap<>();

        for (ExamEntry entry : entries) {
            boolean modified = false;
            if (entry.getStudentIdRange() == null || entry.getStudentIdRange().trim().isEmpty()) {
                String modKey = entry.getModule() != null ? String.valueOf(entry.getModule().getModuleId()) : "0";
                int currentIndex = runningModuleIndex.getOrDefault(modKey, 0);
                int count = (entry.getAllocatedCount() != null && entry.getAllocatedCount() > 0) ? entry.getAllocatedCount() : 100;
                String deptPrefix = (entry.getModule() != null && entry.getModule().getDepartment() != null && !"IS".equalsIgnoreCase(entry.getModule().getDepartment().getDepartmentCode()))
                        ? entry.getModule().getDepartment().getDepartmentCode() : null;
                String generatedRange = generateStudentIdRange(null, currentIndex, count, et.getBatch(), deptPrefix, count, false);
                entry.setStudentIdRange(generatedRange);
                runningModuleIndex.put(modKey, currentIndex + count);
                modified = true;
            }
            if (modified) {
                examEntryRepository.save(entry);
            }
            if (entry.getModule() != null) {
                entriesByModule.computeIfAbsent(entry.getModule().getModuleId(), k -> new ArrayList<>()).add(entry);
            }
        }

        // Authoritative Faculty repeater sync — strictly ONE venue per module
        for (Map.Entry<Integer, List<ExamEntry>> entryGroup : entriesByModule.entrySet()) {
            List<ExamEntry> modEntries = entryGroup.getValue();
            if (modEntries.isEmpty()) continue;

            Module mod = modEntries.get(0).getModule();
            String mCode = mod.getModuleCode().toUpperCase().trim();
            int officialRepCount = getFacultyRepeaterCount(mCode);

            int existingRepSum = modEntries.stream()
                    .mapToInt(e -> e.getRepeaterCount() != null ? e.getRepeaterCount() : 0)
                    .sum();

            if (existingRepSum == 0 && officialRepCount > 0) {
                // Assign repeaters ONLY to the single last venue entry of this module
                ExamEntry lastEntry = modEntries.get(modEntries.size() - 1);
                lastEntry.setRepeaterCount(officialRepCount);
                lastEntry.setRepeaterInfo(officialRepCount + (officialRepCount == 1 ? " Repeater" : " Repeaters"));
                examEntryRepository.save(lastEntry);
            } else if (existingRepSum > 0 && modEntries.size() > 1) {
                // Clean up any duplicates across venues so repeaters exist only on ONE venue
                boolean foundDesignated = false;
                for (int i = 0; i < modEntries.size(); i++) {
                    ExamEntry e = modEntries.get(i);
                    boolean isLast = (i == modEntries.size() - 1);
                    if (!isLast && e.getRepeaterCount() != null && e.getRepeaterCount() > 0) {
                        e.setRepeaterCount(0);
                        e.setRepeaterInfo(null);
                        examEntryRepository.save(e);
                    }
                }
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
        String streamScope = (String) payload.get("streamScope");

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
        et.setStreamScope((streamScope != null && !streamScope.trim().isEmpty()) ? streamScope.trim().toUpperCase() : "ALL");

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

        String streamScope = et.getStreamScope() != null ? et.getStreamScope().toUpperCase().trim() : "ALL";
        Integer semester = batch.getSemester();
        boolean isThirdYear = (semester != null && (semester == 5 || semester == 6));

        Set<Integer> moduleIds = new HashSet<>();
        List<Module> modules = new ArrayList<>();
        for (BatchModule bm : batchModules) {
            if (bm.getModule() != null && !moduleIds.contains(bm.getModule().getModuleId())) {
                Module mod = bm.getModule();
                String mCode = mod.getModuleCode() != null ? mod.getModuleCode().toUpperCase().replaceAll("\\s+", "") : "";
                String deptCode = (mod.getDepartment() != null && mod.getDepartment().getDepartmentCode() != null)
                        ? mod.getDepartment().getDepartmentCode().toUpperCase().trim() : "";

                boolean include = false;
                if (!isThirdYear || "ALL".equals(streamScope)) {
                    include = true;
                } else if ("EC".equals(streamScope)) {
                    include = deptCode.equals("EC") || deptCode.equals("COM") || mCode.startsWith("EC") || mCode.startsWith("COM") || mCode.startsWith("CO");
                } else if ("MN".equals(streamScope)) {
                    include = deptCode.equals("MN") || mCode.startsWith("MN");
                } else if ("EC_MN".equals(streamScope)) {
                    include = deptCode.equals("EC") || deptCode.equals("COM") || deptCode.equals("MN") ||
                              mCode.startsWith("EC") || mCode.startsWith("COM") || mCode.startsWith("CO") || mCode.startsWith("MN");
                } else if ("MAIN".equals(streamScope)) {
                    // Main stream: CE, EE, ME (and general non-EC/non-MN)
                    include = !deptCode.equals("EC") && !deptCode.equals("COM") && !deptCode.equals("MN") &&
                              !mCode.startsWith("EC") && !mCode.startsWith("MN") && !mCode.startsWith("COM") && !mCode.startsWith("CO");
                }

                if (include) {
                    moduleIds.add(mod.getModuleId());
                    modules.add(mod);
                }
            }
        }

        List<Hall> halls = hallRepository.findAll();
        List<ExamHallUnavailability> unavailabilities = examHallUnavailabilityRepository.findAll();

        int batchStudentCount = (batch.getStudentCount() != null && batch.getStudentCount() > 0) ? batch.getStudentCount() : 100;
        if (isThirdYear) {
            if ("EC".equals(streamScope)) {
                batchStudentCount = Math.min(batchStudentCount, 120);
            } else if ("MN".equals(streamScope)) {
                batchStudentCount = Math.min(batchStudentCount, 60);
            } else if ("EC_MN".equals(streamScope)) {
                batchStudentCount = Math.min(batchStudentCount, 180);
            } else if ("MAIN".equals(streamScope)) {
                batchStudentCount = Math.max(100, batchStudentCount - 180);
            }
        }

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

        // Filter main faculty exam halls or Marine department halls based on stream
        String streamScope = et.getStreamScope() != null ? et.getStreamScope().toUpperCase().trim() : "ALL";
        List<Hall> availableHalls;
        if ("MN".equalsIgnoreCase(streamScope)) {
            List<Hall> mnHalls = halls.stream()
                    .filter(h -> h.getHallName().toLowerCase().contains("marine") || h.getHallName().toLowerCase().contains("mn"))
                    .collect(Collectors.toList());
            if (!mnHalls.isEmpty()) {
                availableHalls = mnHalls;
            } else {
                availableHalls = halls.stream()
                        .filter(h -> !isDepartmentSpecificHall(h))
                        .sorted(Comparator.comparingInt((Hall h) -> h.getCapacity() != null ? h.getCapacity() : 0).reversed())
                        .collect(Collectors.toList());
            }
        } else {
            availableHalls = halls.stream()
                    .filter(h -> !isDepartmentSpecificHall(h))
                    .sorted(Comparator.comparingInt((Hall h) -> h.getCapacity() != null ? h.getCapacity() : 0).reversed())
                    .collect(Collectors.toList());
        }
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
            // For IS (common) modules: check if elective (GE/TE) vs compulsory batch-wide.
            // For department-specific modules: use registered dept students if available.
            List<UserAccount> targetStudents = registeredStudents;
            int totalForThisModule;

            boolean isFirstOrSecondSem = (et.getBatch().getSemester() != null && (et.getBatch().getSemester() == 1 || et.getBatch().getSemester() == 2))
                                      || (mod.getSemester() != null && (mod.getSemester() == 1 || mod.getSemester() == 2));
            boolean isDeptModule = !isFirstOrSecondSem && mod.getDepartment() != null && !"IS".equalsIgnoreCase(mod.getDepartment().getDepartmentCode());
            int electiveCount = getFacultyElectiveRegularCount(mod.getModuleCode(), mod.getModuleName());
            int officialRepCount = getFacultyRepeaterCount(mod.getModuleCode());

            if (electiveCount > 0) {
                // Elective module (e.g. IS4227 Technology and Society: exactly 51 regular students)
                // 1. Allocate dedicated hall strictly for regular students (51 seats)
                allocateHallsForGroup(et, mod, assignedDate, assignedSession, Collections.emptyList(), electiveCount, null, halls, usedHallSlots, unavailSet, entries, false);
                // 2. Allocate separate dedicated hall for repeaters (e.g. 119 repeaters in DO2)
                if (officialRepCount > 0) {
                    allocateDedicatedRepeaterHall(et, mod, assignedDate, assignedSession, officialRepCount, halls, usedHallSlots, unavailSet, entries);
                }
            } else if (isDeptModule) {
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
                allocateHallsForGroup(et, mod, assignedDate, assignedSession, deptStudents, totalForThisModule, prefix, halls, usedHallSlots, unavailSet, entries, true);
            } else if (isFirstOrSecondSem) {
                allocateHallsForGroup(et, mod, assignedDate, assignedSession, registeredStudents, effectiveTotalStudents, null, halls, usedHallSlots, unavailSet, entries, true);
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

                for (int dIdx = 0; dIdx < studentDepts.size(); dIdx++) {
                    Department dept = studentDepts.get(dIdx);
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
                    boolean isLastDept = (dIdx == studentDepts.size() - 1);
                    allocateHallsForGroup(et, mod, assignedDate, assignedSession, deptStudents, totalForThisDept, prefix, halls, usedHallSlots, unavailSet, entries, isLastDept);
                }
            }
        }

        return entries;
    }

    private void allocateDedicatedRepeaterHall(ExamTimetable et, Module mod, LocalDate assignedDate, String assignedSession,
                                               int repCount, List<Hall> halls, Set<String> usedHallSlots,
                                               Set<String> unavailSet, List<ExamEntry> entries) {
        final String targetDateStr = assignedDate.toString();
        final String targetSessStr = assignedSession;

        java.util.function.Function<Hall, Integer> getExamCap = (h) -> {
            int cap = (h.getCapacity() != null && h.getCapacity() > 0) ? h.getCapacity() : 100;
            if (cap > 200) return Math.min(cap, 250);
            return Math.max(25, cap / 2);
        };

        List<Hall> repCandidates = halls.stream()
            .filter(h -> !isDepartmentSpecificHall(h))
            .filter(h -> {
                String rSlotKey = h.getHallId() + "_" + targetDateStr + "_" + targetSessStr;
                String rHallKey = h.getHallId() + "_" + targetDateStr;
                String rAllDatesKey = h.getHallId() + "_ALL";
                return !unavailSet.contains(rHallKey) && !unavailSet.contains(rAllDatesKey) && !usedHallSlots.contains(rSlotKey);
            })
            .sorted(Comparator.comparingInt((Hall h) -> Math.abs(getExamCap.apply(h) - repCount)))
            .collect(Collectors.toList());

        if (!repCandidates.isEmpty()) {
            Hall repHall = repCandidates.get(0);
            String repSlotKey = repHall.getHallId() + "_" + targetDateStr + "_" + targetSessStr;
            usedHallSlots.add(repSlotKey);

            ExamEntry repEntry = new ExamEntry();
            repEntry.setExamTimetable(et);
            repEntry.setModule(mod);
            repEntry.setExamDate(assignedDate);
            repEntry.setSessionName(assignedSession);
            if ("Morning Session".equals(assignedSession)) {
                repEntry.setStartTime(LocalTime.of(9, 0));
                repEntry.setEndTime(LocalTime.of(12, 0));
            } else {
                repEntry.setStartTime(LocalTime.of(13, 30));
                repEntry.setEndTime(LocalTime.of(16, 30));
            }
            repEntry.setHall(repHall);
            repEntry.setStudentIdRange("Repeat Candidates (Dedicated Hall)");
            repEntry.setAllocatedCount(0);
            repEntry.setRepeaterCount(repCount);
            repEntry.setRepeaterInfo(repCount + " Repeaters");
            entries.add(repEntry);
        }
    }

    private void allocateHallsForGroup(ExamTimetable et, Module mod, LocalDate assignedDate, String assignedSession,
                                       List<UserAccount> targetStudents, int totalStudents, String deptPrefix,
                                       List<Hall> halls, Set<String> usedHallSlots, Set<String> unavailSet,
                                       List<ExamEntry> entries, boolean allowRepeatersOnLastHall) {
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
            int repCount = 0;
            if (isLastHall && allowRepeatersOnLastHall && mod != null) {
                repCount = getFacultyRepeaterCount(mod.getModuleCode());
                List<StudentModuleEnrollment> reps = studentModuleEnrollmentRepository.findByModule_ModuleIdAndEnrollmentType(
                        mod.getModuleId(), StudentModuleEnrollment.EnrollmentType.repeat);
                if (!reps.isEmpty()) {
                    repCount = Math.max(repCount, reps.size());
                }

                // If repeaters are heavy (> 40 students), allocate a dedicated separate hall for repeaters
                if (repCount > 40) {
                    final int repTarget = repCount;
                    final Hall chosenPrimaryHall = selectedHall;
                    List<Hall> repCandidates = halls.stream()
                        .filter(h -> !isDepartmentSpecificHall(h))
                        .filter(h -> !h.getHallId().equals(chosenPrimaryHall.getHallId()))
                        .filter(h -> {
                            String rSlotKey = h.getHallId() + "_" + targetDateStr + "_" + targetSessStr;
                            String rHallKey = h.getHallId() + "_" + targetDateStr;
                            String rAllDatesKey = h.getHallId() + "_ALL";
                            return !unavailSet.contains(rHallKey) && !unavailSet.contains(rAllDatesKey) && !usedHallSlots.contains(rSlotKey);
                        })
                        .sorted(Comparator.comparingInt((Hall h) -> Math.abs(getExamCap.apply(h) - repTarget)))
                        .collect(Collectors.toList());

                    if (!repCandidates.isEmpty()) {
                        Hall repHall = repCandidates.get(0);
                        String repSlotKey = repHall.getHallId() + "_" + targetDateStr + "_" + targetSessStr;
                        usedHallSlots.add(repSlotKey);

                        ExamEntry repEntry = new ExamEntry();
                        repEntry.setExamTimetable(et);
                        repEntry.setModule(mod);
                        repEntry.setExamDate(assignedDate);
                        repEntry.setSessionName(assignedSession);
                        if ("Morning Session".equals(assignedSession)) {
                            repEntry.setStartTime(LocalTime.of(9, 0));
                            repEntry.setEndTime(LocalTime.of(12, 0));
                        } else {
                            repEntry.setStartTime(LocalTime.of(13, 30));
                            repEntry.setEndTime(LocalTime.of(16, 30));
                        }
                        repEntry.setHall(repHall);
                        repEntry.setStudentIdRange("Repeat Candidates (Dedicated Hall)");
                        repEntry.setAllocatedCount(0);
                        repEntry.setRepeaterCount(repCount);
                        repEntry.setRepeaterInfo(repCount + " Repeaters");
                        entries.add(repEntry);

                        // Primary hall is left strictly for regular students
                        repCount = 0;
                    }
                }
            }

            String idRange = generateStudentIdRange(targetStudents, currentStudentIndex, allocatedForThisHall, et.getBatch(), deptPrefix, totalStudents, (isLastHall && repCount > 0));

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

            if (repCount > 0) {
                entry.setRepeaterCount(repCount);
                entry.setRepeaterInfo(repCount + (repCount == 1 ? " Repeater" : " Repeaters"));
            }

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

    private String generateStudentIdRange(List<UserAccount> students, int startIndex, int count, Batch batch, String deptPrefix, int totalDeptStudents, boolean hasRepeaters) {
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
        if (hasRepeaters) {
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
            Number repeaterCountNum = (Number) item.get("repeaterCount");
            String repeaterInfo = (String) item.get("repeaterInfo");

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
            if (repeaterCountNum != null) {
                entry.setRepeaterCount(repeaterCountNum.intValue());
                if (repeaterCountNum.intValue() == 0) {
                    entry.setRepeaterInfo(null);
                }
            }
            if (repeaterInfo != null && (repeaterCountNum == null || repeaterCountNum.intValue() > 0)) {
                entry.setRepeaterInfo(repeaterInfo);
            } else if (repeaterCountNum != null && repeaterCountNum.intValue() == 0) {
                entry.setRepeaterInfo(null);
            }

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

        Batch batch = batchRepository.findById(batchId).orElse(null);
        Integer semester = batch != null ? batch.getSemester() : null;

        ExamTimetable et = null;
        if (studentDeptId != null && semester != null && (semester == 5 || semester == 6)) {
            Department dept = departmentRepository.findById(studentDeptId).orElse(null);
            String dCode = dept != null ? dept.getDepartmentCode().toUpperCase().trim() : "";

            if ("EC".equals(dCode) || "COM".equals(dCode)) {
                Optional<ExamTimetable> streamEt = examTimetableRepository.findFirstByBatch_BatchIdAndStreamScopeAndStatusOrderByCreatedAtDesc(batchId, "EC", "published");
                if (streamEt.isEmpty()) {
                    streamEt = examTimetableRepository.findFirstByBatch_BatchIdAndStreamScopeAndStatusOrderByCreatedAtDesc(batchId, "EC_MN", "published");
                }
                if (streamEt.isPresent()) et = streamEt.get();
            } else if ("MN".equals(dCode)) {
                Optional<ExamTimetable> streamEt = examTimetableRepository.findFirstByBatch_BatchIdAndStreamScopeAndStatusOrderByCreatedAtDesc(batchId, "MN", "published");
                if (streamEt.isEmpty()) {
                    streamEt = examTimetableRepository.findFirstByBatch_BatchIdAndStreamScopeAndStatusOrderByCreatedAtDesc(batchId, "EC_MN", "published");
                }
                if (streamEt.isPresent()) et = streamEt.get();
            } else {
                // CE, EE, ME
                Optional<ExamTimetable> streamEt = examTimetableRepository.findFirstByBatch_BatchIdAndStreamScopeAndStatusOrderByCreatedAtDesc(batchId, "MAIN", "published");
                if (streamEt.isPresent()) et = streamEt.get();
            }
        }

        if (et == null) {
            Optional<ExamTimetable> publishedOpt = examTimetableRepository.findFirstByBatch_BatchIdAndStatusOrderByCreatedAtDesc(batchId, "published");
            if (publishedOpt.isEmpty()) {
                return ResponseEntity.ok(Map.of("status", "none", "entries", Collections.emptyList(), "message", "No published exam timetable available for your batch yet."));
            }
            et = publishedOpt.get();
        }

        List<ExamEntry> allEntries = examEntryRepository.findByExamTimetable_ExamTimetableIdOrderByExamDateAscStartTimeAsc(et.getExamTimetableId());

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

    private int getFacultyElectiveRegularCount(String code, String name) {
        if (code == null) return 0;
        String c = code.replaceAll("\\s+", "").toUpperCase().trim();
        switch (c) {
            // Semester 4 Electives (25th batch)
            case "IS4227": return 51;  // Technology and Society (GE) — only 51 students enrolled in LT1
            case "IS4128": return 88;  // Industrial Sociology (GE) — 88 students in DO1
            case "IS4129": return 2;   // History of Engineering in Sri Lanka (GE)
            case "IS4224": return 121; // Financial Management (GE) — 121 students in DO2
            case "IS4225": return 13;  // Innovation Management & Entrepreneurship (GE)
            case "ME4210": return 17;  // Analog and Digital Electronics (TE)
            case "ME4212": return 24;  // Nanotechnology (TE)
            case "ME4211": return 79;  // Automobile Engineering (TE)

            // Semester 6 Electives (24th batch)
            case "IS6121": return 7;   // Industrial Law (GE)
            case "CE6253": return 17;  // Sustainable Built Environment Principles (TE)
            case "CE6252": return 118; // Dynamic and Control of Structures (TE)
            case "ME6210": return 20;  // Industrial Automation (TE)

            default: {
                if (name != null) {
                    String n = name.toUpperCase();
                    if (n.contains("(GE)") || n.contains("(TE)") || n.contains("ELECTIVE")) {
                        return 80; // Standard single-hall elective group size
                    }
                }
                return 0; // Compulsory or standard department module
            }
        }
    }

    private int getFacultyRepeaterCount(String code) {
        if (code == null) return 0;
        String c = code.replaceAll("\\s+", "").toUpperCase().trim();
        switch (c) {
            // Semester 2 (27th Batch)
            case "IS2401": return 2;
            case "IS1003": return 1;
            case "CE2302": return 3;
            case "EE2201": return 1;

            // Semester 4 (25th Batch)
            case "IS4307":
            case "IS4227": return 119; // Technology and Society repeaters allocated to dedicated separate hall (DO2)
            case "IS4304": return 11;
            case "IS4305": return 4;
            case "EE4351": return 9;
            case "EC4304": return 9;
            case "EE4304": return 4;
            case "EE4350": return 2;
            case "CE4302": return 9;
            case "CE4305": return 6;
            case "CE4301": return 4;
            case "CE4304":
            case "CE4204": return 3;
            case "CE4303":
            case "CE4251": return 2;
            case "ME4210": return 4;
            case "ME4301": return 2;
            case "MN4304": return 1;
            case "MN4205": return 3;

            // Semester 6 (24th Batch)
            case "CE6305": return 29;
            case "CE6304": return 27;
            case "CE6301": return 16;
            case "CE6302": return 12;
            case "CE6303": return 18;
            case "CE6252":
            case "CE6253": return 2;
            case "EE6301": return 2;
            case "EE6304":
            case "EE6303":
            case "EE6302": return 1;
            case "ME6303":
            case "ME6302":
            case "ME6206": return 3;
            case "ME6304": return 1;
            case "ME6214": return 2;
            case "ME6213": return 1;
            case "IS6303":
            case "IS6201":
            case "MN4210": return 1;

            // Semester 8 (23rd Batch)
            case "EE8217": return 2;

            default: return 0;
        }
    }
}
