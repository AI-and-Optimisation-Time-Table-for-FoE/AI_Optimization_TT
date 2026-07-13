package com.foe.timetable.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.foe.timetable.model.BatchModule;

@Repository
public interface BatchModuleRepository extends JpaRepository<BatchModule, Integer> {
    
    // THE FIX: Ensure this exact method exists.
    // Spring Data JPA uses underscores to traverse relationship paths.
    List<BatchModule> findByBatch_BatchId(Integer batchId);
    
    // Your semester filter
    List<BatchModule> findBySemester(Integer semester);

    @org.springframework.data.jpa.repository.Query(
        "SELECT bm FROM BatchModule bm " +
        "LEFT JOIN bm.lecturerIds lId " +
        "WHERE bm.lecturerId = :lecturerId OR lId = :lecturerId"
    )
    List<BatchModule> findByLecturerId(@org.springframework.data.repository.query.Param("lecturerId") Integer lecturerId);
}
