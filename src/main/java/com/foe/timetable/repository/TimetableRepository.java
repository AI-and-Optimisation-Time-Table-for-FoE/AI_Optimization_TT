package com.foe.timetable.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.foe.timetable.model.Timetable;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, Integer> {
    Optional<Timetable> findFirstByBatchIdOrderByGeneratedAtDesc(Integer batchId);
}
