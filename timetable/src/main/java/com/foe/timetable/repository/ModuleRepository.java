package com.foe.timetable.repository; // Lowercase r

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.foe.timetable.model.Module;

@Repository
public interface ModuleRepository extends JpaRepository<Module, Integer> {
    Optional<Module> findByModuleCode(String moduleCode);
    List<Module> findBySemester(Integer semester);
}
