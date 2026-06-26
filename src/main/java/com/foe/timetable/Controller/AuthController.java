package com.foe.timetable.Controller;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foe.timetable.model.Lecturer;
import com.foe.timetable.model.UserAccount;
import com.foe.timetable.repository.LecturerRepository;
import com.foe.timetable.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private LecturerRepository lecturerRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username and password are required"));
        }

        Optional<UserAccount> userOpt = authService.authenticate(username, password);
        if (userOpt.isPresent()) {
            UserAccount user = userOpt.get();
            Map<String, Object> response = new HashMap<>();
            response.put("userId", user.getUserId());
            response.put("username", user.getUsername());
            response.put("role", user.getRole().toString());
            response.put("token", "session_token_" + user.getUserId() + "_" + System.currentTimeMillis());
            
            if (user.getRole() == UserAccount.Role.student) {
                response.put("batchId", user.getBatchId());
                response.put("departmentId", user.getDepartmentId());
            } else if (user.getRole() == UserAccount.Role.lecturer) {
                Optional<Lecturer> lecturerOpt = lecturerRepository.findByUserAccount_UserId(user.getUserId());
                if (lecturerOpt.isPresent()) {
                    response.put("lecturerId", lecturerOpt.get().getLecturerId());
                    response.put("lecturerName", lecturerOpt.get().getName());
                }
            }

            return ResponseEntity.ok(response);
        }

        return ResponseEntity.status(401).body(Map.of("message", "Invalid username or password"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> request) {
        try {
            String roleStr = (String) request.get("role");
            String username = (String) request.get("username");
            String password = (String) request.get("password");

            if (roleStr == null || username == null || password == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Role, username, and password are required"));
            }

            UserAccount.Role role = UserAccount.Role.valueOf(roleStr.toLowerCase());
            UserAccount savedAccount;

            if (role == UserAccount.Role.student) {
                Number batchIdNum = (Number) request.get("batchId");
                String firstName = (String) request.get("firstName");
                String lastName = (String) request.get("lastName");
                String universityEmail = (String) request.get("universityEmail");
                Number departmentIdNum = (Number) request.get("departmentId");
                Integer deptId = (departmentIdNum != null) ? departmentIdNum.intValue() : null;

                if (batchIdNum == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "batchId is required for students"));
                }
                if (firstName == null || lastName == null || universityEmail == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "First name, last name, and university email are required"));
                }
                savedAccount = authService.registerStudent(username, password, batchIdNum.intValue(),
                        firstName, lastName, universityEmail, deptId);
            } else if (role == UserAccount.Role.lecturer) {
                String firstName = (String) request.get("firstName");
                String lastName = (String) request.get("lastName");
                String universityEmail = (String) request.get("universityEmail");
                String email = (String) request.get("email");
                String title = (String) request.getOrDefault("title", "");
                Number departmentIdNum = (Number) request.get("departmentId");
                String specialization = (String) request.get("specialization");
                Number maxHoursNum = (Number) request.get("maxHoursPerWeek");

                if (firstName == null || lastName == null || universityEmail == null || email == null || departmentIdNum == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "First name, last name, university email, email, and department are required for lecturers"));
                }

                String universityAddress = (String) registrationData.get("universityAddress");
                String phoneNumber = (String) registrationData.get("phoneNumber");

                savedAccount = authService.registerLecturer(
                    username, password, firstName, lastName, universityEmail,
                    email, departmentIdNum.intValue(), title,
                    specialization, maxHoursNum != null ? maxHoursNum.intValue() : 20,
                    universityAddress, phoneNumber
                );
            } else if (role == UserAccount.Role.admin) {
                savedAccount = authService.registerAdmin(username, password);
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid role specified"));
            }

            return ResponseEntity.ok(Map.of(
                "message", "Registration successful!",
                "userId", savedAccount.getUserId(),
                "username", savedAccount.getUsername(),
                "role", savedAccount.getRole().toString()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid role. Supported roles: admin, lecturer, student"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Registration failed"));
        }
    }
}
