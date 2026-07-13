package com.foe.timetable.Controller;

import com.foe.timetable.model.Batch;
import com.foe.timetable.model.BatchLabSchedule;
import com.foe.timetable.repository.BatchLabScheduleRepository;
import com.foe.timetable.repository.BatchRepository;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lab-schedules")
@CrossOrigin(origins = "*")
public class BatchLabScheduleController {

    @Autowired
    private BatchLabScheduleRepository batchLabScheduleRepository;

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private com.foe.timetable.repository.DepartmentRepository departmentRepository;

    @GetMapping
    public List<BatchLabSchedule> getAllLabSchedules() {
        return batchLabScheduleRepository.findAll();
    }

    @GetMapping("/batch/{batchId}")
    public List<BatchLabSchedule> getByBatch(@PathVariable int batchId) {
        return batchLabScheduleRepository.findByBatch_BatchId(batchId);
    }

    @PostMapping
    public ResponseEntity<?> createLabSchedule(@RequestBody Map<String, Object> payload) {
        try {
            Number batchIdNum = (Number) payload.get("batchId");
            String dayOfWeek = (String) payload.get("dayOfWeek");
            String startTime = (String) payload.get("startTime");
            String endTime = (String) payload.get("endTime");

            if (batchIdNum == null || dayOfWeek == null || startTime == null || endTime == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "batchId, dayOfWeek, startTime, and endTime are required"));
            }

            Batch batch = batchRepository.findById(batchIdNum.intValue())
                .orElseThrow(() -> new RuntimeException("Batch not found with ID: " + batchIdNum));

            Number departmentIdNum = (Number) payload.get("departmentId");

            BatchLabSchedule schedule = new BatchLabSchedule();
            schedule.setBatch(batch);
            schedule.setDayOfWeek(dayOfWeek);
            schedule.setStartTime(startTime);
            schedule.setEndTime(endTime);

            if (departmentIdNum != null) {
                com.foe.timetable.model.Department department = departmentRepository.findById(departmentIdNum.intValue()).orElse(null);
                schedule.setDepartment(department);
            }

            return ResponseEntity.ok(batchLabScheduleRepository.save(schedule));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Error creating lab schedule"));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLabSchedule(@PathVariable int id) {
        if (!batchLabScheduleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        batchLabScheduleRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Lab schedule deleted successfully"));
    }
}
