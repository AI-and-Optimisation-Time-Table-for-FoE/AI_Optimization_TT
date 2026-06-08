package com.foe.timetable.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "timetable_entry")
public class TimetableEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "entry_id")
    private Integer entryId;

    @Column(name = "timetable_id", nullable = false)
    private Integer timetableId;

    // Connects directly to your central pivot table 
    @Column(name = "batch_module_id", nullable = false)
    private Integer batchModuleId;

    @ManyToOne
    @JoinColumn(name = "hall_id", referencedColumnName = "hall_id", nullable = false)
    private Hall hall;

    @ManyToOne
    @JoinColumn(name = "slot_id", referencedColumnName = "slot_id", nullable = false)
    private TimeSlot timeSlot;

    @Column(name = "session_type", nullable = false)
    private String sessionType; // lecture, lab, tutorial

    @Column(name = "is_recurring", nullable = false)
    private Boolean isRecurring = true;

    // Getters and Setters
    public Integer getEntryId() { return entryId; }
    public void setEntryId(Integer entryId) { this.entryId = entryId; }

    public Integer getTimetableId() { return timetableId; }
    public void setTimetableId(Integer timetableId) { this.timetableId = timetableId; }

    public Integer getBatchModuleId() { return batchModuleId; }
    public void setBatchModuleId(Integer batchModuleId) { this.batchModuleId = batchModuleId; }

    public Hall getHall() { return hall; }
    public void setHall(Hall hall) { this.hall = hall; }

    public TimeSlot getTimeSlot() { return timeSlot; }
    public void setTimeSlot(TimeSlot timeSlot) { this.timeSlot = timeSlot; }

    public String getSessionType() { return sessionType; }
    public void setSessionType(String sessionType) { this.sessionType = sessionType; }

    public Boolean getIsRecurring() { return isRecurring; }
    public void setIsRecurring(Boolean isRecurring) { this.isRecurring = isRecurring; }
}