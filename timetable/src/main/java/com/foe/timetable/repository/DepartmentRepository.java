package com.foe.timetable.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.foe.timetable.model.Department;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Integer> {
}
