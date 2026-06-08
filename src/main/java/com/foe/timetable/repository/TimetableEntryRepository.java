package com.foe.timetable.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.foe.timetable.model.TimetableEntry;

@Repository
public interface TimetableEntryRepository extends JpaRepository<TimetableEntry, Integer> {
    // This will allow the front-end to pull the final generated schedule cleanly
}
