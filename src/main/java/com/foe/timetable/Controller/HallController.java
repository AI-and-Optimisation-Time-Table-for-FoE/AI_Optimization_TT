package com.foe.timetable.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
