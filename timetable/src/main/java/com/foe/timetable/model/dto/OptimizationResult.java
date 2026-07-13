package com.foe.timetable.model.dto;

import java.util.List;

public class OptimizationResult {
    private String status;
    private List<TimetableEntryOutput> schedule;
    private String message;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<TimetableEntryOutput> getSchedule() { return schedule; }
    public void setSchedule(List<TimetableEntryOutput> schedule) { this.schedule = schedule; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public static class TimetableEntryOutput {
        private Integer batchModuleId;
        private Integer slotId;
        private Integer hallId;

        public Integer getBatchModuleId() { return batchModuleId; }
        public void setBatchModuleId(Integer batchModuleId) { this.batchModuleId = batchModuleId; }

        public Integer getSlotId() { return slotId; }
        public void setSlotId(Integer slotId) { this.slotId = slotId; }

        public Integer getHallId() { return hallId; }
        public void setHallId(Integer hallId) { this.hallId = hallId; }
    }
}
