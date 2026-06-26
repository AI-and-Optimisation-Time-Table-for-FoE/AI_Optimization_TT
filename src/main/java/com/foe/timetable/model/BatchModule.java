package com.foe.timetable.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "batch_module")
public class BatchModule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "batch_module_id")
    private Integer batchModuleId;

    @ManyToOne
    @JoinColumn(name = "batch_id", nullable = false)
    private Batch batch;

    @ManyToOne
    @JoinColumn(name = "module_id", nullable = false)
    private Module module;

    @Column(name = "lecturer_id", nullable = false)
    private Integer lecturerId;

    @ManyToOne
    @JoinColumn(name = "preferred_hall_id", nullable = true)
    private Hall preferredHall;

    @Column(name = "academic_year", nullable = false)
    private Integer academicYear;

    // This is the key field for your Semester filtering
    @Column(name = "semester", nullable = false)
    private Integer semester;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Standard Getters and Setters
    public Integer getBatchModuleId() { return batchModuleId; }
    public void setBatchModuleId(Integer batchModuleId) { this.batchModuleId = batchModuleId; }

    public Batch getBatch() { return batch; }
    public void setBatch(Batch batch) { this.batch = batch; }

    public Module getModule() { return module; }
    public void setModule(Module module) { this.module = module; }

    public Integer getLecturerId() { return lecturerId; }
    public void setLecturerId(Integer lecturerId) { this.lecturerId = lecturerId; }

    public Integer getAcademicYear() { return academicYear; }
    public void setAcademicYear(Integer academicYear) { this.academicYear = academicYear; }

    // Ensure these methods match the repository query exactly
    public Integer getSemester() { return semester; }
    public void setSemester(Integer semester) { this.semester = semester; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Hall getPreferredHall() { return preferredHall; }
    public void setPreferredHall(Hall preferredHall) { this.preferredHall = preferredHall; }

    // Inside BatchModule.java
    public Integer getBatchId() {return (this.batch != null) ? this.batch.getBatchId() : null;
}
}