package com.foe.timetable.Controller;

import com.foe.timetable.model.*;
import com.foe.timetable.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/student-enrollments")
@CrossOrigin(origins = "*")
public class StudentEnrollmentController {

    @Autowired
    private StudentModuleEnrollmentRepository enrollmentRepository;

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    // Get all enrollments for a batch
    @GetMapping("/batch/{batchId}")
    public ResponseEntity<?> getEnrollmentsByBatch(@PathVariable Integer batchId) {
        List<StudentModuleEnrollment> list = enrollmentRepository.findByBatch_BatchId(batchId);
        return ResponseEntity.ok(list);
    }

    // Get personalized enrolled modules for a specific student (by Reg No or Email)
    @GetMapping("/student")
    public ResponseEntity<?> getStudentPersonalizedEnrollments(@RequestParam String identifier) {
        if (identifier == null || identifier.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Student identifier is required"));
        }
        List<StudentModuleEnrollment> enrollments = enrollmentRepository.findByIdentifier(identifier.trim());
        return ResponseEntity.ok(enrollments);
    }

    // Batch Import / MIS Sync API (Accepts JSON list from MIS or CSV upload)
    @PostMapping("/sync")
    @Transactional
    public ResponseEntity<?> syncEnrollmentsFromMIS(@RequestBody Map<String, Object> payload) {
        Number batchIdNum = (Number) payload.get("batchId");
        List<Map<String, Object>> records = (List<Map<String, Object>>) payload.get("records");

        if (batchIdNum == null || records == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "batchId and records are required"));
        }

        Batch batch = batchRepository.findById(batchIdNum.intValue()).orElse(null);
        if (batch == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Batch not found"));
        }

        // Cache all modules for fast lookup by code
        Map<String, com.foe.timetable.model.Module> moduleCodeMap = moduleRepository.findAll().stream()
                .collect(Collectors.toMap(m -> m.getModuleCode().toUpperCase().trim(), m -> m, (a, b) -> a));

        List<StudentModuleEnrollment> toSave = new ArrayList<>();
        int importedCount = 0;
        int skippedCount = 0;

        for (Map<String, Object> row : records) {
            String studentRegNo = (String) row.get("studentRegNo");
            String studentEmail = (String) row.get("studentEmail");
            String moduleCode = (String) row.get("moduleCode");
            String typeStr = (String) row.getOrDefault("enrollmentType", "regular");
            String academicYear = (String) row.getOrDefault("academicYear", String.valueOf(batch.getAcademicYear()));

            if (studentRegNo == null || moduleCode == null) {
                skippedCount++;
                continue;
            }

            com.foe.timetable.model.Module mod = moduleCodeMap.get(moduleCode.toUpperCase().trim());
            if (mod == null) {
                skippedCount++;
                continue;
            }

            StudentModuleEnrollment.EnrollmentType type;
            try {
                type = StudentModuleEnrollment.EnrollmentType.valueOf(typeStr.toLowerCase().trim());
            } catch (Exception e) {
                type = StudentModuleEnrollment.EnrollmentType.regular;
            }

            StudentModuleEnrollment enrollment = new StudentModuleEnrollment(
                    studentRegNo.trim(),
                    studentEmail != null ? studentEmail.trim() : null,
                    batch,
                    mod,
                    type,
                    academicYear
            );
            toSave.add(enrollment);
            importedCount++;
        }

        if (!toSave.isEmpty()) {
            enrollmentRepository.saveAll(toSave);
        }

        return ResponseEntity.ok(Map.of(
                "message", "MIS enrollments synchronized successfully!",
                "importedCount", importedCount,
                "skippedCount", skippedCount
        ));
    }

    // Clear batch enrollments
    @DeleteMapping("/batch/{batchId}")
    @Transactional
    public ResponseEntity<?> clearBatchEnrollments(@PathVariable Integer batchId) {
        enrollmentRepository.deleteByBatch_BatchId(batchId);
        return ResponseEntity.ok(Map.of("message", "Batch enrollments cleared successfully."));
    }
}
