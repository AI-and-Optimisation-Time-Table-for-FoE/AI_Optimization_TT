package com.foe.timetable.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.foe.timetable.model.TimeSlot;
import com.foe.timetable.repository.TimeSlotRepository;

@RestController
@RequestMapping("/api/timeslots")
@CrossOrigin(origins = "*")
public class TimeSlotController {

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    @GetMapping
    public List<TimeSlot> getAllTimeSlots() {
        return timeSlotRepository.findAll();
    }

    @PostMapping
    public TimeSlot createTimeSlot(@RequestBody TimeSlot timeSlot) {
        return timeSlotRepository.save(timeSlot);
    }

    @PutMapping("/{id}")
    public org.springframework.http.ResponseEntity<TimeSlot> updateTimeSlot(@PathVariable int id, @RequestBody TimeSlot timeSlotDetails) {
        return timeSlotRepository.findById(id).map(timeSlot -> {
            timeSlot.setDayOfWeek(timeSlotDetails.getDayOfWeek());
            timeSlot.setStartTime(timeSlotDetails.getStartTime());
            timeSlot.setEndTime(timeSlotDetails.getEndTime());
            return org.springframework.http.ResponseEntity.ok(timeSlotRepository.save(timeSlot));
        }).orElse(org.springframework.http.ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<?> deleteTimeSlot(@PathVariable int id) {
        if (!timeSlotRepository.existsById(id)) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
        timeSlotRepository.deleteById(id);
        return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "TimeSlot deleted successfully"));
    }
}