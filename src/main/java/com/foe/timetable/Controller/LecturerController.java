package com.foe.timetable.Controller; // Changed to lowercase 'c' to match standard conventions

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.foe.timetable.model.Lecturer;
import com.foe.timetable.repository.LecturerRepository;

@RestController
@RequestMapping("/api/lecturers")
@CrossOrigin(origins = "*")
public class LecturerController {

    @Autowired
    private LecturerRepository lecturerRepository;

    @GetMapping
    public List<Lecturer> getAllLecturers() {
        return lecturerRepository.findAll();
    }

    @PostMapping
    public Lecturer createLecturer(@RequestBody Lecturer lecturer) {
        return lecturerRepository.save(lecturer);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Lecturer> updateLecturer(@PathVariable int id, @RequestBody Lecturer lecturerDetails) {
        return lecturerRepository.findById(id).map(lecturer -> {
            lecturer.setName(lecturerDetails.getName());
            lecturer.setEmail(lecturerDetails.getEmail());
            lecturer.setMaxHoursPerWeek(lecturerDetails.getMaxHoursPerWeek());
            lecturer.setSpecialization(lecturerDetails.getSpecialization());
            lecturer.setUniversityAddress(lecturerDetails.getUniversityAddress());
            lecturer.setPhoneNumber(lecturerDetails.getPhoneNumber());
            if (lecturerDetails.getDepartment() != null) {
                lecturer.setDepartment(lecturerDetails.getDepartment());
            }
            return ResponseEntity.ok(lecturerRepository.save(lecturer));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLecturer(@PathVariable int id) {
        if (!lecturerRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        lecturerRepository.deleteById(id);
        return ResponseEntity.ok(java.util.Map.of("message", "Lecturer deleted successfully"));
    }
}