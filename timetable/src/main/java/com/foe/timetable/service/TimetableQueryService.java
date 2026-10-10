package com.foe.timetable.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.foe.timetable.model.Batch;
import com.foe.timetable.model.BatchModule;
import com.foe.timetable.model.Lecturer;
import com.foe.timetable.model.TimetableEntry;
import com.foe.timetable.model.dto.BatchModuleViewDto;
import com.foe.timetable.model.dto.TimetableEntryViewDto;
import com.foe.timetable.repository.BatchModuleRepository;
import com.foe.timetable.repository.BatchRepository;
import com.foe.timetable.repository.LecturerRepository;
import com.foe.timetable.repository.TimetableEntryRepository;

@Service
public class TimetableQueryService {

    @Autowired private TimetableEntryRepository timetableEntryRepository;
    @Autowired private BatchRepository batchRepository;
    @Autowired private BatchModuleRepository batchModuleRepository;
    @Autowired private LecturerRepository lecturerRepository;
    @Autowired private TimetableMapperService timetableMapperService;
    @Autowired private com.foe.timetable.repository.TimetableRepository timetableRepository;
    @Autowired private com.foe.timetable.repository.ModuleRepository moduleRepository;
    @Autowired private com.foe.timetable.repository.DepartmentRepository departmentRepository;

    public List<TimetableEntryViewDto> getTimetableByBatchId(int batchId, Integer departmentId, boolean onlyActive) {
        Batch batch = batchRepository.findById(batchId).orElse(null);
        if (batch == null) {
            return java.util.Collections.emptyList();
        }

        List<TimetableEntry> entries;
        if (batch.getSemester() >= 3 && departmentId != null) {
            if (departmentId.equals(4)) {
                // Return all scheduled IS modules for this batch in the latest version of each department
                List<TimetableEntry> allEntries = timetableEntryRepository.findByBatchId(batchId);
                List<com.foe.timetable.model.Timetable> latestTts = timetableRepository.findByBatchIdOrderByGeneratedAtDesc(batchId).stream()
                    .collect(Collectors.groupingBy(tt -> tt.getDepartmentId() == null ? -1 : tt.getDepartmentId()))
                    .values().stream()
                    .map(list -> {
                        if (onlyActive) {
                            return list.stream()
                                .filter(t -> "active".equalsIgnoreCase(t.getStatus()))
                                .max(java.util.Comparator.comparing(com.foe.timetable.model.Timetable::getTimetableId))
                                .orElse(null);
                        } else {
                            return list.stream()
                                .max(java.util.Comparator.comparing(com.foe.timetable.model.Timetable::getTimetableId))
                                .orElse(null);
                        }
                    })
                    .filter(java.util.Objects::nonNull)
                    .toList();
                java.util.Set<Integer> latestTtIds = latestTts.stream()
                    .map(com.foe.timetable.model.Timetable::getTimetableId)
                    .collect(Collectors.toSet());
                
                entries = allEntries.stream()
                    .filter(te -> latestTtIds.contains(te.getTimetableId()))
                    .filter(te -> te.getBatchModule() != null && te.getBatchModule().getModule() != null && 
                                  te.getBatchModule().getModule().getDepartment() != null && 
                                  (te.getBatchModule().getModule().getDepartment().getDepartmentId().equals(4) || 
                                   "IS".equals(te.getBatchModule().getModule().getDepartment().getDepartmentCode())))
                    .collect(Collectors.toList());
                    
                // Dedup entries by day, slot, hall, and module code
                java.util.Set<String> seen = new java.util.HashSet<>();
                List<TimetableEntry> deduped = new java.util.ArrayList<>();
                for (TimetableEntry te : entries) {
                    if (te.getTimeSlot() != null && te.getBatchModule() != null && te.getBatchModule().getModule() != null) {
                        String key = te.getTimeSlot().getSlotId() + "-" + 
                                     (te.getHall() != null ? te.getHall().getHallId() : "nohall") + "-" + 
                                     te.getBatchModule().getModule().getModuleCode();
                        if (!seen.contains(key)) {
                            seen.add(key);
                            deduped.add(te);
                        }
                    }
                }
                entries = deduped;
            } else {
                List<com.foe.timetable.model.Timetable> ttList = timetableRepository.findByBatchIdAndDepartmentIdOrderByGeneratedAtDesc(batchId, departmentId);
                if (ttList.isEmpty()) {
                    return java.util.Collections.emptyList();
                }
                com.foe.timetable.model.Timetable tt = null;
                if (onlyActive) {
                    tt = ttList.stream()
                        .filter(t -> "active".equalsIgnoreCase(t.getStatus()))
                        .findFirst()
                        .orElse(null);
                } else {
                    tt = ttList.get(0);
                }
                if (tt == null) {
                    return java.util.Collections.emptyList();
                }
                entries = timetableEntryRepository.findByTimetableId(tt.getTimetableId());
            }
        } else {
            List<com.foe.timetable.model.Timetable> ttList = timetableRepository.findByBatchIdOrderByGeneratedAtDesc(batchId);
            if (ttList.isEmpty()) {
                return java.util.Collections.emptyList();
            }
            com.foe.timetable.model.Timetable tt = null;
            if (onlyActive) {
                tt = ttList.stream()
                    .filter(t -> "active".equalsIgnoreCase(t.getStatus()))
                    .findFirst()
                    .orElse(null);
            } else {
                tt = ttList.get(0);
            }
            if (tt == null) {
                return java.util.Collections.emptyList();
            }
            entries = timetableEntryRepository.findByTimetableId(tt.getTimetableId());

            if (batch.getSemester() >= 3) {
                java.util.Set<String> seen = new java.util.HashSet<>();
                List<TimetableEntry> deduped = new java.util.ArrayList<>();
                for (TimetableEntry te : entries) {
                    if (te.getBatchModule() != null && te.getBatchModule().getModule() != null && te.getTimeSlot() != null) {
                        String key = te.getTimeSlot().getSlotId() + "-" + 
                                     (te.getHall() != null ? te.getHall().getHallId() : "nohall") + "-" + 
                                     te.getBatchModule().getModule().getModuleCode();
                        if (!seen.contains(key)) {
                            seen.add(key);
                            deduped.add(te);
                        }
                    } else {
                        deduped.add(te);
                    }
                }
                entries = deduped;
            }
        }

        return timetableMapperService.toViewDtos(entries, batch);
    }

    public List<TimetableEntryViewDto> getTimetableByTimetableId(int timetableId, Integer departmentId) {
        java.util.Optional<com.foe.timetable.model.Timetable> ttOpt = timetableRepository.findById(timetableId);
        if (ttOpt.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        com.foe.timetable.model.Timetable tt = ttOpt.get();
        Batch batch = batchRepository.findById(tt.getBatchId()).orElse(null);
        List<TimetableEntry> entries = timetableEntryRepository.findByTimetableId(timetableId);

        return timetableMapperService.toViewDtos(entries, batch);
    }

    @Autowired private com.foe.timetable.repository.SystemConfigRepository systemConfigRepository;

    public List<TimetableEntryViewDto> getTimetableByLecturerId(int lecturerId) {
        java.util.Optional<com.foe.timetable.model.SystemConfig> isPubOpt = systemConfigRepository.findById("LECTURER_TIMETABLE_PUBLISHED");
        boolean isMasterPublished = isPubOpt.isPresent() && "true".equalsIgnoreCase(isPubOpt.get().getConfigValue());
        if (!isMasterPublished) {
            return java.util.Collections.emptyList();
        }

        List<TimetableEntry> entries = timetableEntryRepository.findByLecturerId(lecturerId);

        List<TimetableEntry> activeEntries = entries.stream()
            .filter(te -> {
                java.util.Optional<com.foe.timetable.model.Timetable> ttOpt = timetableRepository.findById(te.getTimetableId());
                return ttOpt.isPresent() && "active".equalsIgnoreCase(ttOpt.get().getStatus());
            })
            .filter(te -> !"lab".equalsIgnoreCase(te.getSessionType()))
            .collect(Collectors.toList());

        return timetableMapperService.toViewDtos(activeEntries, null);
    }

    @org.springframework.transaction.annotation.Transactional
    public List<BatchModuleViewDto> getBatchModules(int batchId, Integer departmentId) {
        Batch batch = batchRepository.findById(batchId).orElse(null);
        if (batch == null) {
            return java.util.Collections.emptyList();
        }
        List<BatchModule> batchModules = batchModuleRepository.findByBatch_BatchId(batchId);

        if (batchModules.isEmpty()) {
            List<com.foe.timetable.model.Module> semesterModules = moduleRepository.findBySemester(batch.getSemester());
            List<Lecturer> allLecturers = lecturerRepository.findAll();
            if (!semesterModules.isEmpty() && !allLecturers.isEmpty()) {
                java.util.Map<Integer, List<Lecturer>> lecturersByDept = allLecturers.stream()
                    .collect(Collectors.groupingBy(l -> l.getDepartment().getDepartmentId()));
                for (com.foe.timetable.model.Module module : semesterModules) {
                    BatchModule bm = new BatchModule();
                    bm.setBatch(batch);
                    bm.setModule(module);
                    bm.setSemester(batch.getSemester());
                    bm.setAcademicYear(batch.getAcademicYear());
                    List<Lecturer> deptLecturers = lecturersByDept.get(module.getDepartment().getDepartmentId());
                    Lecturer assignedLecturer = (deptLecturers != null && !deptLecturers.isEmpty()) ? deptLecturers.get(0) : allLecturers.get(0);
                    bm.setLecturerId(assignedLecturer.getLecturerId());
                    batchModuleRepository.save(bm);
                }
                batchModules = batchModuleRepository.findByBatch_BatchId(batchId);
            }
        }

        // 1. Ensure all IS modules for this semester are initialized as batch modules (if not assigned at all)
        List<com.foe.timetable.model.Module> isModules = moduleRepository.findBySemester(batch.getSemester()).stream()
            .filter(m -> m.getDepartment() != null && (m.getDepartment().getDepartmentId().equals(4) || "IS".equals(m.getDepartment().getDepartmentCode())))
            .toList();
        
        boolean addedAny = false;
        List<Lecturer> allLecturers = lecturerRepository.findAll();
        for (com.foe.timetable.model.Module isMod : isModules) {
            boolean exists = batchModules.stream()
                .anyMatch(bm -> bm.getModule().getModuleId().equals(isMod.getModuleId()));
                
            if (!exists && !allLecturers.isEmpty()) {
                BatchModule bm = new BatchModule();
                bm.setBatch(batch);
                bm.setModule(isMod);
                bm.setSemester(batch.getSemester());
                bm.setAcademicYear(batch.getAcademicYear());
                bm.setLecturerId(allLecturers.get(0).getLecturerId());
                bm.setLecturerIds(new java.util.HashSet<>(java.util.List.of(allLecturers.get(0).getLecturerId())));
                batchModuleRepository.save(bm);
                addedAny = true;
            }
        }
        if (addedAny) {
            batchModules = batchModuleRepository.findByBatch_BatchId(batchId);
        }

        // Filter: only show modules that belong to the batch's CURRENT semester
        // Check both the stored bm.semester AND the module's actual semester for robustness
        final int currentSemester = batch.getSemester();
        batchModules = batchModules.stream()
            .filter(bm -> bm.getSemester() == currentSemester
                       && bm.getModule().getSemester() == currentSemester)
            .collect(Collectors.toList());

        // 2. Filter by department if batch semester >= 3 and departmentId is not null
        if (batch.getSemester() >= 3 && departmentId != null) {
            final Integer deptId = departmentId;
            batchModules = batchModules.stream()
                .filter(bm -> bm.isOfferedByDepartment(deptId))
                .collect(Collectors.toList());
        }

        var lecturerMap = lecturerRepository.findAll().stream()
            .collect(Collectors.toMap(Lecturer::getLecturerId, Lecturer::getName, (a, b) -> a));

        return batchModules.stream()
            .map(bm -> timetableMapperService.toBatchModuleDto(bm, lecturerMap))
            .collect(Collectors.toList());
    }

    public List<TimetableEntryViewDto> getAllTimetableViews() {
    List<TimetableEntry> entries = timetableEntryRepository.findAll();
    return timetableMapperService.toViewDtos(entries, null);
}
    // ... keep getAllTimetableViews and getSemesterTimetable ...
}