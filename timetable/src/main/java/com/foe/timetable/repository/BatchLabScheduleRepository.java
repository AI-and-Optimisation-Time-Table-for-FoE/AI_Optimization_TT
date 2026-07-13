package com.foe.timetable.repository;

import com.foe.timetable.model.BatchLabSchedule;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BatchLabScheduleRepository extends JpaRepository<BatchLabSchedule, Integer> {
    List<BatchLabSchedule> findByBatch_BatchId(Integer batchId);
}
