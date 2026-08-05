package com.foe.timetable.Controller;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foe.timetable.model.Lecturer;
import com.foe.timetable.model.UserAccount;
import com.foe.timetable.repository.LecturerRepository;
import com.foe.timetable.repository.UserAccountRepository;
import com.foe.timetable.service.AuthService;
import org.springframework.jdbc.core.JdbcTemplate;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private LecturerRepository lecturerRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

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
            response.put("firstName", user.getFirstName());
            response.put("lastName", user.getLastName());
            response.put("profilePicture", user.getProfilePicture());
            response.put("token", "session_token_" + user.getUserId() + "_" + System.currentTimeMillis());
            
            if (user.getRole() == UserAccount.Role.student) {
                response.put("batchId", user.getBatchId());
                response.put("departmentId", user.getDepartmentId());
                response.put("studentIdNumber", user.getStudentIdNumber());
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
                String studentIdNumber = (String) request.get("studentIdNumber");

                if (batchIdNum == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "batchId is required for students"));
                }
                if (firstName == null || lastName == null || universityEmail == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "First name, last name, and university email are required"));
                }
                savedAccount = authService.registerStudent(username, password, batchIdNum.intValue(),
                        firstName, lastName, universityEmail, deptId, studentIdNumber);
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

                String universityAddress = (String) request.get("universityAddress");
                String phoneNumber = (String) request.get("phoneNumber");

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

    @GetMapping("/profile/{userId}")
    public ResponseEntity<?> getProfile(@PathVariable Integer userId) {
        return userAccountRepository.findById(userId)
            .map(user -> {
                Map<String, Object> profile = new HashMap<>();
                profile.put("userId", user.getUserId());
                profile.put("username", user.getUsername());
                profile.put("role", user.getRole().toString());
                profile.put("firstName", user.getFirstName());
                profile.put("lastName", user.getLastName());
                profile.put("universityEmail", user.getUniversityEmail());
                profile.put("profilePicture", user.getProfilePicture());
                profile.put("batchId", user.getBatchId());
                profile.put("departmentId", user.getDepartmentId());
                profile.put("studentIdNumber", user.getStudentIdNumber());
                
                if (user.getRole() == UserAccount.Role.student) {
                    if (user.getBatchId() != null) {
                        try {
                            String batchName = jdbcTemplate.queryForObject(
                                "SELECT batch_name FROM batch WHERE batch_id = ?",
                                String.class, user.getBatchId()
                            );
                            profile.put("batchName", batchName);
                        } catch (Exception e) {}
                    }
                    if (user.getDepartmentId() != null) {
                        try {
                            String deptName = jdbcTemplate.queryForObject(
                                "SELECT department_name FROM department WHERE department_id = ?",
                                String.class, user.getDepartmentId()
                            );
                            profile.put("departmentName", deptName);
                        } catch (Exception e) {}
                    }
                } else if (user.getRole() == UserAccount.Role.lecturer) {
                    lecturerRepository.findByUserAccount_UserId(user.getUserId()).ifPresent(lec -> {
                        profile.put("specialization", lec.getSpecialization());
                        profile.put("universityAddress", lec.getUniversityAddress());
                        profile.put("phoneNumber", lec.getPhoneNumber());
                        profile.put("maxHoursPerWeek", lec.getMaxHoursPerWeek());
                        if (lec.getDepartment() != null) {
                            profile.put("departmentName", lec.getDepartment().getDepartmentName());
                            profile.put("departmentCode", lec.getDepartment().getDepartmentCode());
                        }
                    });
                }
                return ResponseEntity.ok(profile);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/profile/{userId}")
    public ResponseEntity<?> updateProfile(@PathVariable Integer userId,
                                           @RequestBody Map<String, Object> updates) {
        return userAccountRepository.findById(userId)
            .map(user -> {
                if (updates.containsKey("firstName")) user.setFirstName((String) updates.get("firstName"));
                if (updates.containsKey("lastName")) user.setLastName((String) updates.get("lastName"));
                if (updates.containsKey("universityEmail")) user.setUniversityEmail((String) updates.get("universityEmail"));
                if (updates.containsKey("profilePicture")) user.setProfilePicture((String) updates.get("profilePicture"));
                if (updates.containsKey("studentIdNumber")) user.setStudentIdNumber((String) updates.get("studentIdNumber"));
                userAccountRepository.save(user);
                
                Map<String, Object> resp = new HashMap<>();
                resp.put("message", "Profile updated successfully");
                resp.put("firstName", user.getFirstName());
                resp.put("lastName", user.getLastName());
                resp.put("universityEmail", user.getUniversityEmail());
                resp.put("profilePicture", user.getProfilePicture());
                resp.put("studentIdNumber", user.getStudentIdNumber());
                
                if (user.getRole() == UserAccount.Role.lecturer) {
                    lecturerRepository.findByUserAccount_UserId(user.getUserId()).ifPresent(lec -> {
                        if (updates.containsKey("firstName") || updates.containsKey("lastName")) {
                            String fName = updates.containsKey("firstName") ? (String) updates.get("firstName") : user.getFirstName();
                            String lName = updates.containsKey("lastName") ? (String) updates.get("lastName") : user.getLastName();
                            lec.setName((fName != null ? fName : "") + " " + (lName != null ? lName : ""));
                        }
                        if (updates.containsKey("specialization")) lec.setSpecialization((String) updates.get("specialization"));
                        if (updates.containsKey("universityAddress")) lec.setUniversityAddress((String) updates.get("universityAddress"));
                        if (updates.containsKey("phoneNumber")) lec.setPhoneNumber((String) updates.get("phoneNumber"));
                        lecturerRepository.save(lec);
                        
                        resp.put("specialization", lec.getSpecialization());
                        resp.put("universityAddress", lec.getUniversityAddress());
                        resp.put("phoneNumber", lec.getPhoneNumber());
                    });
                }
                return ResponseEntity.ok(resp);
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
