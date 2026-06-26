package com.foe.timetable.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "module")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "department"})
public class Module {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "module_id")
    private Integer moduleId;

    @ManyToOne
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @Column(name = "module_code", unique = true, nullable = false, length = 15)
    private String moduleCode;

    @Column(name = "module_name", nullable = false, length = 100)
    private String moduleName;

    @Column(name = "credit_hours", nullable = false)
    private Integer creditHours;

    @Column(name = "lecture_hours_per_week", nullable = false)
    private Integer lectureHoursPerWeek;

    @Column(name = "lab_hours_per_week", nullable = false)
    private Integer labHoursPerWeek;

    @Column(name = "semester", nullable = false)
    private Integer semester;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_type", nullable = false)
    private SessionType sessionType = SessionType.lecture;

    public enum SessionType { lecture, lab, tutorial, mixed }

    // Getters and Setters
    public Integer getModuleId() { return moduleId; }
    public void setModuleId(Integer moduleId) { this.moduleId = moduleId; }
    public Department getDepartment() { return department; }
    public void setDepartment(Department department) { this.department = department; }
    public String getModuleCode() { return moduleCode; }
    public void setModuleCode(String moduleCode) { this.moduleCode = moduleCode; }
    public String getModuleName() { return moduleName; }
    public void setModuleName(String moduleName) { this.moduleName = moduleName; }
    public Integer getCreditHours() { return creditHours; }
    public void setCreditHours(Integer creditHours) { this.creditHours = creditHours; }

    public Integer getLectureHoursPerWeek() { return lectureHoursPerWeek; }
    public void setLectureHoursPerWeek(Integer lectureHoursPerWeek) { this.lectureHoursPerWeek = lectureHoursPerWeek; }

    public Integer getLabHoursPerWeek() { return labHoursPerWeek; }
    public void setLabHoursPerWeek(Integer labHoursPerWeek) { this.labHoursPerWeek = labHoursPerWeek; }

    public Integer getSemester() { return semester; }
    public void setSemester(Integer semester) { this.semester = semester; }

    public SessionType getSessionType() { return sessionType; }
    public void setSessionType(SessionType sessionType) { this.sessionType = sessionType; }
}