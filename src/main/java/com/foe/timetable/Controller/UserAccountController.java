package com.foe.timetable.Controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foe.timetable.model.UserAccount;
import com.foe.timetable.repository.UserAccountRepository;
import com.foe.timetable.service.AuthService;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserAccountController {

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private AuthService authService;

    @GetMapping
    public List<UserAccount> getAllUsers() {
        return userAccountRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> userData) {
        try {
            String username = (String) userData.get("username");
            String password = (String) userData.get("password");
            String roleStr = (String) userData.get("role");
            
            if (username == null || password == null || roleStr == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Username, password, and role are required"));
            }

            UserAccount.Role role = UserAccount.Role.valueOf(roleStr.toLowerCase());
            UserAccount account;

            if (role == UserAccount.Role.student) {
                Number batchIdNum = (Number) userData.get("batchId");
                String firstName = (String) userData.get("firstName");
                String lastName = (String) userData.get("lastName");
                String universityEmail = (String) userData.get("universityEmail");
                Number departmentIdNum = (Number) userData.get("departmentId");
                Integer deptId = (departmentIdNum != null) ? departmentIdNum.intValue() : null;

                if (firstName == null) firstName = username;
                if (lastName == null) lastName = "";
                if (universityEmail == null) universityEmail = username + "@university.edu";

                account = authService.registerStudent(
                    username, password, batchIdNum != null ? batchIdNum.intValue() : null,
                    firstName, lastName, universityEmail, deptId
                );
            } else if (role == UserAccount.Role.lecturer) {
                String name = (String) userData.get("name");
                String email = (String) userData.get("email");
                Number departmentIdNum = (Number) userData.get("departmentId");
                String specialization = (String) userData.get("specialization");
                Number maxHoursNum = (Number) userData.get("maxHoursPerWeek");

                if (name == null || email == null || departmentIdNum == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Name, email, and departmentId are required for lecturers"));
                }

                // Parse firstName, lastName, and title from the full name
                String firstName = name;
                String lastName = "";
                String title = "";
                
                if (name.contains(" ")) {
                    int firstSpace = name.indexOf(" ");
                    firstName = name.substring(0, firstSpace);
                    lastName = name.substring(firstSpace + 1);
                }

                // Check if title is present in the first word
                if (firstName.equalsIgnoreCase("Dr.") || firstName.equalsIgnoreCase("Prof.") || 
                    firstName.equalsIgnoreCase("Eng.") || firstName.equalsIgnoreCase("Mr.") || 
                    firstName.equalsIgnoreCase("Ms.") || firstName.equalsIgnoreCase("Mrs.")) {
                    title = firstName;
                    if (lastName.contains(" ")) {
                        int secondSpace = lastName.indexOf(" ");
                        firstName = lastName.substring(0, secondSpace);
                        lastName = lastName.substring(secondSpace + 1);
                    } else {
                        firstName = lastName;
                        lastName = "";
                    }
                }

                String universityAddress = (String) userData.get("universityAddress");
                String phoneNumber = (String) userData.get("phoneNumber");

                account = authService.registerLecturer(
                    username, password, firstName, lastName, email, email, departmentIdNum.intValue(),
                    title, specialization, maxHoursNum != null ? maxHoursNum.intValue() : 20,
                    universityAddress, phoneNumber
                );
            } else {
                account = authService.registerAdmin(username, password);
            }

            return ResponseEntity.ok(account);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Failed to create user"));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable int id, @RequestBody Map<String, Object> userData) {
        Optional<UserAccount> userOpt = userAccountRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        UserAccount user = userOpt.get();
        if (userData.containsKey("username")) {
            user.setUsername((String) userData.get("username"));
        }
        if (userData.containsKey("password") && userData.get("password") != null && !((String) userData.get("password")).isEmpty()) {
            user.setPasswordHash(authService.hashPassword((String) userData.get("password")));
        }
        if (userData.containsKey("role")) {
            user.setRole(UserAccount.Role.valueOf(((String) userData.get("role")).toLowerCase()));
        }
        if (userData.containsKey("isActive")) {
            user.setIsActive((Boolean) userData.get("isActive"));
        }
        if (userData.containsKey("batchId")) {
            Number batchIdNum = (Number) userData.get("batchId");
            user.setBatchId(batchIdNum != null ? batchIdNum.intValue() : null);
        }

        UserAccount updated = userAccountRepository.save(user);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable int id) {
        if (!userAccountRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userAccountRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }
}
