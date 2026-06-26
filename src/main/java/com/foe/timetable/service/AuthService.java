package com.foe.timetable.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foe.timetable.model.Department;
import com.foe.timetable.model.Lecturer;
import com.foe.timetable.model.UserAccount;
import com.foe.timetable.repository.DepartmentRepository;
import com.foe.timetable.repository.LecturerRepository;
import com.foe.timetable.repository.UserAccountRepository;

@Service
public class AuthService {

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private LecturerRepository lecturerRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    public String hashPassword(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception ex) {
            throw new RuntimeException("Error hashing password", ex);
        }
    }

    public Optional<UserAccount> authenticate(String username, String password) {
        Optional<UserAccount> userOpt = userAccountRepository.findByUsername(username);
        if (userOpt.isPresent()) {
            UserAccount user = userOpt.get();
            String inputHash = hashPassword(password);
            // Allow plaintext match for existing seeded users, or SHA-256 for newly created ones
            if (user.getPasswordHash().equals(password) || user.getPasswordHash().equals(inputHash)) {
                return Optional.of(user);
            }
        }
        return Optional.empty();
    }

    @Transactional
    public UserAccount registerStudent(String username, String password, Integer batchId,
                                       String firstName, String lastName, String universityEmail,
                                       Integer departmentId) {
        if (userAccountRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        UserAccount account = new UserAccount();
        account.setUsername(username);
        account.setPasswordHash(hashPassword(password));
        account.setRole(UserAccount.Role.student);
        account.setBatchId(batchId);
        account.setFirstName(firstName);
        account.setLastName(lastName);
        account.setUniversityEmail(universityEmail);
        account.setDepartmentId(departmentId);
        account.setIsActive(true);

        return userAccountRepository.save(account);
    }

    @Transactional
    public UserAccount registerLecturer(String username, String password, String firstName, String lastName,
                                        String universityEmail, String email, Integer departmentId,
                                        String title, String specialization, Integer maxHoursPerWeek,
                                        String universityAddress, String phoneNumber) {
        if (userAccountRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        UserAccount account = new UserAccount();
        account.setUsername(username);
        account.setPasswordHash(hashPassword(password));
        account.setRole(UserAccount.Role.lecturer);
        account.setFirstName(firstName);
        account.setLastName(lastName);
        account.setUniversityEmail(universityEmail);
        account.setIsActive(true);

        UserAccount savedAccount = userAccountRepository.save(account);

        Lecturer lecturer = new Lecturer();
        lecturer.setUserAccount(savedAccount);
        String fullName = (title != null && !title.isBlank())
                ? title + " " + firstName + " " + lastName
                : firstName + " " + lastName;
        lecturer.setName(fullName);
        lecturer.setEmail(email);
        lecturer.setSpecialization(specialization);
        lecturer.setMaxHoursPerWeek(maxHoursPerWeek != null ? maxHoursPerWeek : 20);
        lecturer.setUniversityAddress(universityAddress);
        lecturer.setPhoneNumber(phoneNumber);

        Department dept = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new RuntimeException("Department not found with ID: " + departmentId));
        lecturer.setDepartment(dept);

        lecturerRepository.save(lecturer);

        return savedAccount;
    }

    @Transactional
    public UserAccount registerAdmin(String username, String password) {
        if (userAccountRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        UserAccount account = new UserAccount();
        account.setUsername(username);
        account.setPasswordHash(hashPassword(password));
        account.setRole(UserAccount.Role.admin);
        account.setIsActive(true);

        return userAccountRepository.save(account);
    }
}
