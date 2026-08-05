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
    @Autowired private com.foe.timetable.service.TimetableValidationService validationService;
    @Autowired private com.foe.timetable.repository.TimeSlotRepository timeSlotRepository;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @GetMapping
    public List<TimetableEntryViewDto> getCompleteTimetable(
            @RequestParam(required = false) Integer batchId,
            @RequestParam(required = false) Integer lecturerId,
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false) Integer timetableId,
            @RequestParam(required = false, defaultValue = "false") boolean isAdmin) {
        if (timetableId != null) {
            // Non-admins (students) can only view published (active) timetables.
            // Admins can view any timetable version regardless of status.
            if (!isAdmin) {
                java.util.Optional<com.foe.timetable.model.Timetable> ttOpt = timetableRepository.findById(timetableId);
                if (ttOpt.isEmpty() || !"active".equalsIgnoreCase(ttOpt.get().getStatus())) {
                    return java.util.Collections.emptyList();
                }
            }
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
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false, defaultValue = "false") boolean isAdmin) {
        java.util.List<com.foe.timetable.model.Timetable> ttList;
        if (batchId != null) {
            if (departmentId != null) {
                ttList = timetableRepository.findByBatchIdAndDepartmentIdOrderByGeneratedAtDesc(batchId, departmentId);
            } else {
                ttList = timetableRepository.findByBatchIdAndDepartmentIdIsNullOrderByGeneratedAtDesc(batchId);
            }
            // Non-admins (students) should only see the published (active) version
            if (!isAdmin) {
                ttList = ttList.stream()
                    .filter(tt -> "active".equalsIgnoreCase(tt.getStatus()))
                    .collect(Collectors.toList());
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

    @org.springframework.transaction.annotation.Transactional
    @PutMapping("/entries/{entryId}/move")
    public ResponseEntity<?> moveTimetableEntry(
            @PathVariable Integer entryId,
            @RequestBody Map<String, Object> payload) {
        
        String newDayOfWeek = (String) payload.get("dayOfWeek");
        String newStartTime = (String) payload.get("startTime");
        String newEndTime = (String) payload.get("endTime");
        Number venueIdNum = (Number) payload.get("venueId");
        Integer newVenueId = venueIdNum != null ? venueIdNum.intValue() : null;

        if (newDayOfWeek == null || newStartTime == null || newEndTime == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Missing required fields for move"));
        }

        String validationError = validationService.validateManualMove(entryId, newDayOfWeek, newStartTime, newEndTime, newVenueId);
        if (validationError != null) {
            return ResponseEntity.status(409).body(Map.of("message", validationError));
        }

        java.util.Optional<com.foe.timetable.model.TimetableEntry> entryOpt = timetableEntryRepository.findById(entryId);
        if (entryOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        com.foe.timetable.model.TimetableEntry entry = entryOpt.get();
        Integer oldSlotId = entry.getTimeSlot() != null ? entry.getTimeSlot().getSlotId() : null;
        
        java.util.Optional<com.foe.timetable.model.TimeSlot> slotOpt = timeSlotRepository.findAll().stream()
            .filter(s -> s.getDayOfWeek().equalsIgnoreCase(newDayOfWeek) && 
                         s.getStartTime().toString().startsWith(newStartTime) && 
                         s.getEndTime().toString().startsWith(newEndTime))
            .findFirst();
            
        com.foe.timetable.model.TimeSlot slot;
        if (slotOpt.isEmpty()) {
            slot = new com.foe.timetable.model.TimeSlot();
            slot.setDayOfWeek(newDayOfWeek);
            slot.setStartTime(newStartTime + (newStartTime.length() == 5 ? ":00" : ""));
            slot.setEndTime(newEndTime + (newEndTime.length() == 5 ? ":00" : ""));
            slot = timeSlotRepository.save(slot);
        } else {
            slot = slotOpt.get();
        }
        
        entry.setTimeSlot(slot);
        
        Integer targetHallId = newVenueId != null ? newVenueId : (entry.getHall() != null ? entry.getHall().getHallId() : null);
        if (newVenueId != null) {
            com.foe.timetable.model.Hall newHall = new com.foe.timetable.model.Hall();
            newHall.setHallId(newVenueId);
            entry.setHall(newHall);
        }

        com.foe.timetable.model.BatchModule bm = entry.getBatchModule();
        com.foe.timetable.model.Module m = bm.getModule();
        boolean isShared = (bm.getIsShared() != null && bm.getIsShared()) || 
                           (m.getDepartment() != null && m.getDepartment().getDepartmentId().equals(4)) ||
                           (m.getDepartment() != null && "IS".equals(m.getDepartment().getDepartmentCode()));

        if (isShared && oldSlotId != null) {
            Integer moduleId = m.getModuleId();
            Integer batchId = bm.getBatchId();
            Integer bmId = bm.getBatchModuleId();
            Integer linkedBmId = bm.getLinkedBatchModuleId() != null ? bm.getLinkedBatchModuleId() : -1;
            
            try {
                jdbcTemplate.update(
                    "UPDATE timetable_entry te " +
                    "JOIN batch_module bm2 ON te.batch_module_id = bm2.batch_module_id " +
                    "JOIN timetable t ON te.timetable_id = t.timetable_id " +
                    "SET te.slot_id = ?, te.hall_id = ? " +
                    "WHERE (bm2.module_id = ? OR bm2.batch_module_id = ? OR bm2.linked_batch_module_id = ? OR bm2.batch_module_id = ?) AND t.batch_id = ? AND te.slot_id = ?",
                    slot.getSlotId(), targetHallId, moduleId, bmId, bmId, linkedBmId, batchId, oldSlotId
                );
            } catch (Exception e) {
                System.out.println("Sync warning: Could not update linked entries: " + e.getMessage());
                throw new RuntimeException("Failed to sync shared module to other departments due to a clash or conflict: " + e.getMessage());
            }
        } else {
            timetableEntryRepository.save(entry);
        }
        
        return ResponseEntity.ok(Map.of(
            "message", "Timetable entry moved successfully",
            "entryId", entry.getEntryId()
        ));
    }
}