package com.foe.timetable.repository;

import com.foe.timetable.model.StudentPreference;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentPreferenceRepository extends JpaRepository<StudentPreference, Integer> {
    List<StudentPreference> findByStudent_UserId(Integer studentId);
}
