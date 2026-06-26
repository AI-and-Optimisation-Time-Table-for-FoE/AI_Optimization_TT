package com.foe.timetable.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.foe.timetable.model.Batch;
import com.foe.timetable.model.dto.BatchModuleViewDto;
import com.foe.timetable.repository.BatchRepository;
import com.foe.timetable.repository.BatchModuleRepository;
import com.foe.timetable.repository.LecturerRepository;
import com.foe.timetable.repository.HallRepository;
import com.foe.timetable.service.TimetableQueryService;

@RestController
@RequestMapping("/api/batches")
@CrossOrigin(origins = "*")
public class BatchController {

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private TimetableQueryService timetableQueryService;

    @Autowired
    private BatchModuleRepository batchModuleRepository;

    @Autowired
    private LecturerRepository lecturerRepository;

    @Autowired
    private HallRepository hallRepository;

    @GetMapping
    public List<Batch> getAllBatches() {
        return batchRepository.findAll();
    }
    @GetMapping("/{batchId}/modules")
    public List<BatchModuleViewDto> getBatchModules(
            @PathVariable int batchId,
            @RequestParam(required = false) Integer departmentId) {
        return timetableQueryService.getBatchModules(batchId, departmentId);
    }
    @PostMapping
    public Batch createBatch(@RequestBody Batch batch) {
        if (batch.getCreatedAt() == null) {
            batch.setCreatedAt(java.time.LocalDateTime.now());
        }
        return batchRepository.save(batch);
    }

    @PutMapping("/{id}")
    public org.springframework.http.ResponseEntity<Batch> updateBatch(@PathVariable int id, @RequestBody Batch batchDetails) {
        return batchRepository.findById(id).map(batch -> {
            batch.setBatchName(batchDetails.getBatchName());
            batch.setAcademicYear(batchDetails.getAcademicYear());
            batch.setSemester(batchDetails.getSemester());
            batch.setStudentCount(batchDetails.getStudentCount());
            batch.setStatus(batchDetails.getStatus());
            batch.setLunchStartTime(batchDetails.getLunchStartTime());
            batch.setLunchEndTime(batchDetails.getLunchEndTime());
            return org.springframework.http.ResponseEntity.ok(batchRepository.save(batch));
        }).orElse(org.springframework.http.ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<?> deleteBatch(@PathVariable int id) {
        if (!batchRepository.existsById(id)) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
        batchRepository.deleteById(id);
        return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "Batch deleted successfully"));
    }

    @PutMapping("/modules/{batchModuleId}")
    public org.springframework.http.ResponseEntity<?> updateBatchModule(
            @PathVariable int batchModuleId,
            @RequestBody java.util.Map<String, Object> payload) {
        
        return batchModuleRepository.findById(batchModuleId).map(bm -> {
            if (payload.containsKey("lecturerId")) {
                Object val = payload.get("lecturerId");
                if (val != null) {
                    bm.setLecturerId(((Number) val).intValue());
                }
            }
            if (payload.containsKey("preferredHallId")) {
                Object val = payload.get("preferredHallId");
                if (val == null) {
                    bm.setPreferredHall(null);
                } else {
                    Integer hallId = ((Number) val).intValue();
                    com.foe.timetable.model.Hall hall = hallRepository.findById(hallId).orElse(null);
                    bm.setPreferredHall(hall);
                }
            }
            batchModuleRepository.save(bm);
            return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "Batch module updated successfully"));
        }).orElse(org.springframework.http.ResponseEntity.notFound().build());
    }
}
