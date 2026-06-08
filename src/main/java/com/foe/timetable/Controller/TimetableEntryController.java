package com.foe.timetable.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foe.timetable.model.TimetableEntry;
import com.foe.timetable.repository.TimetableEntryRepository;

@RestController
@RequestMapping("/api/timetable")
@CrossOrigin(origins = "*")
public class TimetableEntryController {

    @Autowired
    private TimetableEntryRepository timetableEntryRepository;

    // 1. Get the final schedule to draw your admin calendar view
    @GetMapping
    public List<TimetableEntry> getCompleteTimetable() {
        return timetableEntryRepository.findAll();
    }

    // 2. Clear out the database table before running a new generation run
    @DeleteMapping("/clear")
    public String clearTimetable() {
        timetableEntryRepository.deleteAll();
        return "Timetable cleared successfully!";
    }
}
