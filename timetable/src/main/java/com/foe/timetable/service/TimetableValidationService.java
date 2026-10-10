package com.foe.timetable.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import com.foe.timetable.model.TimetableEntry;
import com.foe.timetable.repository.TimetableEntryRepository;

@Service
public class TimetableValidationService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private TimetableEntryRepository entryRepository;

    public String validateManualMove(Integer entryId, String newDayOfWeek, String newStartTime, String newEndTime, Integer newVenueId) {
        TimetableEntry entry = entryRepository.findById(entryId).orElse(null);
        if (entry == null) return "Entry not found";

        Integer lecturerId = entry.getBatchModule().getLecturerId();
        Integer hallId = newVenueId != null ? newVenueId : (entry.getHall() != null ? entry.getHall().getHallId() : null);
        
        Integer currentTtId = entry.getTimetableId();
        Integer excludeTtId = -1;
        if (currentTtId != null) {
            String q1 = "SELECT batch_id, department_id, status FROM timetable WHERE timetable_id = ?";
            List<java.util.Map<String, Object>> ttProps = jdbcTemplate.queryForList(q1, currentTtId);
            if (!ttProps.isEmpty()) {
                java.util.Map<String, Object> props = ttProps.get(0);
                String status = (String) props.get("status");
                Integer batchId = (Integer) props.get("batch_id");
                Integer deptId = (Integer) props.get("department_id");
                
                if (!"active".equalsIgnoreCase(status)) {
                    String q2 = "SELECT timetable_id FROM timetable WHERE status = 'active' AND batch_id = ?";
                    if (deptId != null) {
                        q2 += " AND department_id = " + deptId;
                    } else {
                        q2 += " AND department_id IS NULL";
                    }
                    List<Integer> ids = jdbcTemplate.queryForList(q2, Integer.class, batchId);
                    if (!ids.isEmpty()) {
                        excludeTtId = ids.get(0);
                    }
                }
            }
        }
        
        // Normalize times to HH:MM format for string comparison in SQL if needed, but SQL usually handles time properly
        // Assuming DB format is TIME or String
        
        com.foe.timetable.model.BatchModule bm = entry.getBatchModule();
        boolean isShared = (bm.getIsShared() != null && bm.getIsShared()) || 
                           (bm.getModule().getDepartment() != null && bm.getModule().getDepartment().getDepartmentId().equals(4)) ||
                           (bm.getModule().getDepartment() != null && "IS".equals(bm.getModule().getDepartment().getDepartmentCode()));

        // 1. Check Batch Clash
        List<String> batchClashes;
        if (isShared) {
            String batchQuery = "SELECT DISTINCT m.module_code FROM timetable_entry te " +
                                "JOIN batch_module bm2 ON te.batch_module_id = bm2.batch_module_id " +
                                "JOIN module m ON bm2.module_id = m.module_id " +
                                "JOIN timetable t ON te.timetable_id = t.timetable_id " +
                                "JOIN time_slot ts ON te.slot_id = ts.slot_id " +
                                "WHERE t.batch_id = ? AND ts.day_of_week = ? AND te.entry_id != ? " +
                                "AND ts.start_time < CAST(? AS time) AND ts.end_time > CAST(? AS time)";
            batchClashes = jdbcTemplate.queryForList(batchQuery, String.class, bm.getBatchId(), newDayOfWeek, entryId, newEndTime, newStartTime);
        } else {
            String batchQuery = "SELECT m.module_code FROM timetable_entry te " +
                                "JOIN batch_module bm2 ON te.batch_module_id = bm2.batch_module_id " +
                                "JOIN module m ON bm2.module_id = m.module_id " +
                                "JOIN time_slot ts ON te.slot_id = ts.slot_id " +
                                "WHERE te.timetable_id = ? AND ts.day_of_week = ? AND te.entry_id != ? " +
                                "AND ts.start_time < CAST(? AS time) AND ts.end_time > CAST(? AS time)";
            batchClashes = jdbcTemplate.queryForList(batchQuery, String.class, entry.getTimetableId(), newDayOfWeek, entryId, newEndTime, newStartTime);
        }
        if (!batchClashes.isEmpty()) {
            return "Batch clash: The students are already scheduled for " + batchClashes.get(0) + " at this time.";
        }

        // 3. Check Venue Clash
        if (hallId != null) {
            List<String> hallClashes;
            if (isShared) {
                String hallQuery = "SELECT DISTINCT m.module_code FROM timetable_entry te " +
                                   "JOIN batch_module bm2 ON te.batch_module_id = bm2.batch_module_id " +
                                   "JOIN module m ON bm2.module_id = m.module_id " +
                                   "JOIN timetable t ON te.timetable_id = t.timetable_id " +
                                   "JOIN time_slot ts ON te.slot_id = ts.slot_id " +
                                   "WHERE te.hall_id = ? AND ts.day_of_week = ? AND te.entry_id != ? " +
                                   "AND t.batch_id = ? " +
                                   "AND ts.start_time < CAST(? AS time) AND ts.end_time > CAST(? AS time)";
                hallClashes = jdbcTemplate.queryForList(hallQuery, String.class, hallId, newDayOfWeek, entryId, bm.getBatchId(), newEndTime, newStartTime);
            } else {
                String hallQuery = "SELECT m.module_code FROM timetable_entry te " +
                                   "JOIN batch_module bm2 ON te.batch_module_id = bm2.batch_module_id " +
                                   "JOIN module m ON bm2.module_id = m.module_id " +
                                   "JOIN time_slot ts ON te.slot_id = ts.slot_id " +
                                   "WHERE te.hall_id = ? AND ts.day_of_week = ? AND te.entry_id != ? " +
                                   "AND te.timetable_id = ? " +
                                   "AND ts.start_time < CAST(? AS time) AND ts.end_time > CAST(? AS time)";
                hallClashes = jdbcTemplate.queryForList(hallQuery, String.class, hallId, newDayOfWeek, entryId, entry.getTimetableId(), newEndTime, newStartTime);
            }
            if (!hallClashes.isEmpty()) {
                return "Venue clash: The venue is already booked for " + hallClashes.get(0) + " at this time.";
            }
        } // 2. Check Lecturer Clash (across active timetables + this timetable)
        if (lecturerId != null) {
            String lecQuery = "SELECT DISTINCT m.module_code FROM timetable_entry te " +
                              "JOIN batch_module bm ON te.batch_module_id = bm.batch_module_id " +
                              "JOIN module m ON bm.module_id = m.module_id " +
                              "JOIN timetable t ON te.timetable_id = t.timetable_id " +
                              "JOIN time_slot ts ON te.slot_id = ts.slot_id " +
                              "LEFT JOIN batch_module_lecturer bml ON bm.batch_module_id = bml.batch_module_id " +
                              "WHERE (bm.lecturer_id = ? OR bml.lecturer_id = ?) AND ts.day_of_week = ? AND te.entry_id != ? " +
                              "AND ts.start_time < CAST(? AS time) AND ts.end_time > CAST(? AS time) " +
                              "AND (t.status = 'active' OR t.timetable_id = ?) AND t.timetable_id != ?";
            List<String> lecClashes = jdbcTemplate.queryForList(lecQuery, String.class, lecturerId, lecturerId, newDayOfWeek, entryId, newEndTime, newStartTime, entry.getTimetableId(), excludeTtId);
            if (!lecClashes.isEmpty()) {
                return "Lecture clash: The lecturer is already scheduled for " + lecClashes.get(0) + " at this time.";
            }
        }

        // 3. Check Hall Clash
        if (hallId != null) {
            String hallQuery = "SELECT DISTINCT m.module_code FROM timetable_entry te " +
                               "JOIN batch_module bm ON te.batch_module_id = bm.batch_module_id " +
                               "JOIN module m ON bm.module_id = m.module_id " +
                               "JOIN timetable t ON te.timetable_id = t.timetable_id " +
                               "JOIN time_slot ts ON te.slot_id = ts.slot_id " +
                               "WHERE te.hall_id = ? AND ts.day_of_week = ? AND te.entry_id != ? " +
                               "AND ts.start_time < CAST(? AS time) AND ts.end_time > CAST(? AS time) " +
                               "AND (t.status = 'active' OR t.timetable_id = ?) AND t.timetable_id != ?";
            List<String> hallClashes = jdbcTemplate.queryForList(hallQuery, String.class, hallId, newDayOfWeek, entryId, newEndTime, newStartTime, entry.getTimetableId(), excludeTtId);
            if (!hallClashes.isEmpty()) {
                return "Venue clash: The venue is already occupied by " + hallClashes.get(0) + " at this time.";
            }
        }

        return null; // No clashes detected
    }
}
