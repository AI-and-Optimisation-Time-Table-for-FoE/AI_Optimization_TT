package com.foe.timetable.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.foe.timetable.model.ExamHallUnavailability;

@Repository
public interface ExamHallUnavailabilityRepository extends JpaRepository<ExamHallUnavailability, Integer> {
    List<ExamHallUnavailability> findByHall_HallId(Integer hallId);
}
