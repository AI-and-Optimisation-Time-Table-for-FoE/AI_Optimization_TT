package com.foe.timetable.repository; // Lowercase r

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.foe.timetable.model.Hall;

@Repository
public interface HallRepository extends JpaRepository<Hall, Integer> {
    List<Hall> findByHallTypeAndIsActiveTrue(Hall.HallType hallType);
    List<Hall> findByIsActiveTrue();
}
