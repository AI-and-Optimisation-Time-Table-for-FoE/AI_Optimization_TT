package com.foe.timetable.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.foe.timetable.model.*;
import com.foe.timetable.repository.*;
import com.foe.timetable.service.AuthService;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private HallRepository hallRepository;

    @Autowired
    private AuthService authService;

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed Departments if empty or missing Computer Dept
        if (departmentRepository.count() == 0) {
            Department d1 = new Department(); d1.setFacultyId(1); d1.setDepartmentCode("EIE"); d1.setDepartmentName("Electrical & Information Engineering"); departmentRepository.save(d1);
            Department d2 = new Department(); d2.setFacultyId(1); d2.setDepartmentCode("EC"); d2.setDepartmentName("Electronic & Telecommunication Engineering"); departmentRepository.save(d2);
            Department d3 = new Department(); d3.setFacultyId(1); d3.setDepartmentCode("ME"); d3.setDepartmentName("Mechanical & Manufacturing Engineering"); departmentRepository.save(d3);
            Department d4 = new Department(); d4.setFacultyId(1); d4.setDepartmentCode("CE"); d4.setDepartmentName("Civil & Environmental Engineering"); departmentRepository.save(d4);
            Department d5 = new Department(); d5.setFacultyId(1); d5.setDepartmentCode("IS"); d5.setDepartmentName("Information System"); departmentRepository.save(d5);
            Department d6 = new Department(); d6.setFacultyId(1); d6.setDepartmentCode("COM"); d6.setDepartmentName("Computer Department"); departmentRepository.save(d6);
            System.out.println("Seeded default departments into database.");
        } else if (departmentRepository.findAll().stream().noneMatch(d -> "COM".equalsIgnoreCase(d.getDepartmentCode()) || d.getDepartmentName().toLowerCase().contains("computer"))) {
            Department d6 = new Department(); d6.setFacultyId(1); d6.setDepartmentCode("COM"); d6.setDepartmentName("Computer Department"); departmentRepository.save(d6);
            System.out.println("Seeded Computer Department into database.");
        }

        // 2. Seed Batches if empty
        if (batchRepository.count() == 0) {
            Batch b1 = new Batch(); b1.setBatchName("Batch 24"); b1.setAcademicYear(2024); b1.setSemester(4); b1.setStudentCount(160); batchRepository.save(b1);
            Batch b2 = new Batch(); b2.setBatchName("Batch 27"); b2.setAcademicYear(2025); b2.setSemester(1); b2.setStudentCount(180); batchRepository.save(b2);
            System.out.println("Seeded default batches into database.");
        }

        // 3. Seed Halls if empty
        if (hallRepository.count() == 0) {
            createHall("Auditorium", "AUDI", 550, Hall.HallType.lecture, false);
            createHall("Lecture Theatre 1", "LT1", 300, Hall.HallType.lecture, false);
            createHall("Lecture Theatre 2", "LT2", 300, Hall.HallType.lecture, false);
            createHall("Drawing Office - 1", "DO1", 150, Hall.HallType.lecture, false);
            createHall("Drawing Office - 2", "DO2", 150, Hall.HallType.lecture, false);
            createHall("New Computer Centre", "NCC", 275, Hall.HallType.lecture, true);
            createHall("Lecture Room 1", "LR1", 130, Hall.HallType.lecture, false);
            createHall("Lecture Room 2", "LR2", 130, Hall.HallType.lecture, false);
            createHall("New Lecture Hall 1", "NLH1", 125, Hall.HallType.lecture, false);
            createHall("New Lecture Hall 2", "NLH2", 100, Hall.HallType.lecture, false);
            System.out.println("Seeded default main exam halls into database.");
        }

        // 4. Seed Admin user if empty
        if (userAccountRepository.findByUsername("admin").isEmpty()) {
            authService.registerAdmin("admin", "admin");
            System.out.println("Seeded default admin user (admin / admin).");
        }
    }

    private void createHall(String name, String code, int capacity, Hall.HallType type, boolean isComp) {
        Hall h = new Hall();
        h.setHallName(name);
        h.setHallCode(code);
        h.setCapacity(capacity);
        h.setHallType(type);
        h.setIsComputerLab(isComp);
        h.setIsActive(true);
        hallRepository.save(h);
    }
}
