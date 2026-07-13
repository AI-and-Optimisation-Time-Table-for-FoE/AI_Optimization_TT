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

    @Autowired
    private com.foe.timetable.repository.ModuleRepository moduleRepository;

    @Autowired
    private com.foe.timetable.repository.DepartmentRepository departmentRepository;

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
            if (payload.containsKey("lecturerIds")) {
                Object val = payload.get("lecturerIds");
                if (val instanceof java.util.Collection) {
                    java.util.Set<Integer> lecturerIdsSet = new java.util.HashSet<>();
                    for (Object idObj : (java.util.Collection<?>) val) {
                        if (idObj instanceof Number) {
                            lecturerIdsSet.add(((Number) idObj).intValue());
                        }
                    }
                    if (!lecturerIdsSet.isEmpty()) {
                        bm.setLecturerIds(lecturerIdsSet);
                        bm.setLecturerId(lecturerIdsSet.iterator().next());
                    }
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
            if (payload.containsKey("isShared")) {
                Object val = payload.get("isShared");
                if (val instanceof Boolean) {
                    bm.setIsShared((Boolean) val);
                }
            }
            if (payload.containsKey("linkedBatchModuleId")) {
                Object val = payload.get("linkedBatchModuleId");
                if (val == null) {
                    bm.setLinkedBatchModuleId(null);
                } else if (val instanceof Number) {
                    bm.setLinkedBatchModuleId(((Number) val).intValue());
                }
            }
            batchModuleRepository.save(bm);
            return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "Batch module updated successfully"));
        }).orElse(org.springframework.http.ResponseEntity.notFound().build());
    }

    @PostMapping("/{batchId}/modules")
    public org.springframework.http.ResponseEntity<?> addModuleToBatch(
            @PathVariable int batchId,
            @RequestBody java.util.Map<String, Object> payload) {
        
        com.foe.timetable.model.Batch batch = batchRepository.findById(batchId).orElse(null);
        if (batch == null) return org.springframework.http.ResponseEntity.notFound().build();
        
        Integer moduleId = ((Number) payload.get("moduleId")).intValue();
        com.foe.timetable.model.Module module = moduleRepository.findById(moduleId).orElse(null);
        if (module == null) return org.springframework.http.ResponseEntity.notFound().build();
        
        Integer departmentId = null;
        if (payload.containsKey("departmentId") && payload.get("departmentId") != null) {
            departmentId = ((Number) payload.get("departmentId")).intValue();
        }
        
        java.util.Optional<com.foe.timetable.model.BatchModule> existingOpt = batchModuleRepository.findByBatch_BatchId(batchId).stream()
            .filter(bm -> bm.getModule().getModuleId().equals(moduleId))
            .findFirst();
            
        if (existingOpt.isPresent()) {
            com.foe.timetable.model.BatchModule existing = existingOpt.get();
            boolean isISModule = existing.getModule() != null && 
                                 existing.getModule().getDepartment() != null && 
                                 (existing.getModule().getDepartment().getDepartmentId().equals(4) || 
                                  "IS".equals(existing.getModule().getDepartment().getDepartmentCode()));
                                  
            if (isISModule && departmentId != null) {
                String current = existing.getOfferingDeptIds();
                if (current != null && !current.trim().isEmpty()) {
                    java.util.List<String> ids = new java.util.ArrayList<>(java.util.Arrays.asList(current.split(",")));
                    String deptStr = String.valueOf(departmentId);
                    if (!ids.contains(deptStr)) {
                        ids.add(deptStr);
                        existing.setOfferingDeptIds(String.join(",", ids));
                        batchModuleRepository.save(existing);
                        return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "Module assigned to department successfully", "moduleId", module.getModuleId()));
                    } else {
                        return org.springframework.http.ResponseEntity.badRequest().body(java.util.Map.of("message", "Module already assigned to this department"));
                    }
                } else {
                    return org.springframework.http.ResponseEntity.badRequest().body(java.util.Map.of("message", "Module already assigned to all departments"));
                }
            }
            return org.springframework.http.ResponseEntity.badRequest().body(java.util.Map.of("message", "Module already assigned to this batch"));
        }
        
        List<com.foe.timetable.model.Lecturer> lecturers = lecturerRepository.findAll();
        Integer defaultLecturerId = lecturers.isEmpty() ? 1 : lecturers.get(0).getLecturerId();
        
        com.foe.timetable.model.BatchModule bm = new com.foe.timetable.model.BatchModule();
        bm.setBatch(batch);
        bm.setModule(module);
        bm.setLecturerId(defaultLecturerId);
        
        java.util.Set<Integer> set = new java.util.HashSet<>();
        set.add(defaultLecturerId);
        bm.setLecturerIds(set);
        
        bm.setSemester(batch.getSemester());
        bm.setAcademicYear(batch.getAcademicYear());
        batchModuleRepository.save(bm);
        
        return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "Module assigned to batch successfully", "moduleId", module.getModuleId()));
    }

    @DeleteMapping("/{batchId}/modules/{batchModuleId}")
    public org.springframework.http.ResponseEntity<?> removeModuleFromBatch(
            @PathVariable int batchId,
            @PathVariable int batchModuleId,
            @RequestParam(required = false) Integer departmentId) {
        
        com.foe.timetable.model.BatchModule bm = batchModuleRepository.findById(batchModuleId).orElse(null);
        if (bm == null) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
        
        boolean isISModule = bm.getModule() != null && 
                             bm.getModule().getDepartment() != null && 
                             (bm.getModule().getDepartment().getDepartmentId().equals(4) || 
                              "IS".equals(bm.getModule().getDepartment().getDepartmentCode()));
        
        if (isISModule && departmentId != null) {
            List<com.foe.timetable.model.Department> allDepts = departmentRepository.findAll().stream()
                .filter(d -> d.getDepartmentId() != 4) // exclude IS itself
                .toList();
                
            String current = bm.getOfferingDeptIds();
            java.util.List<String> activeDepts = new java.util.ArrayList<>();
            
            if (current == null || current.trim().isEmpty()) {
                // If it was null, it means it was offered by all. 
                // Add all departments except the deleted one.
                for (com.foe.timetable.model.Department d : allDepts) {
                    if (!d.getDepartmentId().equals(departmentId)) {
                        activeDepts.add(String.valueOf(d.getDepartmentId()));
                    }
                }
            } else {
                // Remove the departmentId from the current list
                String[] ids = current.split(",");
                for (String id : ids) {
                    if (!id.trim().equals(String.valueOf(departmentId))) {
                        activeDepts.add(id.trim());
                    }
                }
            }
            
            bm.setOfferingDeptIds(String.join(",", activeDepts));
            batchModuleRepository.save(bm);
            return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "Module excluded from department successfully"));
        }
        
        batchModuleRepository.deleteById(batchModuleId);
        return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "Module removed from batch successfully"));
    }
}
