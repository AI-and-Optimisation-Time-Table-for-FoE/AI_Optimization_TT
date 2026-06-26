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

    public TimetableEntryViewDto toViewDto(TimetableEntry entry, Batch batch, Map<Integer, String> lecturerNames) {
        TimetableEntryViewDto dto = new TimetableEntryViewDto();
        BatchModule batchModule = entry.getBatchModule();

        dto.setEntryId(entry.getEntryId());
        dto.setBatchId(batch != null ? batch.getBatchId() : batchModule.getBatchId());
        dto.setBatchName(batch != null ? batch.getBatchName() : (batchModule.getBatch() != null ? batchModule.getBatch().getBatchName() : null));
        dto.setModuleCode(batchModule.getModule().getModuleCode());
        dto.setModuleName(batchModule.getModule().getModuleName());
        dto.setLecturerName(lecturerNames.getOrDefault(batchModule.getLecturerId(), "TBA"));
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

        return entries.stream()
            .map(entry -> toViewDto(entry, batch, lecturerNames))
            .toList();
    }

    public BatchModuleViewDto toBatchModuleDto(BatchModule batchModule, Map<Integer, String> lecturerNames) {
        BatchModuleViewDto dto = new BatchModuleViewDto();
        dto.setBatchModuleId(batchModule.getBatchModuleId());
        dto.setBatchId(batchModule.getBatchId());
        dto.setModuleId(batchModule.getModule().getModuleId());
        dto.setModuleCode(batchModule.getModule().getModuleCode());
        dto.setModuleName(batchModule.getModule().getModuleName());
        dto.setCreditHours(batchModule.getModule().getCreditHours());
        dto.setLectureHoursPerWeek(batchModule.getModule().getLectureHoursPerWeek());
        dto.setLabHoursPerWeek(batchModule.getModule().getLabHoursPerWeek());
        dto.setLecturerId(batchModule.getLecturerId());
        dto.setLecturerName(lecturerNames.getOrDefault(batchModule.getLecturerId(), "TBA"));
        dto.setSemester(batchModule.getSemester());
        if (batchModule.getPreferredHall() != null) {
            dto.setPreferredHallId(batchModule.getPreferredHall().getHallId());
            dto.setPreferredHallName(batchModule.getPreferredHall().getHallName());
        }
        return dto;
    }

    private String formatTime(String time) {
        if (time == null) {
            return "";
        }
        return time.length() >= 5 ? time.substring(0, 5) : time;
    }
}
