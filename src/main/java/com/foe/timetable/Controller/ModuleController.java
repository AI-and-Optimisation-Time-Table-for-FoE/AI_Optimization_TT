package com.foe.timetable.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

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

    @PostMapping
    public com.foe.timetable.model.Module createModule(@RequestBody com.foe.timetable.model.Module module) {
        return moduleRepository.save(module);
    }

    @PutMapping("/{id}")
    public org.springframework.http.ResponseEntity<com.foe.timetable.model.Module> updateModule(@PathVariable int id, @RequestBody com.foe.timetable.model.Module moduleDetails) {
        return moduleRepository.findById(id).map(module -> {
            module.setModuleCode(moduleDetails.getModuleCode());
            module.setModuleName(moduleDetails.getModuleName());
            module.setLectureHoursPerWeek(moduleDetails.getLectureHoursPerWeek());
            module.setLabHoursPerWeek(moduleDetails.getLabHoursPerWeek());
            if (moduleDetails.getDepartment() != null) {
                module.setDepartment(moduleDetails.getDepartment());
            }
            return org.springframework.http.ResponseEntity.ok(moduleRepository.save(module));
        }).orElse(org.springframework.http.ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<?> deleteModule(@PathVariable int id) {
        if (!moduleRepository.existsById(id)) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
        moduleRepository.deleteById(id);
        return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "Module deleted successfully"));
    }
}
