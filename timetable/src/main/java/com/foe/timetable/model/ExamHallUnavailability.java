package com.foe.timetable.model;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "exam_hall_unavailability")
public class ExamHallUnavailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "unavailability_id")
    private Integer unavailabilityId;

    @ManyToOne
    @JoinColumn(name = "hall_id", nullable = false)
    private Hall hall;

    @Column(name = "unavailable_date", nullable = true)
    private LocalDate unavailableDate;

    @Column(name = "start_time", nullable = true)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = true)
    private LocalTime endTime;

    @Column(name = "reason", nullable = true, length = 255)
    private String reason;

    public ExamHallUnavailability() {}

    public Integer getUnavailabilityId() {
        return unavailabilityId;
    }

    public void setUnavailabilityId(Integer unavailabilityId) {
        this.unavailabilityId = unavailabilityId;
    }

    public Hall getHall() {
        return hall;
    }

    public void setHall(Hall hall) {
        this.hall = hall;
    }

    public LocalDate getUnavailableDate() {
        return unavailableDate;
    }

    public void setUnavailableDate(LocalDate unavailableDate) {
        this.unavailableDate = unavailableDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
