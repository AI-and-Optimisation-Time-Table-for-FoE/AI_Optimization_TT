package com.foe.timetable.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foe.timetable.repository.ModuleRepository;

@RestController
@RequestMapping("/api/modules")
@CrossOrigin(origins = "*")
public class ModuleController {

    @Autowired
    private ModuleRepository moduleRepository;

    @GetMapping
    public List<com.foe.timetable.model.Module> getAllModules() {
        // Explicitly defining the target type as a local variable 
        // completely forces the Java 21 compiler to resolve it to your entity
        List<com.foe.timetable.model.Module> modules = moduleRepository.findAll();
        return modules;
    }
}
