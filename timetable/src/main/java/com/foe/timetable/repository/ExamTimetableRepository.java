package com.foe.timetable.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.foe.timetable.model.ExamTimetable;

@Repository
public interface ExamTimetableRepository extends JpaRepository<ExamTimetable, Integer> {
    List<ExamTimetable> findByBatch_BatchIdOrderByCreatedAtDesc(Integer batchId);
    Optional<ExamTimetable> findFirstByBatch_BatchIdAndStatusOrderByCreatedAtDesc(Integer batchId, String status);
}
