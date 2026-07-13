package com.foe.timetable.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "timetable_entry")
// This ignores Hibernate internal metadata that often causes serialization to fail
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class TimetableEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "entry_id")
    private Integer entryId;

    @Column(name = "timetable_id", nullable = false)
    private Integer timetableId;

    // Use EAGER to ensure the related objects are fully loaded for the JSON converter
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "batch_module_id", referencedColumnName = "batch_module_id", nullable = false)
    private BatchModule batchModule;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "hall_id", referencedColumnName = "hall_id", nullable = false)
    private Hall hall;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "slot_id", referencedColumnName = "slot_id", nullable = false)
    private TimeSlot timeSlot;

    @Column(name = "session_type", nullable = false)
    private String sessionType;

    @Column(name = "is_recurring", nullable = false)
    private Boolean isRecurring = true;

    // --- Getters and Setters ---
    
    public Integer getEntryId() { return entryId; }
    public void setEntryId(Integer entryId) { this.entryId = entryId; }

    public Integer getTimetableId() { return timetableId; }
    public void setTimetableId(Integer timetableId) { this.timetableId = timetableId; }

    public BatchModule getBatchModule() { return batchModule; }
    public void setBatchModule(BatchModule batchModule) { this.batchModule = batchModule; }

    public Hall getHall() { return hall; }
    public void setHall(Hall hall) { this.hall = hall; }

    public TimeSlot getTimeSlot() { return timeSlot; }
    public void setTimeSlot(TimeSlot timeSlot) { this.timeSlot = timeSlot; }

    public String getSessionType() { return sessionType; }
    public void setSessionType(String sessionType) { this.sessionType = sessionType; }

    public Boolean getIsRecurring() { return isRecurring; }
    public void setIsRecurring(Boolean isRecurring) { this.isRecurring = isRecurring; }
}