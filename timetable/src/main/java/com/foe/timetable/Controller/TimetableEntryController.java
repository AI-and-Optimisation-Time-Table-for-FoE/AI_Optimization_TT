package com.foe.timetable.Controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
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
            @RequestParam(required = false) Integer timetableId,
            @RequestParam(required = false, defaultValue = "false") boolean isAdmin) {
        if (timetableId != null) {
            return timetableQueryService.getTimetableByTimetableId(timetableId, departmentId);
        }
        if (lecturerId != null) {
            return timetableQueryService.getTimetableByLecturerId(lecturerId);
        }
        return (batchId != null) ? timetableQueryService.getTimetableByBatchId(batchId, departmentId, !isAdmin) : timetableQueryService.getAllTimetableViews();
    }

    @GetMapping("/status")
    public ResponseEntity<?> getTimetableStatus(
            @RequestParam(required = false) Integer batchId,
            @RequestParam(required = false) Integer departmentId) {
        java.util.List<com.foe.timetable.model.Timetable> ttList;
        if (batchId != null) {
            if (departmentId != null) {
                ttList = timetableRepository.findByBatchIdAndDepartmentIdOrderByGeneratedAtDesc(batchId, departmentId);
            } else {
                ttList = timetableRepository.findByBatchIdAndDepartmentIdIsNullOrderByGeneratedAtDesc(batchId);
            }
        } else {
            ttList = timetableRepository.findAll().stream()
                .filter(tt -> "active".equalsIgnoreCase(tt.getStatus()))
                .sorted(java.util.Comparator.comparing((com.foe.timetable.model.Timetable t) -> 
                    t.getPublishedAt() != null ? t.getPublishedAt() : (t.getGeneratedAt() != null ? t.getGeneratedAt() : java.time.LocalDateTime.MIN)).reversed())
                .collect(Collectors.toList());
        }
        
        if (!ttList.isEmpty()) {
            com.foe.timetable.model.Timetable tt = ttList.get(0);
            return ResponseEntity.ok(Map.of(
                "status", tt.getStatus(),
                "timetableId", tt.getTimetableId(),
                "generatedAt", tt.getGeneratedAt() != null ? tt.getGeneratedAt().toString() : "",
                "publishedAt", tt.getPublishedAt() != null ? tt.getPublishedAt().toString() : ""
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
        tt.setPublishedAt(java.time.LocalDateTime.now());
        timetableRepository.save(tt);
        return ResponseEntity.ok(Map.of(
            "message", "Timetable published successfully!", 
            "status", "active",
            "publishedAt", tt.getPublishedAt().toString()
        ));
    }

@GetMapping("/modules")
public List<BatchModule> getModulesBySemester(@RequestParam Integer semester) {
    // Calling the repository method defined in step 1
    return batchModuleRepository.findBySemester(semester);
}

    @DeleteMapping("/clear")
    @org.springframework.transaction.annotation.Transactional
    public String clearTimetable() {
        timetableEntryRepository.deleteAll();
        timetableRepository.deleteAll();
        return "All timetable entries and version records cleared successfully!";
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generate(
            @RequestBody(required = false) YourRequestData request,
            @RequestParam(required = false) Integer batchId,
            @RequestParam(required = false) Integer departmentId) {
        
        Integer targetBatchId = null;
        Integer targetDeptId = null;
        
        if (request != null) {
            targetBatchId = request.getBatchId();
            targetDeptId = request.getDepartmentId();
        }
        
        if (targetBatchId == null) {
            targetBatchId = batchId;
        }
        if (targetDeptId == null) {
            targetDeptId = departmentId;
        }
        
        if (targetBatchId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "batchId is required"));
        }
        
        List<TimetableEntryViewDto> entries = timetableGenerationService.generateForBatch(targetBatchId, targetDeptId);
        return ResponseEntity.ok(Map.of("message", "Generated successfully!", "batchId", targetBatchId, "entries", entries));
    }
}