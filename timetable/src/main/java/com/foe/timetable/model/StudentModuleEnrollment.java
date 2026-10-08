package com.foe.timetable.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_module_enrollment", indexes = {
    @Index(name = "idx_student_reg", columnList = "student_reg_no"),
    @Index(name = "idx_enrollment_batch", columnList = "batch_id"),
    @Index(name = "idx_enrollment_module", columnList = "module_id")
})
public class StudentModuleEnrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "enrollment_id")
    private Integer enrollmentId;

    @Column(name = "student_reg_no", nullable = false, length = 50)
    private String studentRegNo;

    @Column(name = "student_email", length = 150)
    private String studentEmail;

    @ManyToOne
    @JoinColumn(name = "batch_id", nullable = false)
    private Batch batch;

    @ManyToOne
    @JoinColumn(name = "module_id", nullable = false)
    private Module module;

    @Enumerated(EnumType.STRING)
    @Column(name = "enrollment_type", nullable = false)
    private EnrollmentType enrollmentType = EnrollmentType.regular;

    @Column(name = "academic_year", length = 20)
    private String academicYear;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum EnrollmentType {
        regular,
        technical_elective,
        is_module,
        repeat,
        resit
    }

    public StudentModuleEnrollment() {}

    public StudentModuleEnrollment(String studentRegNo, String studentEmail, Batch batch, Module module, EnrollmentType enrollmentType, String academicYear) {
        this.studentRegNo = studentRegNo;
        this.studentEmail = studentEmail;
        this.batch = batch;
        this.module = module;
        this.enrollmentType = enrollmentType;
        this.academicYear = academicYear;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Integer getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(Integer enrollmentId) { this.enrollmentId = enrollmentId; }

    public String getStudentRegNo() { return studentRegNo; }
    public void setStudentRegNo(String studentRegNo) { this.studentRegNo = studentRegNo; }

    public String getStudentEmail() { return studentEmail; }
    public void setStudentEmail(String studentEmail) { this.studentEmail = studentEmail; }

    public Batch getBatch() { return batch; }
    public void setBatch(Batch batch) { this.batch = batch; }

    public Module getModule() { return module; }
    public void setModule(Module module) { this.module = module; }

    public EnrollmentType getEnrollmentType() { return enrollmentType; }
    public void setEnrollmentType(EnrollmentType enrollmentType) { this.enrollmentType = enrollmentType; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
