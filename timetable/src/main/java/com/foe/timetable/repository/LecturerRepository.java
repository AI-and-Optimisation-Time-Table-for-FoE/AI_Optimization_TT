package com.foe.timetable.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.foe.timetable.model.Lecturer;

@Repository
public interface LecturerRepository extends JpaRepository<Lecturer, Integer> {
    
    // Correct Spring Data JPA property path derivation
    List<Lecturer> findByDepartment_DepartmentId(Integer departmentId);
    
    java.util.Optional<Lecturer> findByUserAccount_UserId(Integer userId);
}