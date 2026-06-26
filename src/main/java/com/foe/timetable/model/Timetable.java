package com.foe.timetable.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "timetable")
public class Timetable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "timetable_id")
    private Integer timetableId;

    @Column(name = "batch_id", nullable = false)
    private Integer batchId;

    @Column(name = "timetable_name", length = 150)
    private String timetableName;

    @Column(name = "academic_year")
    private Integer academicYear;

    private Integer semester;

    @Column(length = 20)
    private String status;

    @Column(name = "generated_at")
    private LocalDateTime generatedAt;

    public Integer getTimetableId() { return timetableId; }
    public void setTimetableId(Integer timetableId) { this.timetableId = timetableId; }

    public Integer getBatchId() { return batchId; }
    public void setBatchId(Integer batchId) { this.batchId = batchId; }

    public String getTimetableName() { return timetableName; }
    public void setTimetableName(String timetableName) { this.timetableName = timetableName; }

    public Integer getAcademicYear() { return academicYear; }
    public void setAcademicYear(Integer academicYear) { this.academicYear = academicYear; }

    public Integer getSemester() { return semester; }
    public void setSemester(Integer semester) { this.semester = semester; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }
}
