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

    @jakarta.persistence.ElementCollection(fetch = jakarta.persistence.FetchType.EAGER)
    @jakarta.persistence.CollectionTable(name = "batch_module_lecturer", joinColumns = @jakarta.persistence.JoinColumn(name = "batch_module_id"))
    @jakarta.persistence.Column(name = "lecturer_id")
    private java.util.Set<Integer> lecturerIds = new java.util.HashSet<>();

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

    @Column(name = "is_shared", nullable = false)
    private Boolean isShared = false;

    @Column(name = "linked_batch_module_id", nullable = true)
    private Integer linkedBatchModuleId;

    @Column(name = "offering_dept_ids", nullable = true)
    private String offeringDeptIds;

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

    public Boolean getIsShared() { return isShared; }
    public void setIsShared(Boolean isShared) { this.isShared = isShared; }

    public Integer getLinkedBatchModuleId() { return linkedBatchModuleId; }
    public void setLinkedBatchModuleId(Integer linkedBatchModuleId) { this.linkedBatchModuleId = linkedBatchModuleId; }

    public java.util.Set<Integer> getLecturerIds() { return lecturerIds; }
    public void setLecturerIds(java.util.Set<Integer> lecturerIds) { this.lecturerIds = lecturerIds; }

    public String getOfferingDeptIds() { return offeringDeptIds; }
    public void setOfferingDeptIds(String offeringDeptIds) { this.offeringDeptIds = offeringDeptIds; }

    public boolean isOfferedByDepartment(Integer departmentId) {
        if (module == null || module.getDepartment() == null) return false;
        
        // A module is always offered/managed by its own department
        if (module.getDepartment().getDepartmentId().equals(departmentId)) {
            return true;
        }
        
        // If it is NOT an IS module, it is only offered by its own department
        boolean isIS = module.getDepartment().getDepartmentId().equals(4) || 
                       "IS".equals(module.getDepartment().getDepartmentCode());
        if (!isIS) {
            return false;
        }
        
        // If it is an IS module, check offeringDeptIds
        if (offeringDeptIds == null || offeringDeptIds.trim().isEmpty()) {
            return true; // default: offered by all
        }
        String[] ids = offeringDeptIds.split(",");
        for (String id : ids) {
            if (id.trim().equals(String.valueOf(departmentId))) {
                return true;
            }
        }
        return false;
    }

    public java.util.Set<Integer> getAllLecturerIds() {
        if (lecturerIds == null || lecturerIds.isEmpty()) {
            java.util.Set<Integer> fallback = new java.util.HashSet<>();
            if (lecturerId != null) {
                fallback.add(lecturerId);
            }
            return fallback;
        }
        return lecturerIds;
    }
}