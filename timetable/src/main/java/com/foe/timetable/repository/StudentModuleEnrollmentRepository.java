package com.foe.timetable.repository;

import com.foe.timetable.model.StudentModuleEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentModuleEnrollmentRepository extends JpaRepository<StudentModuleEnrollment, Integer> {
    List<StudentModuleEnrollment> findByBatch_BatchId(Integer batchId);
    List<StudentModuleEnrollment> findByStudentRegNoIgnoreCase(String studentRegNo);
    List<StudentModuleEnrollment> findByStudentEmailIgnoreCase(String studentEmail);
    List<StudentModuleEnrollment> findByModule_ModuleId(Integer moduleId);

    @Query("SELECT e FROM StudentModuleEnrollment e WHERE LOWER(e.studentRegNo) = LOWER(:identifier) OR LOWER(e.studentEmail) = LOWER(:identifier)")
    List<StudentModuleEnrollment> findByIdentifier(@Param("identifier") String identifier);

    void deleteByBatch_BatchId(Integer batchId);
}
