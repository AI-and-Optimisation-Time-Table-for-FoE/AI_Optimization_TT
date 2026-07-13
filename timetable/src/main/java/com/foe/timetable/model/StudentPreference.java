package com.foe.timetable.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_preference")
public class StudentPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private UserAccount student;

    @ManyToOne
    @JoinColumn(name = "module_id", nullable = false)
    private Module module;

    @Column(name = "preferred_day", nullable = false, length = 20)
    private String preferredDay;

    @Column(name = "preferred_time", nullable = false, length = 10)
    private String preferredTime;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public UserAccount getStudent() { return student; }
    public void setStudent(UserAccount student) { this.student = student; }

    public Module getModule() { return module; }
    public void setModule(Module module) { this.module = module; }

    public String getPreferredDay() { return preferredDay; }
    public void setPreferredDay(String preferredDay) { this.preferredDay = preferredDay; }

    public String getPreferredTime() { return preferredTime; }
    public void setPreferredTime(String preferredTime) { this.preferredTime = preferredTime; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
