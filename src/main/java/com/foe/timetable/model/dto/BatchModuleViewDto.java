package com.foe.timetable.model.dto;

public class BatchModuleViewDto {

    private Integer batchModuleId;
    private Integer batchId;
    private Integer moduleId;
    private String moduleCode;
    private String moduleName;
    private Integer creditHours;
    private Integer lectureHoursPerWeek;
    private Integer labHoursPerWeek;
    private Integer lecturerId;
    private String lecturerName;
    private Integer semester;
    private Integer preferredHallId;
    private String preferredHallName;

    public Integer getBatchModuleId() { return batchModuleId; }
    public void setBatchModuleId(Integer batchModuleId) { this.batchModuleId = batchModuleId; }

    public Integer getBatchId() { return batchId; }
    public void setBatchId(Integer batchId) { this.batchId = batchId; }

    public Integer getModuleId() { return moduleId; }
    public void setModuleId(Integer moduleId) { this.moduleId = moduleId; }

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

    public Integer getLecturerId() { return lecturerId; }
    public void setLecturerId(Integer lecturerId) { this.lecturerId = lecturerId; }

    public String getLecturerName() { return lecturerName; }
    public void setLecturerName(String lecturerName) { this.lecturerName = lecturerName; }

    public Integer getSemester() { return semester; }
    public void setSemester(Integer semester) { this.semester = semester; }

    public Integer getPreferredHallId() { return preferredHallId; }
    public void setPreferredHallId(Integer preferredHallId) { this.preferredHallId = preferredHallId; }

    public String getPreferredHallName() { return preferredHallName; }
    public void setPreferredHallName(String preferredHallName) { this.preferredHallName = preferredHallName; }
}
