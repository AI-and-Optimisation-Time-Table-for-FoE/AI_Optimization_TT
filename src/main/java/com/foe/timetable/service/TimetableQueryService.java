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

    public List<TimetableEntryViewDto> getTimetableByBatchId(int batchId, Integer departmentId, boolean onlyActive) {
        java.util.Optional<com.foe.timetable.model.Timetable> ttOpt = timetableRepository.findFirstByBatchIdOrderByGeneratedAtDesc(batchId);
        if (ttOpt.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        com.foe.timetable.model.Timetable tt = ttOpt.get();
        if (onlyActive && !"active".equalsIgnoreCase(tt.getStatus())) {
            return java.util.Collections.emptyList();
        }

        Batch batch = batchRepository.findById(batchId).orElse(null);
        List<TimetableEntry> entries = timetableEntryRepository.findByBatchId(batchId);

        if (batch != null && batch.getSemester() >= 3 && departmentId != null) {
            entries = entries.stream()
                .filter(te -> te.getBatchModule() != null &&
                              te.getBatchModule().getModule() != null &&
                              te.getBatchModule().getModule().getDepartment() != null &&
                              te.getBatchModule().getModule().getDepartment().getDepartmentId().equals(departmentId))
                .collect(Collectors.toList());
        }

        return timetableMapperService.toViewDtos(entries, batch);
    }

    public List<TimetableEntryViewDto> getTimetableByLecturerId(int lecturerId) {
        List<TimetableEntry> entries = timetableEntryRepository.findByLecturerId(lecturerId);

        List<TimetableEntry> activeEntries = entries.stream()
            .filter(te -> {
                java.util.Optional<com.foe.timetable.model.Timetable> ttOpt = timetableRepository.findById(te.getTimetableId());
                return ttOpt.isPresent() && "active".equalsIgnoreCase(ttOpt.get().getStatus());
            })
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

        if (batch.getSemester() >= 3 && departmentId != null) {
            batchModules = batchModules.stream()
                .filter(bm -> bm.getModule() != null &&
                              bm.getModule().getDepartment() != null &&
                              bm.getModule().getDepartment().getDepartmentId().equals(departmentId))
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