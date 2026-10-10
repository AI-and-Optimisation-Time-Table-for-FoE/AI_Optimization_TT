package com.foe.timetable.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.foe.timetable.model.Timetable;

import java.util.List;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, Integer> {
    Optional<Timetable> findFirstByBatchIdOrderByGeneratedAtDesc(Integer batchId);
    List<Timetable> findByBatchIdAndDepartmentIdOrderByGeneratedAtDesc(Integer batchId, Integer departmentId);
    List<Timetable> findByBatchIdAndDepartmentIdIsNullOrderByGeneratedAtDesc(Integer batchId);
    List<Timetable> findByBatchIdOrderByGeneratedAtDesc(Integer batchId);
}
