package com.foe.timetable.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "batch")
public class Batch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "batch_id")
    private Integer batchId;

    @Column(name = "batch_name", nullable = false, length = 100)
    private String batchName;

    @Column(name = "academic_year", nullable = false)
    private Integer academicYear;

    @Column(nullable = false)
    private Integer semester;

    @Column(name = "student_count")
    private Integer studentCount;

    @Column(length = 20)
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "lunch_start_time", length = 10)
    private String lunchStartTime = "12:30";

    @Column(name = "lunch_end_time", length = 10)
    private String lunchEndTime = "13:30";

    public Integer getBatchId() { return batchId; }
    public void setBatchId(Integer batchId) { this.batchId = batchId; }

    public String getBatchName() { return batchName; }
    public void setBatchName(String batchName) { this.batchName = batchName; }

    public Integer getAcademicYear() { return academicYear; }
    public void setAcademicYear(Integer academicYear) { this.academicYear = academicYear; }

    public Integer getSemester() { return semester; }
    public void setSemester(Integer semester) { this.semester = semester; }

    public Integer getStudentCount() { return studentCount; }
    public void setStudentCount(Integer studentCount) { this.studentCount = studentCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getLunchStartTime() { return lunchStartTime; }
    public void setLunchStartTime(String lunchStartTime) { this.lunchStartTime = lunchStartTime; }

    public String getLunchEndTime() { return lunchEndTime; }
    public void setLunchEndTime(String lunchEndTime) { this.lunchEndTime = lunchEndTime; }
}
