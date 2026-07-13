package com.foe.timetable.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "hall")
public class Hall {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "hall_id")
    private Integer hallId;

    @Column(name = "hall_name", nullable = false, length = 100)
    private String hallName;

    @Column(name = "hall_code", unique = true, nullable = false, length = 10)
    private String hallCode;

    @Column(nullable = false)
    private Integer capacity;

    @Enumerated(EnumType.STRING)
    @Column(name = "hall_type", nullable = false)
    private HallType hallType;

    @Column(name = "has_projector", nullable = false)
    private Boolean hasProjector = false;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public enum HallType { lecture, lab, tutorial }

    // Getters and Setters
    public Integer getHallId() { return hallId; }
    public void setHallId(Integer hallId) { this.hallId = hallId; }
    public String getHallName() { return hallName; }
    public void setHallName(String hallName) { this.hallName = hallName; }
    public String getHallCode() { return hallCode; }
    public void setHallCode(String hallCode) { this.hallCode = hallCode; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public HallType getHallType() { return hallType; }
    public void setHallType(HallType hallType) { this.hallType = hallType; }
    public Boolean getHasProjector() { return hasProjector; }
    public void setHasProjector(Boolean hasProjector) { this.hasProjector = hasProjector; }
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean active) { this.isActive = active; }
}

