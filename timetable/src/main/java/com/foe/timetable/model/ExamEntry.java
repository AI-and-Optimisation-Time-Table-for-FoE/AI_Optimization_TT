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
@Table(name = "exam_entry")
public class ExamEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "exam_entry_id")
    private Integer examEntryId;

    @ManyToOne
    @JoinColumn(name = "exam_timetable_id", nullable = false)
    private ExamTimetable examTimetable;

    @ManyToOne
    @JoinColumn(name = "module_id", nullable = false)
    private Module module;

    @Column(name = "exam_date", nullable = false)
    private LocalDate examDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @ManyToOne
    @JoinColumn(name = "hall_id", nullable = true)
    private Hall hall;

    @Column(name = "session_name", nullable = true, length = 50)
    private String sessionName;

    @Column(name = "student_id_range", nullable = true, length = 250)
    private String studentIdRange;

    @Column(name = "allocated_count", nullable = true)
    private Integer allocatedCount;

    public ExamEntry() {}

    public Integer getExamEntryId() {
        return examEntryId;
    }

    public void setExamEntryId(Integer examEntryId) {
        this.examEntryId = examEntryId;
    }

    public ExamTimetable getExamTimetable() {
        return examTimetable;
    }

    public void setExamTimetable(ExamTimetable examTimetable) {
        this.examTimetable = examTimetable;
    }

    public Module getModule() {
        return module;
    }

    public void setModule(Module module) {
        this.module = module;
    }

    public LocalDate getExamDate() {
        return examDate;
    }

    public void setExamDate(LocalDate examDate) {
        this.examDate = examDate;
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

    public Hall getHall() {
        return hall;
    }

    public void setHall(Hall hall) {
        this.hall = hall;
    }

    public String getSessionName() {
        return sessionName;
    }

    public void setSessionName(String sessionName) {
        this.sessionName = sessionName;
    }

    public String getStudentIdRange() {
        return studentIdRange;
    }

    public void setStudentIdRange(String studentIdRange) {
        this.studentIdRange = studentIdRange;
    }

    public Integer getAllocatedCount() {
        return allocatedCount;
    }

    public void setAllocatedCount(Integer allocatedCount) {
        this.allocatedCount = allocatedCount;
    }
}
