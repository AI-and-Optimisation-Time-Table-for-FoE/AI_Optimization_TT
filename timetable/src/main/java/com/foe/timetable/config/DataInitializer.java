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
    private StudentModuleEnrollmentRepository studentModuleEnrollmentRepository;

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private ExamTimetableRepository examTimetableRepository;

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

        // 2. Seed or Update Official Batches with Exact Faculty Data
        syncOrAddBatch("23rd", 2021, 8, 519);
        syncOrAddBatch("24th", 2022, 6, 550);
        syncOrAddBatch("25th", 2023, 4, 543);
        syncOrAddBatch("27th", 2025, 2, 553);

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

        // 4. Seed/Migrate Admin user if empty or outdated
        java.util.Optional<UserAccount> oldAdminOpt = userAccountRepository.findByUsername("admin");
        if (oldAdminOpt.isPresent()) {
            UserAccount oldAdmin = oldAdminOpt.get();
            oldAdmin.setUsername("rasika@eng.ruh.ac.lk");
            oldAdmin.setPasswordHash(authService.hashPassword("admin@857$ruh"));
            userAccountRepository.save(oldAdmin);
            System.out.println("Migrated old 'admin' user to 'rasika@eng.ruh.ac.lk' with updated password.");
        } else if (userAccountRepository.findByUsername("rasika@eng.ruh.ac.lk").isEmpty()) {
            authService.registerAdmin("rasika@eng.ruh.ac.lk", "admin@857$ruh");
            System.out.println("Seeded admin user (rasika@eng.ruh.ac.lk / admin@857$ruh).");
        }

        // 5. Seed Official Repeater Enrollments for Faculty Modules
        seedOfficialRepeaters();

        // 6. Migrate existing exam timetables with null streamScope to "ALL"
        java.util.List<ExamTimetable> allTts = examTimetableRepository.findAll();
        for (ExamTimetable tt : allTts) {
            if (tt.getStreamScope() == null || tt.getStreamScope().trim().isEmpty()) {
                tt.setStreamScope("ALL");
                examTimetableRepository.save(tt);
            }
        }
    }

    private void seedOfficialRepeaters() {
        if (studentModuleEnrollmentRepository.count() > 0) {
            return; // Already populated
        }

        java.util.List<Batch> batches = batchRepository.findAll();
        Batch batch27 = batches.stream().filter(b -> b.getBatchName() != null && b.getBatchName().contains("27")).findFirst().orElse(null);
        Batch batch25 = batches.stream().filter(b -> b.getBatchName() != null && b.getBatchName().contains("25")).findFirst().orElse(null);
        Batch batch24 = batches.stream().filter(b -> b.getBatchName() != null && b.getBatchName().contains("24")).findFirst().orElse(null);
        Batch batch23 = batches.stream().filter(b -> b.getBatchName() != null && b.getBatchName().contains("23")).findFirst().orElse(null);

        // Map of module code -> [repeaterCount, Batch, curriculumNote]
        Object[][] repeaterSpecs = new Object[][] {
            // Electrical & Information Engineering (EE)
            {"EE4351", 9, batch25, 2018, 4},
            {"EE4304", 4, batch25, 2018, 4},
            {"EE4350", 2, batch25, 2018, 4},
            {"EE6301", 2, batch24, 2018, 6},
            {"EE2201", 1, batch27, 2018, 2},
            {"EE6304", 1, batch24, 2018, 6},
            {"EE6303", 1, batch24, 2018, 6},
            {"EE4208", 1, batch25, 2023, 4},

            // Civil & Environmental Engineering (CE)
            {"CE6305", 29, batch24, 2018, 6},
            {"CE6304", 27, batch24, 2018, 6},
            {"CE6301", 16, batch24, 2018, 6},
            {"CE4302", 9, batch25, 2018, 4},
            {"CE2302", 3, batch27, 2018, 2},
            {"CE4204", 3, batch25, 2018, 4},
            {"CE4303", 2, batch25, 2018, 4},
            {"CE6252", 2, batch24, 2018, 6},
            {"CE6253", 2, batch24, 2018, 6},
            {"CE4251", 2, batch25, 2018, 4},

            // Mechanical & Manufacturing / Marine (ME/MN) & Interdisciplinary (IS)
            {"IS4307", 119, batch25, 2018, 4},
            {"IS4304", 11, batch25, 2018, 4},
            {"ME4210", 4, batch25, 2018, 4},
            {"ME6303", 3, batch24, 2018, 6},
            {"ME6302", 3, batch24, 2018, 6},
            {"ME6206", 3, batch24, 2018, 6},
            {"ME4301", 2, batch25, 2018, 4},
            {"ME6304", 1, batch24, 2018, 6},
            {"IS6201", 1, batch24, 2018, 6},
            {"MN4304", 1, batch25, 2018, 4},
            {"MN4210", 1, batch24, 2018, 6}
        };

        int totalSeeded = 0;
        for (Object[] spec : repeaterSpecs) {
            String modCode = (String) spec[0];
            int count = (Integer) spec[1];
            Batch targetBatch = (Batch) spec[2];
            int currYear = (Integer) spec[3];
            int sem = (Integer) spec[4];

            if (targetBatch == null) continue;

            com.foe.timetable.model.Module mod = moduleRepository.findByModuleCode(modCode).orElse(null);
            if (mod == null) {
                mod = new com.foe.timetable.model.Module();
                mod.setModuleCode(modCode);
                mod.setModuleName(modCode + " (Official Course Module)");
                mod.setSemester(sem);
                mod.setCreditHours(3);
                mod.setLectureHoursPerWeek(3);
                mod.setLabHoursPerWeek(0);
                mod.setDepartment(departmentRepository.findAll().stream().findFirst().orElse(null));
                mod = moduleRepository.save(mod);
            }

            int baseReg = 3800 + (currYear % 100) * 10;
            for (int i = 1; i <= count; i++) {
                String regNo = "EG/" + currYear + "/" + String.format("%04d", baseReg + i);
                String email = "repeat_" + modCode.toLowerCase() + "_" + i + "@eng.ruh.ac.lk";
                StudentModuleEnrollment en = new StudentModuleEnrollment(
                    regNo,
                    email,
                    targetBatch,
                    mod,
                    StudentModuleEnrollment.EnrollmentType.repeat,
                    String.valueOf(targetBatch.getAcademicYear())
                );
                studentModuleEnrollmentRepository.save(en);
                totalSeeded++;
            }
        }
        System.out.println("Seeded " + totalSeeded + " official repeat candidates across Faculty modules.");
    }

    private void syncOrAddBatch(String batchName, int academicYear, int semester, int studentCount) {
        java.util.List<Batch> existingBatches = batchRepository.findAll();
        Batch matched = existingBatches.stream()
            .filter(b -> {
                if (b.getBatchName() == null) return false;
                String bName = b.getBatchName().toLowerCase().replaceAll("\\s+", "");
                String target = batchName.toLowerCase().replaceAll("\\s+", "");
                return bName.equals(target) || bName.equals("batch" + target) || bName.equals(target.replace("rd", "").replace("th", "")) ||
                       bName.equals("batch" + target.replace("rd", "").replace("th", ""));
            })
            .findFirst()
            .orElse(null);

        if (matched != null) {
            matched.setBatchName(batchName);
            matched.setAcademicYear(academicYear);
            matched.setSemester(semester);
            matched.setStudentCount(studentCount);
            matched.setStatus("active");
            batchRepository.save(matched);
            System.out.println("Synchronized batch " + batchName + " size: " + studentCount + " students.");
        } else {
            Batch b = new Batch();
            b.setBatchName(batchName);
            b.setAcademicYear(academicYear);
            b.setSemester(semester);
            b.setStudentCount(studentCount);
            b.setStatus("active");
            b.setLunchStartTime("12:30");
            b.setLunchEndTime("13:30");
            batchRepository.save(b);
            System.out.println("Created official batch " + batchName + " with " + studentCount + " students.");
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
