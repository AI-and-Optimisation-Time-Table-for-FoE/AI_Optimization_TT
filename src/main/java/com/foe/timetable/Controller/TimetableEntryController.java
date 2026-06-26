package com.foe.timetable.Controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.foe.timetable.model.BatchModule;
import com.foe.timetable.model.YourRequestData;
import com.foe.timetable.model.dto.TimetableEntryViewDto;
import com.foe.timetable.repository.BatchModuleRepository;
import com.foe.timetable.repository.TimetableEntryRepository;
import com.foe.timetable.service.TimetableGenerationService;
import com.foe.timetable.service.TimetableQueryService;

@RestController
@RequestMapping("/api/timetable")
@CrossOrigin(origins = "*")
public class TimetableEntryController {

    @Autowired private TimetableEntryRepository timetableEntryRepository;
    @Autowired private TimetableGenerationService timetableGenerationService;
    @Autowired private TimetableQueryService timetableQueryService;
    @Autowired private BatchModuleRepository batchModuleRepository;
    @Autowired private com.foe.timetable.repository.TimetableRepository timetableRepository;

    @GetMapping
    public List<TimetableEntryViewDto> getCompleteTimetable(
            @RequestParam(required = false) Integer batchId,
            @RequestParam(required = false) Integer lecturerId,
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false, defaultValue = "false") boolean isAdmin) {
        if (lecturerId != null) {
            return timetableQueryService.getTimetableByLecturerId(lecturerId);
        }
        return (batchId != null) ? timetableQueryService.getTimetableByBatchId(batchId, departmentId, !isAdmin) : timetableQueryService.getAllTimetableViews();
    }

    @GetMapping("/status")
    public ResponseEntity<?> getTimetableStatus(@RequestParam Integer batchId) {
        java.util.Optional<com.foe.timetable.model.Timetable> ttOpt = timetableRepository.findFirstByBatchIdOrderByGeneratedAtDesc(batchId);
        if (ttOpt.isPresent()) {
            return ResponseEntity.ok(Map.of(
                "status", ttOpt.get().getStatus(),
                "timetableId", ttOpt.get().getTimetableId(),
                "generatedAt", ttOpt.get().getGeneratedAt() != null ? ttOpt.get().getGeneratedAt().toString() : ""
            ));
        }
        return ResponseEntity.ok(Map.of("status", "none"));
    }

    @PostMapping("/publish")
    public ResponseEntity<?> publishTimetable(@RequestBody Map<String, Object> payload) {
        Number batchIdNum = (Number) payload.get("batchId");
        if (batchIdNum == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "batchId is required"));
        }
        java.util.Optional<com.foe.timetable.model.Timetable> ttOpt = timetableRepository.findFirstByBatchIdOrderByGeneratedAtDesc(batchIdNum.intValue());
        if (ttOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No timetable found to publish"));
        }
        com.foe.timetable.model.Timetable tt = ttOpt.get();
        tt.setStatus("active");
        timetableRepository.save(tt);
        return ResponseEntity.ok(Map.of("message", "Timetable published successfully!", "status", "active"));
    }

@GetMapping("/modules")
public List<BatchModule> getModulesBySemester(@RequestParam Integer semester) {
    // Calling the repository method defined in step 1
    return batchModuleRepository.findBySemester(semester);
}

    @DeleteMapping("/clear")
    public String clearTimetable() {
        timetableEntryRepository.deleteAll();
        return "Timetable cleared successfully!";
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generate(@RequestBody YourRequestData request) {
        if (request.getBatchId() == null) return ResponseEntity.badRequest().body(Map.of("message", "batchId is required"));
        List<TimetableEntryViewDto> entries = timetableGenerationService.generateForBatch(request.getBatchId(), request.getDepartmentId());
        return ResponseEntity.ok(Map.of("message", "Generated successfully!", "batchId", request.getBatchId(), "entries", entries));
    }
}