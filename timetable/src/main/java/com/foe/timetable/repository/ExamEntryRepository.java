package com.foe.timetable.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.foe.timetable.model.ExamEntry;

@Repository
public interface ExamEntryRepository extends JpaRepository<ExamEntry, Integer> {
    List<ExamEntry> findByExamTimetable_ExamTimetableIdOrderByExamDateAscStartTimeAsc(Integer examTimetableId);
    void deleteByExamTimetable_ExamTimetableId(Integer examTimetableId);
}
