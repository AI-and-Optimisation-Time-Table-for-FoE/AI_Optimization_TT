package com.foe.timetable.Controller; // Changed to lowercase 'c' to match standard conventions

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
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
}