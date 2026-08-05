package com.foe.timetable;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;

import com.foe.timetable.Controller.AuthController;
import com.foe.timetable.model.UserAccount;
import com.foe.timetable.repository.UserAccountRepository;

@SpringBootTest
public class AuthControllerTest {

    @Autowired
    private AuthController authController;

    @Autowired
    private UserAccountRepository userAccountRepository;

    private String testUsername = "temp_student_test_4985";

    @AfterEach
    void tearDown() {
        Optional<UserAccount> userOpt = userAccountRepository.findByUsername(testUsername);
        userOpt.ifPresent(user -> userAccountRepository.delete(user));
    }

    @Test
    void testStudentRegistrationSavesStudentIdNumber() {
        // Prepare registration request map
        Map<String, Object> request = new HashMap<>();
        request.put("role", "student");
        request.put("username", testUsername);
        request.put("password", "password123");
        request.put("batchId", 1);
        request.put("firstName", "Test");
        request.put("lastName", "Student");
        request.put("universityEmail", "temp_student_test_4985@eng.pdn.ac.lk");
        request.put("departmentId", 1);
        request.put("studentIdNumber", "EG/2022/4985");

        // Act
        ResponseEntity<?> response = authController.register(request);

        // Assert response
        assertEquals(200, response.getStatusCode().value());

        // Assert record in database
        Optional<UserAccount> userOpt = userAccountRepository.findByUsername(testUsername);
        assertEquals(true, userOpt.isPresent());
        UserAccount registeredUser = userOpt.get();
        assertEquals("EG/2022/4985", registeredUser.getStudentIdNumber());
    }
}
