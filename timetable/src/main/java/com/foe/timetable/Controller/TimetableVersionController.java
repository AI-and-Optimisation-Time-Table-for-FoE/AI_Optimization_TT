package com.foe.timetable.Controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.foe.timetable.model.Batch;
import com.foe.timetable.model.Timetable;
import com.foe.timetable.repository.BatchRepository;
import com.foe.timetable.repository.TimetableEntryRepository;
import com.foe.timetable.repository.TimetableRepository;

@RestController
@RequestMapping("/api/timetable/versions")
@CrossOrigin(origins = "*")
public class TimetableVersionController {

    @Autowired
    private TimetableRepository timetableRepository;

    @Autowired
    private TimetableEntryRepository timetableEntryRepository;

    @Autowired
    private BatchRepository batchRepository;

    @GetMapping
    public ResponseEntity<List<Timetable>> getVersions(
            @RequestParam Integer batchId,
            @RequestParam(required = false) Integer departmentId) {
        Batch batch = batchRepository.findById(batchId).orElse(null);
        List<Timetable> versions;
        if (batch != null && batch.getSemester() >= 3 && departmentId != null) {
            versions = timetableRepository.findByBatchIdAndDepartmentIdOrderByGeneratedAtDesc(batchId, departmentId);
        } else {
            versions = timetableRepository.findByBatchIdAndDepartmentIdIsNullOrderByGeneratedAtDesc(batchId);
        }
        return ResponseEntity.ok(versions);
    }

    @PostMapping("/publish")
    @Transactional
    public ResponseEntity<?> publishVersion(@RequestBody Map<String, Object> payload) {
        Number timetableIdNum = (Number) payload.get("timetableId");
        if (timetableIdNum == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "timetableId is required"));
        }
        int timetableId = timetableIdNum.intValue();

        Optional<Timetable> targetOpt = timetableRepository.findById(timetableId);
        if (targetOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Timetable not found"));
        }

        Timetable target = targetOpt.get();
        Integer batchId = target.getBatchId();
        Integer departmentId = target.getDepartmentId();

        // Load all timetables for this batch and department
        List<Timetable> siblings;
        if (departmentId != null) {
            siblings = timetableRepository.findByBatchIdAndDepartmentIdOrderByGeneratedAtDesc(batchId, departmentId);
        } else {
            siblings = timetableRepository.findByBatchIdAndDepartmentIdIsNullOrderByGeneratedAtDesc(batchId);
        }

        for (Timetable sibling : siblings) {
            if (sibling.getTimetableId().equals(timetableId)) {
                sibling.setStatus("active");
                sibling.setPublishedAt(java.time.LocalDateTime.now());
            } else if ("active".equalsIgnoreCase(sibling.getStatus())) {
                sibling.setStatus("draft");
            }
            timetableRepository.save(sibling);
        }

        return ResponseEntity.ok(Map.of(
            "message", "Timetable version published successfully!",
            "timetableId", timetableId,
            "status", "active"
        ));
    }

    @DeleteMapping("/{timetableId}")
    @Transactional
    public ResponseEntity<?> deleteVersion(@PathVariable Integer timetableId) {
        Optional<Timetable> targetOpt = timetableRepository.findById(timetableId);
        if (targetOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Timetable version not found"));
        }

        Timetable target = targetOpt.get();
        if ("active".equalsIgnoreCase(target.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot delete an active/published timetable version. Please publish another version first."));
        }

        // Delete entries first, then delete version
        timetableEntryRepository.deleteByTimetableId(timetableId);
        timetableRepository.delete(target);

        return ResponseEntity.ok(Map.of("message", "Timetable version and its assignments deleted successfully."));
    }

    @PostMapping("/publish-semester")
    @Transactional
    public ResponseEntity<?> publishSemester(@RequestBody Map<String, Object> payload) {
        Number semesterNum = (Number) payload.get("semester");
        if (semesterNum == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "semester is required"));
        }
        int semester = semesterNum.intValue();

        // Find all batches belonging to this semester
        List<Batch> batches = batchRepository.findAll().stream()
            .filter(b -> b.getSemester() != null && b.getSemester() == semester)
            .toList();

        if (batches.isEmpty()) {
            return ResponseEntity.ok(Map.of("message", "No batches found for Semester " + semester));
        }

        int publishedCount = 0;
        for (Batch batch : batches) {
            // Find latest generated timetable version for this batch
            Optional<Timetable> latestOpt = timetableRepository.findFirstByBatchIdOrderByGeneratedAtDesc(batch.getBatchId());
            if (latestOpt.isPresent()) {
                Timetable latest = latestOpt.get();
                // Set as active, deactivate others
                List<Timetable> siblings = timetableRepository.findByBatchIdOrderByGeneratedAtDesc(batch.getBatchId());
                for (Timetable sibling : siblings) {
                    if (sibling.getTimetableId().equals(latest.getTimetableId())) {
                        sibling.setStatus("active");
                    } else if ("active".equalsIgnoreCase(sibling.getStatus())) {
                        sibling.setStatus("draft");
                    }
                    timetableRepository.save(sibling);
                }
                publishedCount++;
            }
        }

        return ResponseEntity.ok(Map.of(
            "message", "Successfully bulk-published " + publishedCount + " batches for Semester " + semester + "."
        ));
    }
}
