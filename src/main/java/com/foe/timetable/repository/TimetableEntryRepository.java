/*package com.foe.timetable.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.foe.timetable.model.TimetableEntry;

@Repository
public interface TimetableEntryRepository extends JpaRepository<TimetableEntry, Integer> {
    
    // Traces timetable_entry -> batch_module -> module to filter by semester
    @Query(value = "SELECT te.* FROM timetable_entry te " +
                   "JOIN batch_module bm ON te.batch_module_id = bm.batch_module_id " +
                   "JOIN module m ON bm.module_id = m.module_id " +
                   "WHERE m.semester = :semester",
           nativeQuery = true)
    List<TimetableEntry> findMasterScheduleBySemester(@Param("semester") int semester);

    @Query(value = "SELECT te.* FROM timetable_entry te " +
                   "JOIN batch_module bm ON te.batch_module_id = bm.batch_module_id " +
                   "WHERE bm.batch_id = :batchId",
           nativeQuery = true)
    List<TimetableEntry> findByBatchId(@Param("batchId") int batchId);

    @Modifying
    @Transactional
    @Query("DELETE FROM TimetableEntry te WHERE te.timetableId = :timetableId")
    void deleteByTimetableId(@Param("timetableId") Integer timetableId);
}*/


/*package com.foe.timetable.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.foe.timetable.model.TimetableEntry;

@Repository
public interface TimetableEntryRepository extends JpaRepository<TimetableEntry, Integer> {

    // 1. ADD THIS METHOD: Fetches all entries for the whole week
    // We use JOIN FETCH to load the relationships in one go for efficiency
    @Query("SELECT te FROM TimetableEntry te " +
           "JOIN FETCH te.batchModule bm " +
           "JOIN FETCH bm.module m " +
           "JOIN FETCH te.timeSlot ts " +
           "ORDER BY CASE ts.dayOfWeek " +
           "WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 " +
           "WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 ELSE 6 END, ts.startTime")
    List<TimetableEntry> findAllForWeek();

    // Existing methods
    @Query(value = "SELECT te.* FROM timetable_entry te " +
                   "JOIN batch_module bm ON te.batch_module_id = bm.batch_module_id " +
                   "JOIN module m ON bm.module_id = m.module_id " +
                   "WHERE m.semester = :semester", nativeQuery = true)
    List<TimetableEntry> findMasterScheduleBySemester(@Param("semester") int semester);

    @Query(value = "SELECT te.* FROM timetable_entry te " +
                   "JOIN batch_module bm ON te.batch_module_id = bm.batch_module_id " +
                   "WHERE bm.batch_id = :batchId", nativeQuery = true)
    List<TimetableEntry> findByBatchId(@Param("batchId") int batchId);

    @Modifying
    @Transactional
    @Query("DELETE FROM TimetableEntry te WHERE te.timetableId = :timetableId")
    void deleteByTimetableId(@Param("timetableId") Integer timetableId);*/

    package com.foe.timetable.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.foe.timetable.model.TimetableEntry;

@Repository
public interface TimetableEntryRepository extends JpaRepository<TimetableEntry, Integer> {

    // --- ADD THIS CODE BELOW ---
    @Query("SELECT te FROM TimetableEntry te " +
           "JOIN FETCH te.batchModule bm " +
           "JOIN FETCH bm.module m " +
           "JOIN FETCH te.timeSlot ts " +
           "ORDER BY CASE ts.dayOfWeek " +
           "WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 " +
           "WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 END, ts.startTime")
    List<TimetableEntry> findAllForWeek();
    // ---------------------------

    // Keep your existing methods here
    @Query(value = "SELECT te.* FROM timetable_entry te " +
                   "JOIN batch_module bm ON te.batch_module_id = bm.batch_module_id " +
                   "JOIN module m ON bm.module_id = m.module_id " +
                   "WHERE m.semester = :semester", nativeQuery = true)
    List<TimetableEntry> findMasterScheduleBySemester(@Param("semester") int semester);

    @Query(value = "SELECT te.* FROM timetable_entry te " +
                   "JOIN batch_module bm ON te.batch_module_id = bm.batch_module_id " +
                   "WHERE bm.batch_id = :batchId", nativeQuery = true)
    List<TimetableEntry> findByBatchId(@Param("batchId") int batchId);

    @Query(value = "SELECT te.* FROM timetable_entry te " +
                   "JOIN batch_module bm ON te.batch_module_id = bm.batch_module_id " +
                   "WHERE bm.lecturer_id = :lecturerId", nativeQuery = true)
    List<TimetableEntry> findByLecturerId(@Param("lecturerId") int lecturerId);

    @Modifying
    @Transactional
    @Query("DELETE FROM TimetableEntry te WHERE te.timetableId = :timetableId")
    void deleteByTimetableId(@Param("timetableId") Integer timetableId);

    @Modifying
    @Transactional
    @Query(value = "DELETE te FROM timetable_entry te " +
                   "JOIN batch_module bm ON te.batch_module_id = bm.batch_module_id " +
                   "JOIN module m ON bm.module_id = m.module_id " +
                   "WHERE te.timetable_id = :timetableId AND m.department_id = :departmentId", nativeQuery = true)
    void deleteByTimetableIdAndDepartmentId(@Param("timetableId") Integer timetableId, @Param("departmentId") Integer departmentId);
}
