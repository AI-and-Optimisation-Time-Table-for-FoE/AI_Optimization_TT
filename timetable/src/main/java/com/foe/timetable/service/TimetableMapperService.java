package com.foe.timetable.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.foe.timetable.model.Batch;
import com.foe.timetable.model.BatchModule;
import com.foe.timetable.model.Lecturer;
import com.foe.timetable.model.TimetableEntry;
import com.foe.timetable.model.dto.BatchModuleViewDto;
import com.foe.timetable.model.dto.TimetableEntryViewDto;
import com.foe.timetable.repository.LecturerRepository;

@Service
public class TimetableMapperService {

    @Autowired
    private LecturerRepository lecturerRepository;

    @Autowired
    private com.foe.timetable.repository.TimetableRepository timetableRepository;

    @Autowired
    private com.foe.timetable.repository.DepartmentRepository departmentRepository;

    public TimetableEntryViewDto toViewDto(TimetableEntry entry, Batch batch, Map<Integer, String> lecturerNames) {
        TimetableEntryViewDto dto = new TimetableEntryViewDto();
        BatchModule batchModule = entry.getBatchModule();

        dto.setEntryId(entry.getEntryId());
        dto.setBatchId(batch != null ? batch.getBatchId() : batchModule.getBatchId());
        dto.setBatchName(batch != null ? batch.getBatchName() : (batchModule.getBatch() != null ? batchModule.getBatch().getBatchName() : null));
        dto.setModuleCode(batchModule.getModule().getModuleCode());
        dto.setModuleName(batchModule.getModule().getModuleName());
        java.util.List<String> names = new java.util.ArrayList<>();
        for (Integer id : batchModule.getAllLecturerIds()) {
            names.add(lecturerNames.getOrDefault(id, "TBA"));
        }
        dto.setLecturerName(names.isEmpty() ? "TBA" : String.join(", ", names));
        dto.setHallName(entry.getHall().getHallName());
        dto.setDayOfWeek(entry.getTimeSlot().getDayOfWeek());
        dto.setStartTime(formatTime(entry.getTimeSlot().getStartTime()));
        dto.setEndTime(formatTime(entry.getTimeSlot().getEndTime()));
        dto.setSessionType(entry.getSessionType());
        return dto;
    }

    public List<TimetableEntryViewDto> toViewDtos(List<TimetableEntry> entries, Batch batch) {
        Map<Integer, String> lecturerNames = lecturerRepository.findAll().stream()
            .collect(Collectors.toMap(Lecturer::getLecturerId, Lecturer::getName, (a, b) -> a));

        Map<Integer, com.foe.timetable.model.Timetable> timetables = timetableRepository.findAll().stream()
            .collect(Collectors.toMap(com.foe.timetable.model.Timetable::getTimetableId, t -> t, (a, b) -> a));

        Map<Integer, String> deptCodes = departmentRepository.findAll().stream()
            .collect(Collectors.toMap(com.foe.timetable.model.Department::getDepartmentId, com.foe.timetable.model.Department::getDepartmentCode, (a, b) -> a));

        return entries.stream()
            .map(entry -> {
                TimetableEntryViewDto dto = toViewDto(entry, batch, lecturerNames);
                com.foe.timetable.model.Timetable tt = timetables.get(entry.getTimetableId());
                if (tt != null && tt.getDepartmentId() != null) {
                    String deptCode = deptCodes.get(tt.getDepartmentId());
                    if (deptCode != null && !"IS".equalsIgnoreCase(deptCode)) {
                        dto.setBatchName(dto.getBatchName() + " (" + deptCode + ")");
                    }
                }
                return dto;
            })
            .toList();
    }

    public BatchModuleViewDto toBatchModuleDto(BatchModule batchModule, Map<Integer, String> lecturerNames) {
        BatchModuleViewDto dto = new BatchModuleViewDto();
        dto.setBatchModuleId(batchModule.getBatchModuleId());
        dto.setBatchId(batchModule.getBatchId());
        dto.setModuleId(batchModule.getModule().getModuleId());
        dto.setModuleCode(batchModule.getModule().getModuleCode());
        dto.setModuleName(batchModule.getModule().getModuleName());
        dto.setBatchName(batchModule.getBatch() != null ? batchModule.getBatch().getBatchName() : null);
        dto.setCreditHours(batchModule.getModule().getCreditHours());
        dto.setLectureHoursPerWeek(batchModule.getModule().getLectureHoursPerWeek());
        dto.setLabHoursPerWeek(batchModule.getModule().getLabHoursPerWeek());
        dto.setLecturerId(batchModule.getLecturerId());
        java.util.List<Integer> list = new java.util.ArrayList<>(batchModule.getAllLecturerIds());
        dto.setLecturerIds(list);
        
        java.util.List<String> names = new java.util.ArrayList<>();
        for (Integer id : list) {
            names.add(lecturerNames.getOrDefault(id, "TBA"));
        }
        dto.setLecturerName(names.isEmpty() ? "TBA" : String.join(", ", names));
        dto.setSemester(batchModule.getSemester());
        if (batchModule.getPreferredHall() != null) {
            dto.setPreferredHallId(batchModule.getPreferredHall().getHallId());
            dto.setPreferredHallName(batchModule.getPreferredHall().getHallName());
        }
        dto.setIsShared(batchModule.getIsShared());
        dto.setLinkedBatchModuleId(batchModule.getLinkedBatchModuleId());
        dto.setOfferingDeptIds(batchModule.getOfferingDeptIds());
        return dto;
    }

    private String formatTime(String time) {
        if (time == null) {
            return "";
        }
        return time.length() >= 5 ? time.substring(0, 5) : time;
    }
}
