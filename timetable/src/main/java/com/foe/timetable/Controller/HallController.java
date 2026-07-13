package com.foe.timetable.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.foe.timetable.model.Hall;
import com.foe.timetable.repository.HallRepository;

@RestController
@RequestMapping("/api/halls")
@CrossOrigin(origins = "*")
public class HallController {

    @Autowired
    private HallRepository hallRepository;

    @GetMapping
    public List<Hall> getAllHalls() {
        return hallRepository.findAll();
    }

    @PostMapping
    public Hall createHall(@RequestBody Hall hall) {
        return hallRepository.save(hall);
    }

    @PutMapping("/{id}")
    public org.springframework.http.ResponseEntity<Hall> updateHall(@PathVariable int id, @RequestBody Hall hallDetails) {
        return hallRepository.findById(id).map(hall -> {
            hall.setHallName(hallDetails.getHallName());
            hall.setCapacity(hallDetails.getCapacity());
            hall.setHallType(hallDetails.getHallType());
            hall.setIsActive(hallDetails.getIsActive());
            return org.springframework.http.ResponseEntity.ok(hallRepository.save(hall));
        }).orElse(org.springframework.http.ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<?> deleteHall(@PathVariable int id) {
        if (!hallRepository.existsById(id)) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
        hallRepository.deleteById(id);
        return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "Hall deleted successfully"));
    }
}
