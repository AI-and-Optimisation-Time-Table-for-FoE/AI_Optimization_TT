package com.foe.timetable.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foe.timetable.model.dto.TimetableEntryViewDto;
import com.foe.timetable.service.TimetableQueryService;

@RestController
@CrossOrigin // Allows your frontend to connect smoothly later
@RequestMapping("/api/view-timetable") // CHANGED THIS LINE TO BE UNIQUE
public class TimetableViewController {

    @Autowired
    private TimetableQueryService timetableQueryService;

    @GetMapping("/batch/{batchId}")
    public ResponseEntity<List<TimetableEntryViewDto>> viewTimetableByBatch(@PathVariable int batchId) {
        List<TimetableEntryViewDto> schedule = timetableQueryService.getTimetableByBatchId(batchId);
        if (schedule.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(schedule);
    }
}