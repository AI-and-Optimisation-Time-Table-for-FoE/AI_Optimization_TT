package com.foe.timetable.model.dto;

import java.util.List;
import java.util.Map;

public class OptimizationRequest {
    private Integer batchId;
    private Integer studentCount;
    private String lunchStartTime;
    private String lunchEndTime;
    private List<ModuleInput> modules;
    private List<HallInput> halls;
    private List<TimeSlotInput> timeSlots;
    private Map<String, List<Integer>> lecturerUnavailability;
    private Map<String, List<Integer>> hallUnavailability;
    private Map<String, List<Integer>> batchLabSchedules;
    private Map<String, List<Integer>> lecturerPreferences;
    private List<Integer> studentPreferences;

    public Integer getBatchId() { return batchId; }
    public void setBatchId(Integer batchId) { this.batchId = batchId; }

    public Integer getStudentCount() { return studentCount; }
    public void setStudentCount(Integer studentCount) { this.studentCount = studentCount; }

    public String getLunchStartTime() { return lunchStartTime; }
    public void setLunchStartTime(String lunchStartTime) { this.lunchStartTime = lunchStartTime; }

    public String getLunchEndTime() { return lunchEndTime; }
    public void setLunchEndTime(String lunchEndTime) { this.lunchEndTime = lunchEndTime; }

    public List<ModuleInput> getModules() { return modules; }
    public void setModules(List<ModuleInput> modules) { this.modules = modules; }

    public List<HallInput> getHalls() { return halls; }
    public void setHalls(List<HallInput> halls) { this.halls = halls; }

    public List<TimeSlotInput> getTimeSlots() { return timeSlots; }
    public void setTimeSlots(List<TimeSlotInput> timeSlots) { this.timeSlots = timeSlots; }

    public Map<String, List<Integer>> getLecturerUnavailability() { return lecturerUnavailability; }
    public void setLecturerUnavailability(Map<String, List<Integer>> lecturerUnavailability) { this.lecturerUnavailability = lecturerUnavailability; }

    public Map<String, List<Integer>> getHallUnavailability() { return hallUnavailability; }
    public void setHallUnavailability(Map<String, List<Integer>> hallUnavailability) { this.hallUnavailability = hallUnavailability; }

    public Map<String, List<Integer>> getBatchLabSchedules() { return batchLabSchedules; }
    public void setBatchLabSchedules(Map<String, List<Integer>> batchLabSchedules) { this.batchLabSchedules = batchLabSchedules; }

    public Map<String, List<Integer>> getLecturerPreferences() { return lecturerPreferences; }
    public void setLecturerPreferences(Map<String, List<Integer>> lecturerPreferences) { this.lecturerPreferences = lecturerPreferences; }

    public List<Integer> getStudentPreferences() { return studentPreferences; }
    public void setStudentPreferences(List<Integer> studentPreferences) { this.studentPreferences = studentPreferences; }

    public static class ModuleInput {
        private Integer batchModuleId;
        private String moduleCode;
        private String moduleName;
        private Integer sessionsNeeded;
        private Integer lecturerId;
        private Integer preferredHallId;

        public Integer getBatchModuleId() { return batchModuleId; }
        public void setBatchModuleId(Integer batchModuleId) { this.batchModuleId = batchModuleId; }

        public String getModuleCode() { return moduleCode; }
        public void setModuleCode(String moduleCode) { this.moduleCode = moduleCode; }

        public String getModuleName() { return moduleName; }
        public void setModuleName(String moduleName) { this.moduleName = moduleName; }

        public Integer getSessionsNeeded() { return sessionsNeeded; }
        public void setSessionsNeeded(Integer sessionsNeeded) { this.sessionsNeeded = sessionsNeeded; }

        public Integer getLecturerId() { return lecturerId; }
        public void setLecturerId(Integer lecturerId) { this.lecturerId = lecturerId; }

        public Integer getPreferredHallId() { return preferredHallId; }
        public void setPreferredHallId(Integer preferredHallId) { this.preferredHallId = preferredHallId; }
    }

    public static class HallInput {
        private Integer hallId;
        private String hallName;
        private Integer capacity;

        public Integer getHallId() { return hallId; }
        public void setHallId(Integer hallId) { this.hallId = hallId; }

        public String getHallName() { return hallName; }
        public void setHallName(String hallName) { this.hallName = hallName; }

        public Integer getCapacity() { return capacity; }
        public void setCapacity(Integer capacity) { this.capacity = capacity; }
    }

    public static class TimeSlotInput {
        private Integer slotId;
        private String dayOfWeek;
        private String startTime;
        private String endTime;
        private Integer slotNumber;

        public Integer getSlotId() { return slotId; }
        public void setSlotId(Integer slotId) { this.slotId = slotId; }

        public String getDayOfWeek() { return dayOfWeek; }
        public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }

        public String getStartTime() { return startTime; }
        public void setStartTime(String startTime) { this.startTime = startTime; }

        public String getEndTime() { return endTime; }
        public void setEndTime(String endTime) { this.endTime = endTime; }

        public Integer getSlotNumber() { return slotNumber; }
        public void setSlotNumber(Integer slotNumber) { this.slotNumber = slotNumber; }
    }
}
