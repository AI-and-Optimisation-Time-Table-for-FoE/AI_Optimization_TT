/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.7.2-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: foe_timetable_scheduler
-- ------------------------------------------------------
-- Server version	11.7.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `batch`
--

DROP TABLE IF EXISTS `batch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch` (
  `batch_id` int(11) NOT NULL AUTO_INCREMENT,
  `batch_name` varchar(50) NOT NULL,
  `academic_year` year(4) NOT NULL,
  `semester` tinyint(4) NOT NULL,
  `student_count` int(11) NOT NULL DEFAULT 0,
  `status` enum('active','inactive','graduated') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`batch_id`),
  KEY `idx_batch_status` (`status`),
  CONSTRAINT `chk_student_count` CHECK (`student_count` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch`
--

LOCK TABLES `batch` WRITE;
/*!40000 ALTER TABLE `batch` DISABLE KEYS */;
/*!40000 ALTER TABLE `batch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batch_module`
--

DROP TABLE IF EXISTS `batch_module`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_module` (
  `batch_module_id` int(11) NOT NULL AUTO_INCREMENT,
  `batch_id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `lecturer_id` int(11) NOT NULL,
  `academic_year` year(4) NOT NULL,
  `semester` tinyint(4) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`batch_module_id`),
  UNIQUE KEY `uq_batch_module` (`batch_id`,`module_id`,`academic_year`,`semester`),
  KEY `idx_bm_batch` (`batch_id`),
  KEY `idx_bm_module` (`module_id`),
  KEY `idx_bm_lecturer` (`lecturer_id`),
  CONSTRAINT `fk_bm_batch` FOREIGN KEY (`batch_id`) REFERENCES `batch` (`batch_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_bm_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturer` (`lecturer_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_bm_module` FOREIGN KEY (`module_id`) REFERENCES `module` (`module_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Central pivot: which batch studies which module with which lecturer';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_module`
--

LOCK TABLES `batch_module` WRITE;
/*!40000 ALTER TABLE `batch_module` DISABLE KEYS */;
/*!40000 ALTER TABLE `batch_module` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `constraint_rule`
--

DROP TABLE IF EXISTS `constraint_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `constraint_rule` (
  `constraint_id` int(11) NOT NULL AUTO_INCREMENT,
  `constraint_name` varchar(100) NOT NULL,
  `constraint_type` enum('hard','soft') NOT NULL,
  `priority_level` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `constraint_value` text DEFAULT NULL COMMENT 'JSON rule value',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`constraint_id`),
  UNIQUE KEY `uq_constraint_name` (`constraint_name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin-configurable rules for the AI optimization engine';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `constraint_rule`
--

LOCK TABLES `constraint_rule` WRITE;
/*!40000 ALTER TABLE `constraint_rule` DISABLE KEYS */;
INSERT INTO `constraint_rule` VALUES
(1,'Hall capacity must exceed batch size','hard','high','{\"rule\":\"hall.capacity >= batch.student_count\"}',1,'2026-06-06 09:43:06','2026-06-06 09:43:06'),
(2,'No lecturer double booking','hard','high','{\"rule\":\"lecturer cannot teach two sessions same slot\"}',1,'2026-06-06 09:43:06','2026-06-06 09:43:06'),
(3,'No hall double booking','hard','high','{\"rule\":\"hall cannot host two sessions same slot\"}',1,'2026-06-06 09:43:06','2026-06-06 09:43:06'),
(4,'No batch double booking','hard','high','{\"rule\":\"batch cannot have two sessions same slot\"}',1,'2026-06-06 09:43:06','2026-06-06 09:43:06'),
(5,'Max lecture hours per day per batch','hard','high','{\"max_hours_per_day\":4}',1,'2026-06-06 09:43:06','2026-06-06 09:43:06'),
(6,'No lectures before 08:00','hard','high','{\"earliest_start\":\"08:00\"}',1,'2026-06-06 09:43:06','2026-06-06 09:43:06'),
(7,'No lectures after 17:00','hard','high','{\"latest_end\":\"17:00\"}',1,'2026-06-06 09:43:06','2026-06-06 09:43:06'),
(8,'Respect lecturer unavailability','hard','high','{\"rule\":\"check lecturer_unavailability table\"}',1,'2026-06-06 09:43:06','2026-06-06 09:43:06'),
(9,'Respect hall unavailability','hard','high','{\"rule\":\"check hall_unavailability table\"}',1,'2026-06-06 09:43:06','2026-06-06 09:43:06'),
(10,'Minimize student long breaks','soft','high','{\"max_break_minutes\":60}',1,'2026-06-06 09:43:06','2026-06-06 09:43:06'),
(11,'Prefer lecturer preferred slots','soft','medium','{\"rule\":\"maximize lecturer_preference preferred slots\"}',1,'2026-06-06 09:43:06','2026-06-06 09:43:06'),
(12,'No back-to-back labs for same batch','soft','medium','{\"max_consecutive_lab_slots\":1}',1,'2026-06-06 09:43:06','2026-06-06 09:43:06'),
(13,'Distribute lectures evenly across week','soft','low','{\"rule\":\"spread sessions across Mon-Fri\"}',1,'2026-06-06 09:43:06','2026-06-06 09:43:06');
/*!40000 ALTER TABLE `constraint_rule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `department`
--

DROP TABLE IF EXISTS `department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `department` (
  `department_id` int(11) NOT NULL AUTO_INCREMENT,
  `faculty_id` int(11) NOT NULL,
  `department_name` varchar(100) NOT NULL,
  `department_code` varchar(10) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `uq_dept_code` (`department_code`),
  KEY `fk_dept_faculty` (`faculty_id`),
  CONSTRAINT `fk_dept_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`faculty_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Academic departments within a faculty';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `department`
--

LOCK TABLES `department` WRITE;
/*!40000 ALTER TABLE `department` DISABLE KEYS */;
INSERT INTO `department` VALUES
(1,1,'Department of Civil and Environmental Engineering','CE','2026-06-06 05:49:15'),
(2,1,'Department of Electrical and Information Engineering','EE','2026-06-06 05:49:15'),
(3,1,'Department of Mechanical and Manufacturing Engineering','ME','2026-06-06 05:49:15'),
(4,1,'Department of Interdisciplinary Studies','IS','2026-06-06 05:49:15'),
(5,1,'Department of Marine Engineering and Naval Architecture','MN','2026-06-06 05:49:15'),
(6,1,'Department of Computer Engineering','EC','2026-06-06 05:49:15');
/*!40000 ALTER TABLE `department` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `faculty`
--

DROP TABLE IF EXISTS `faculty`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `faculty` (
  `faculty_id` int(11) NOT NULL AUTO_INCREMENT,
  `faculty_name` varchar(100) NOT NULL,
  `faculty_code` varchar(10) NOT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`faculty_id`),
  UNIQUE KEY `uq_faculty_code` (`faculty_code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Top-level academic unit e.g. Faculty of Engineering';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `faculty`
--

LOCK TABLES `faculty` WRITE;
/*!40000 ALTER TABLE `faculty` DISABLE KEYS */;
INSERT INTO `faculty` VALUES
(1,'Faculty of Engineering','FOE','foeadmin@gmail.com','2026-06-06 04:27:14');
/*!40000 ALTER TABLE `faculty` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `generation_log`
--

DROP TABLE IF EXISTS `generation_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `generation_log` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `timetable_id` int(11) NOT NULL,
  `algorithm_used` enum('genetic_algorithm','simulated_annealing','csp','tabu_search','greedy') NOT NULL,
  `iterations` int(11) NOT NULL DEFAULT 0,
  `fitness_score` float DEFAULT NULL COMMENT 'Higher = better quality',
  `conflicts_resolved` int(11) NOT NULL DEFAULT 0,
  `duration_seconds` int(11) NOT NULL DEFAULT 0,
  `generated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `idx_gl_timetable` (`timetable_id`),
  CONSTRAINT `fk_gl_timetable` FOREIGN KEY (`timetable_id`) REFERENCES `timetable` (`timetable_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit log for each AI timetable generation run';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `generation_log`
--

LOCK TABLES `generation_log` WRITE;
/*!40000 ALTER TABLE `generation_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `generation_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hall`
--

DROP TABLE IF EXISTS `hall`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `hall` (
  `hall_id` int(11) NOT NULL AUTO_INCREMENT,
  `hall_name` varchar(100) NOT NULL,
  `hall_code` varchar(10) NOT NULL,
  `capacity` int(11) NOT NULL,
  `hall_type` enum('lecture','lab','tutorial') NOT NULL,
  `has_projector` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`hall_id`),
  UNIQUE KEY `uq_hall_code` (`hall_code`),
  CONSTRAINT `chk_capacity` CHECK (`capacity` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Physical venue — capacity and type matched by optimizer';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hall`
--

LOCK TABLES `hall` WRITE;
/*!40000 ALTER TABLE `hall` DISABLE KEYS */;
INSERT INTO `hall` VALUES
(35,'Auditorium','AUDI',550,'lecture',1,1,'2026-06-06 04:49:48'),
(36,'Lecture Theatre – 1','LT1',300,'lecture',1,1,'2026-06-06 04:49:48'),
(37,'Lecture Theatre – 2','LT2',300,'lecture',1,1,'2026-06-06 04:49:48'),
(38,'Lecture Room – 1','LR1',130,'lecture',1,1,'2026-06-06 04:49:48'),
(39,'Lecture Room – 2','LR2',130,'lecture',1,1,'2026-06-06 04:49:48'),
(40,'Drawing Office - 1','DO1',150,'lecture',1,1,'2026-06-06 04:49:48'),
(41,'Drawing Office - 2','DO2',150,'lecture',1,1,'2026-06-06 04:49:48'),
(42,'Electrical seminar room','ESR',75,'lecture',1,1,'2026-06-06 04:49:48'),
(43,'Electrical Computer Centre','ECC',80,'lecture',1,1,'2026-06-06 04:49:48'),
(44,'New Lecture Hall 2','NLH2',100,'lecture',1,1,'2026-06-06 04:49:48'),
(45,'Civil COBEU','COBEU',130,'lecture',1,1,'2026-06-06 04:49:48'),
(46,'Electrical Lecture Room','ELR',80,'lecture',1,1,'2026-06-06 04:49:48'),
(47,'Mechanical Lecture Room','MLR',100,'lecture',1,1,'2026-06-06 04:49:48'),
(48,'Audio Visual Centre','AVC',30,'lecture',1,1,'2026-06-06 04:49:48'),
(49,'Old Computer Centre','OCC',150,'lecture',1,1,'2026-06-06 04:49:48'),
(50,'New Lecture Hall 1','NLH1',125,'lecture',1,1,'2026-06-06 04:49:48'),
(51,'New Computer Centre','NCC',275,'lecture',1,1,'2026-06-06 04:49:48');
/*!40000 ALTER TABLE `hall` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hall_unavailability`
--

DROP TABLE IF EXISTS `hall_unavailability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `hall_unavailability` (
  `unavail_id` int(11) NOT NULL AUTO_INCREMENT,
  `hall_id` int(11) NOT NULL,
  `slot_id` int(11) NOT NULL,
  `specific_date` date DEFAULT NULL COMMENT 'NULL = applies every week',
  `is_recurring` tinyint(1) NOT NULL DEFAULT 0,
  `reason` varchar(200) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`unavail_id`),
  KEY `fk_hu_slot` (`slot_id`),
  KEY `idx_hu_hall` (`hall_id`),
  CONSTRAINT `fk_hu_hall` FOREIGN KEY (`hall_id`) REFERENCES `hall` (`hall_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hu_slot` FOREIGN KEY (`slot_id`) REFERENCES `time_slot` (`slot_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hard blocks: hall cannot be used in these slots';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hall_unavailability`
--

LOCK TABLES `hall_unavailability` WRITE;
/*!40000 ALTER TABLE `hall_unavailability` DISABLE KEYS */;
/*!40000 ALTER TABLE `hall_unavailability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lecturer`
--

DROP TABLE IF EXISTS `lecturer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `lecturer` (
  `lecturer_id` int(11) NOT NULL AUTO_INCREMENT,
  `department_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `max_hours_per_week` int(11) NOT NULL DEFAULT 20,
  `specialization` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`lecturer_id`),
  UNIQUE KEY `uq_lecturer_email` (`email`),
  UNIQUE KEY `uq_lecturer_user` (`user_id`),
  KEY `idx_lecturer_dept` (`department_id`),
  CONSTRAINT `fk_lecturer_dept` FOREIGN KEY (`department_id`) REFERENCES `department` (`department_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_lecturer_user` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_max_hours` CHECK (`max_hours_per_week` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lecturer`
--

LOCK TABLES `lecturer` WRITE;
/*!40000 ALTER TABLE `lecturer` DISABLE KEYS */;
INSERT INTO `lecturer` VALUES
(1,1,1,'nirosha.m@university.edu',20,'Building Planning and Cost Estimating','2026-06-06 06:55:40','Prof. Nirosha Malkanthi'),
(2,1,2,'harsha.s@university.edu',20,'Design of Concrete Structures I','2026-06-06 06:55:40','Dr. Harsha Sooriyaarachchi'),
(3,1,3,'sushan.m@university.edu',20,'Engineering Geology and Soil Mechanics','2026-06-06 06:55:40','Dr. H. G. Sushan Mayuranga'),
(4,1,4,'appuhamy.j@university.edu',20,'Structural Analysis II','2026-06-06 06:55:40','Prof. J. M. R. S. Appuhamy'),
(5,1,5,'nuwan.s@university.edu',20,'Structural Analysis II','2026-06-06 06:55:40','Dr. H.V.A. Nuwan Sanjeewa'),
(6,1,6,'bandara.w@university.edu',20,'Water and Wastewater Engineering','2026-06-06 06:55:40','Prof. W.M.K.R.T.W. Bandara'),
(7,1,7,'tushara.c@university.edu',20,'Water and Wastewater Engineering','2026-06-06 06:55:40','Prof. G.G. Tushara Chaminda'),
(8,1,8,'arunoda@cee.ruh.ac.lk',20,'Fundamentals of Fluid Mechanics (CE 2201)','2026-06-06 06:59:21','Dr. B.M.L.A. Basnayake'),
(9,1,9,'wanniarachchi@cee.ruh.ac.lk',20,'Mechanics of Materials (CE 2302)','2026-06-06 06:59:21','Prof. K.S. Wanniarachchi'),
(10,2,10,'subodha@eie.ruh.ac.lk',20,'Fundamentals of Electronics (EE 2201)','2026-06-06 06:59:21','Dr. Subodha Gunawardhena'),
(11,2,11,'rajitha@eie.ruh.ac.lk',20,'Object Oriented Programming (EE 2202)','2026-06-06 06:59:21','Dr. Rajitha Udawalpola'),
(12,3,12,'sanath@mme.ruh.ac.lk',20,'Engineering Mechanics (ME 2201)','2026-06-06 06:59:21','Dr. Y.S.K. De Silva'),
(13,3,13,'rgallage@mme.ruh.ac.lk',20,'Fundamentals of Materials and Manufacturing Engineering (ME 2302)','2026-06-06 06:59:21','Prof. P.G.C.R. Gallage'),
(14,4,14,'bandaradms@is.ruh.ac.lk',20,'Linear Algebra and Differential Equations (IS 2401)','2026-06-06 06:59:21','Mr. D.M.S. Bandara'),
(15,2,15,'seneviratne.c@university.edu',20,'Analog and Digital Communication (EE4201)','2026-06-06 07:00:46','Dr. C.K.W. Seneviratne'),
(16,2,16,'gevin.h@university.edu',20,'Computer Architecture and Organization (EE4202)','2026-06-06 07:00:46','Mr. Gevin Harindu'),
(17,2,17,'sandamali.g@university.edu',20,'Database Systems (EE4203)','2026-06-06 07:00:46','Dr. G.G.N. Sandamali'),
(18,2,18,'neel.k@university.edu',20,'Digital Logic Design (EE4304)','2026-06-06 07:00:46','Mr. Neel Karunasena'),
(19,2,19,'konara.k@university.edu',20,'Electric Machines (EE4305)','2026-06-06 07:00:46','Dr. K.M.Y.S. Konara'),
(20,2,20,'chamod.d@university.edu',20,'Engineering Design Methodology (EE4206)','2026-06-06 07:00:46','Mr. Chamod Dissanyake'),
(21,2,21,'yugani.g@university.edu',20,'Web Application Development (EE4207)','2026-06-06 07:00:46','Ms. Yugani Gamlath'),
(22,6,22,'tharindu.g@university.edu',20,'Advanced Data Structures and Algorithms (EC4201)','2026-06-06 07:00:46','Mr. Tharindu Gamage');
/*!40000 ALTER TABLE `lecturer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lecturer_preference`
--

DROP TABLE IF EXISTS `lecturer_preference`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `lecturer_preference` (
  `pref_id` int(11) NOT NULL AUTO_INCREMENT,
  `lecturer_id` int(11) NOT NULL,
  `slot_id` int(11) NOT NULL,
  `preference_level` enum('preferred','neutral','avoid') NOT NULL DEFAULT 'neutral',
  `reason` varchar(200) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`pref_id`),
  UNIQUE KEY `uq_lect_pref` (`lecturer_id`,`slot_id`),
  KEY `fk_lp_slot` (`slot_id`),
  KEY `idx_lp_lecturer` (`lecturer_id`),
  CONSTRAINT `fk_lp_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturer` (`lecturer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_lp_slot` FOREIGN KEY (`slot_id`) REFERENCES `time_slot` (`slot_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Soft constraints: lecturer time-slot preferences for the optimizer';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lecturer_preference`
--

LOCK TABLES `lecturer_preference` WRITE;
/*!40000 ALTER TABLE `lecturer_preference` DISABLE KEYS */;
/*!40000 ALTER TABLE `lecturer_preference` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lecturer_unavailability`
--

DROP TABLE IF EXISTS `lecturer_unavailability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `lecturer_unavailability` (
  `unavail_id` int(11) NOT NULL AUTO_INCREMENT,
  `lecturer_id` int(11) NOT NULL,
  `slot_id` int(11) NOT NULL,
  `specific_date` date DEFAULT NULL COMMENT 'NULL = applies every week',
  `is_recurring` tinyint(1) NOT NULL DEFAULT 0,
  `reason` varchar(200) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`unavail_id`),
  KEY `fk_lu_slot` (`slot_id`),
  KEY `idx_lu_lecturer` (`lecturer_id`),
  CONSTRAINT `fk_lu_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturer` (`lecturer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_lu_slot` FOREIGN KEY (`slot_id`) REFERENCES `time_slot` (`slot_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hard blocks: lecturer cannot be scheduled in these slots';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lecturer_unavailability`
--

LOCK TABLES `lecturer_unavailability` WRITE;
/*!40000 ALTER TABLE `lecturer_unavailability` DISABLE KEYS */;
/*!40000 ALTER TABLE `lecturer_unavailability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `module`
--

DROP TABLE IF EXISTS `module`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `module` (
  `module_id` int(11) NOT NULL AUTO_INCREMENT,
  `department_id` int(11) NOT NULL,
  `module_code` varchar(15) NOT NULL,
  `module_name` varchar(100) NOT NULL,
  `credit_hours` int(11) NOT NULL,
  `lecture_hours_per_week` int(11) NOT NULL DEFAULT 0,
  `lab_hours_per_week` int(11) NOT NULL DEFAULT 0,
  `session_type` enum('lecture','lab','tutorial','mixed') NOT NULL DEFAULT 'lecture',
  `semester` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`module_id`),
  UNIQUE KEY `uq_module_code` (`module_code`),
  KEY `idx_module_dept` (`department_id`),
  CONSTRAINT `fk_module_dept` FOREIGN KEY (`department_id`) REFERENCES `department` (`department_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_credit_hours` CHECK (`credit_hours` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=211 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Academic subject with credit and session type metadata';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `module`
--

LOCK TABLES `module` WRITE;
/*!40000 ALTER TABLE `module` DISABLE KEYS */;
INSERT INTO `module` VALUES
(9,1,'CE 2201','Fundamentals of Fluid Mechanics',2,2,0,'lecture',2,'2026-06-06 06:02:32'),
(10,1,'CE 2302','Mechanics of Materials',3,3,0,'lecture',2,'2026-06-06 06:02:32'),
(11,2,'EE 2201','Fundamentals of Electronics',2,2,0,'lecture',2,'2026-06-06 06:02:32'),
(12,2,'EE 2202','Object Oriented Programming',2,2,0,'lecture',2,'2026-06-06 06:02:32'),
(13,3,'ME 2201','Engineering Mechanics',2,2,0,'lecture',2,'2026-06-06 06:02:32'),
(14,3,'ME 2302','Fundamentals of Materials and Manufacturing Engineering',3,3,0,'lecture',2,'2026-06-06 06:02:32'),
(15,4,'IS 2401','Linear Algebra and Differential Equations',4,4,0,'lecture',2,'2026-06-06 06:02:32'),
(16,4,'IS 1003','Proficiency in English',1,1,0,'lecture',1,'2026-06-06 06:02:32'),
(114,1,'CE4301','Building Planning and Cost Estimating',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(115,1,'CE4302','Design of Concrete Structures I',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(116,1,'CE4303','Engineering Geology and Soil Mechanics',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(117,1,'CE4304','Structural Analysis II',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(118,1,'CE4305','Water and Wastewater Engineering',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(119,2,'EE4201','Analog and Digital Communication',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(120,2,'EE4202','Computer Architecture and Operating Systems',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(121,6,'EC4202','Computer Architecture and Operating System',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(122,2,'EE4203','Database Systems',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(123,6,'EC4203','Database Systems',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(124,2,'EE4304','Digital Logic Design',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(125,6,'EC4304','Digital Logic Design',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(126,2,'EE4305','Electric Machines',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(127,2,'EE4206','Engineering Design Methodology',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(128,2,'EE4207','Web Application Development',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(129,6,'EC4201','Advanced Data Structures and Algorithm',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(130,6,'EC4205','Software Engineering Principles',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(131,6,'EC4206','Software Testing and Quality Assurance',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(132,6,'EC4207','Web Application Development',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(133,3,'ME4301','Advanced Materials Engineering',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(134,3,'ME4302','Design of Machine Elements',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(135,3,'ME4303','Manufacturing Engineering',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(136,3,'ME4304','Mechanics of Machines',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(137,3,'ME4305','Modelling and Analysis of Dynamic Systems',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(138,3,'ME4210','Analog and Digital Electronics(TE)',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(139,3,'ME4211','Automobile Engineering(TE)',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(140,3,'ME4212','Nanotechnology(TE)',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(141,5,'MN4201','Applied Thermodynamics',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(142,5,'MN4202','Maritime English - II',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(143,5,'MN4303','Marine Engineering Computer Aided Drawing',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(144,5,'MN4304','Engineering Knowledge (General) II',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(145,5,'MN4205','Mechanics of Machines',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(146,5,'MN4306','Ship Design and Construction Technology - I',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(147,5,'MN4307','Engineering Knowledge (Motor) II',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(148,5,'MN4210','Analog and Digital Electronics (TE)',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(149,4,'IS4322','Basic Economics',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(150,4,'IS4301','Probability and Statistics',3,3,0,'lecture',4,'2026-06-06 06:43:36'),
(151,4,'IS4227','Technology and Society (GE)',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(152,4,'IS4224','Finance Management',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(153,4,'IS4225','Innovation Management',2,2,0,'lecture',4,'2026-06-06 06:43:36'),
(154,4,'IS4128','Sociology',1,1,0,'lecture',4,'2026-06-06 06:43:36'),
(155,4,'IS4129','History of Engineers in Sri Lanka',1,1,0,'lecture',4,'2026-06-06 06:43:36'),
(156,4,'IS4126','Mindfulness',1,1,0,'lecture',4,'2026-06-06 06:43:36'),
(157,1,'CE6301','Design of Concrete Structures II',3,3,0,'lecture',6,'2026-06-06 06:43:36'),
(158,1,'CE6302','Engineering Hydrology',3,3,0,'lecture',6,'2026-06-06 06:43:36'),
(159,1,'CE6303','Environmental Engineering Design',3,3,0,'lecture',6,'2026-06-06 06:43:36'),
(160,1,'CE6304','Geotechnical Engineering',3,3,0,'lecture',6,'2026-06-06 06:43:36'),
(161,1,'CE6252','Dynamic and Control of Structures (TE)',2,2,0,'lecture',6,'2026-06-06 06:43:36'),
(162,1,'CE6253','Sustainable Built Environment principles (TE)',2,2,0,'lecture',6,'2026-06-06 06:43:36'),
(163,2,'EE5206','Software Project (Continued)',2,2,0,'lecture',5,'2026-06-06 06:43:36'),
(164,2,'EE6301','Computer Networks',3,3,0,'lecture',6,'2026-06-06 06:43:36'),
(165,2,'EE6302','Control Systems Design',3,3,0,'lecture',6,'2026-06-06 06:43:36'),
(166,2,'EE6203','Digital Signal Processing',2,2,0,'lecture',6,'2026-06-06 06:43:36'),
(167,2,'EE6304','Embedded Systems Design',3,3,0,'lecture',6,'2026-06-06 06:43:36'),
(168,2,'EE6305','Artificial Intelligence (TE)',3,3,0,'lecture',6,'2026-06-06 06:43:36'),
(169,2,'EE6206','Energy Economics (TE)',2,2,0,'lecture',6,'2026-06-06 06:43:36'),
(170,2,'EE6207','Information Security (TE)',2,2,0,'lecture',6,'2026-06-06 06:43:36'),
(171,2,'EE6208','Introduction to Biomedical Engineering (TE)',2,2,0,'lecture',6,'2026-06-06 06:43:36'),
(172,2,'EE6309','Renewable Energy Systems (TE)',3,3,0,'lecture',6,'2026-06-06 06:43:36'),
(173,2,'EE6210','Wireless and Mobile Communications (TE)',2,2,0,'lecture',6,'2026-06-06 06:43:36'),
(174,3,'ME6201','Advanced Fluid Mechanics',2,2,0,'lecture',6,'2026-06-06 06:43:36'),
(175,3,'ME6302','Computer Aided Manufacturing',3,3,0,'lecture',6,'2026-06-06 06:43:36'),
(176,3,'ME6303','Electrical Machines',3,3,0,'lecture',6,'2026-06-06 06:43:36'),
(177,3,'ME6104','Industry-based Project',1,1,0,'lecture',6,'2026-06-06 06:43:36'),
(178,3,'ME6305','Maintenance Management',3,3,0,'lecture',6,'2026-06-06 06:43:36'),
(179,3,'ME6206','Power Hydraulics',2,2,0,'lecture',6,'2026-06-06 06:43:36'),
(180,3,'ME6207','Solid Mechanics',2,2,0,'lecture',6,'2026-06-06 06:43:36'),
(181,3,'ME6214','Naval Architecture and basic hull design(TE)',2,2,0,'lecture',6,'2026-06-06 06:43:36'),
(182,3,'ME6215','Technical Report Writing and Presentation(GE)(TE)',2,2,0,'lecture',6,'2026-06-06 06:43:36'),
(183,3,'ME6210','Industrial Automation (T.E)',2,2,0,'lecture',6,'2026-06-06 06:43:36'),
(184,1,'CE8301','Construction Management',3,3,0,'lecture',8,'2026-06-06 06:43:36'),
(185,1,'CE7401','Comprehensive Design Project',4,4,0,'lecture',7,'2026-06-06 06:43:36'),
(186,1,'CE7606','Undergraduate Research Project (Continuation)',6,6,0,'lecture',7,'2026-06-06 06:43:36'),
(187,1,'CE7205','Introduction to Research Methodology (Continuation)',2,2,0,'lecture',7,'2026-06-06 06:43:36'),
(188,2,'EE7208','Introduction to Research (TE)',2,2,0,'lecture',7,'2026-06-06 06:43:36'),
(189,2,'EE7802','Undergraduate Project',8,8,0,'lecture',7,'2026-06-06 06:43:36'),
(190,2,'EE8203','Design and Management of Data Networks (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(191,2,'EE8204','Digital Communication (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(192,2,'EE8206','Electrical Installations II (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(193,2,'EE8308','High Voltage Engineering (TE)',3,3,0,'lecture',8,'2026-06-06 06:43:36'),
(194,2,'EE8210','Intelligent System Design (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(195,2,'EE8211','Microwave Communications (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(196,2,'EE8217','Software Architecture (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(197,6,'EC7802','Undergraduate Project',8,8,0,'lecture',7,'2026-06-06 06:43:36'),
(198,6,'EC8202','Big Data and Analytic (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(199,6,'EC8204','Blockchain and Cyber Security (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(200,6,'EC8205','Design and Management of Data Networks (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(201,6,'EC8206','Functional Programming (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(202,6,'EC8207','IC Design (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(203,6,'EC8208','Software Architecture (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(204,3,'ME8301','Building Services Engineering',3,3,0,'lecture',8,'2026-06-06 06:43:36'),
(205,3,'ME8202','Lean Manufacturing and Supply Chain Management',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(206,3,'ME8211','Energy Management (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(207,3,'ME8212','Non Destructive Testing Applications (TE)',2,2,0,'lecture',8,'2026-06-06 06:43:36'),
(208,3,'ME7401','Final Year Design Project(Continuation)',4,4,0,'lecture',7,'2026-06-06 06:43:36'),
(209,3,'ME7604','Capstone Project(Continuation)',6,6,0,'lecture',7,'2026-06-06 06:43:36'),
(210,3,'ME8213','Robot Manipulator Kinematics (T.E.)',2,2,0,'lecture',8,'2026-06-06 06:43:36');
/*!40000 ALTER TABLE `module` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `time_slot`
--

DROP TABLE IF EXISTS `time_slot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `time_slot` (
  `slot_id` int(11) NOT NULL AUTO_INCREMENT,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `duration_minutes` smallint(6) NOT NULL,
  `slot_number` tinyint(4) NOT NULL COMMENT 'Ordering within the day',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`slot_id`),
  UNIQUE KEY `uq_time_slot` (`day_of_week`,`start_time`,`end_time`),
  CONSTRAINT `chk_slot_time` CHECK (`end_time` > `start_time`),
  CONSTRAINT `chk_duration` CHECK (`duration_minutes` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='All possible scheduling time blocks across the week';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `time_slot`
--

LOCK TABLES `time_slot` WRITE;
/*!40000 ALTER TABLE `time_slot` DISABLE KEYS */;
INSERT INTO `time_slot` VALUES
(1,'Monday','08:30:00','09:30:00',60,1,'2026-06-06 11:37:16'),
(2,'Monday','09:30:00','10:30:00',60,2,'2026-06-06 11:37:16'),
(3,'Monday','10:30:00','11:30:00',60,3,'2026-06-06 11:37:16'),
(4,'Monday','11:30:00','12:30:00',60,4,'2026-06-06 11:37:16'),
(5,'Monday','12:30:00','13:30:00',60,5,'2026-06-06 11:37:16'),
(6,'Monday','13:30:00','14:30:00',60,6,'2026-06-06 11:37:16'),
(7,'Monday','14:30:00','15:30:00',60,7,'2026-06-06 11:37:16'),
(8,'Monday','15:30:00','16:30:00',60,8,'2026-06-06 11:37:16'),
(9,'Monday','16:30:00','17:30:00',60,9,'2026-06-06 11:37:16'),
(10,'Monday','17:30:00','18:30:00',60,10,'2026-06-06 11:37:16'),
(11,'Tuesday','08:30:00','09:30:00',60,1,'2026-06-06 11:37:16'),
(12,'Tuesday','09:30:00','10:30:00',60,2,'2026-06-06 11:37:16'),
(13,'Tuesday','10:30:00','11:30:00',60,3,'2026-06-06 11:37:16'),
(14,'Tuesday','11:30:00','12:30:00',60,4,'2026-06-06 11:37:16'),
(15,'Tuesday','12:30:00','13:30:00',60,5,'2026-06-06 11:37:16'),
(16,'Tuesday','13:30:00','14:30:00',60,6,'2026-06-06 11:37:16'),
(17,'Tuesday','14:30:00','15:30:00',60,7,'2026-06-06 11:37:16'),
(18,'Tuesday','15:30:00','16:30:00',60,8,'2026-06-06 11:37:16'),
(19,'Tuesday','16:30:00','17:30:00',60,9,'2026-06-06 11:37:16'),
(20,'Tuesday','17:30:00','18:30:00',60,10,'2026-06-06 11:37:16'),
(21,'Wednesday','08:30:00','09:30:00',60,1,'2026-06-06 11:37:16'),
(22,'Wednesday','09:30:00','10:30:00',60,2,'2026-06-06 11:37:16'),
(23,'Wednesday','10:30:00','11:30:00',60,3,'2026-06-06 11:37:16'),
(24,'Wednesday','11:30:00','12:30:00',60,4,'2026-06-06 11:37:16'),
(25,'Wednesday','12:30:00','13:30:00',60,5,'2026-06-06 11:37:16'),
(26,'Wednesday','13:30:00','14:30:00',60,6,'2026-06-06 11:37:16'),
(27,'Wednesday','14:30:00','15:30:00',60,7,'2026-06-06 11:37:16'),
(28,'Wednesday','15:30:00','16:30:00',60,8,'2026-06-06 11:37:16'),
(29,'Wednesday','16:30:00','17:30:00',60,9,'2026-06-06 11:37:16'),
(30,'Wednesday','17:30:00','18:30:00',60,10,'2026-06-06 11:37:16'),
(31,'Thursday','08:30:00','09:30:00',60,1,'2026-06-06 11:37:16'),
(32,'Thursday','09:30:00','10:30:00',60,2,'2026-06-06 11:37:16'),
(33,'Thursday','10:30:00','11:30:00',60,3,'2026-06-06 11:37:16'),
(34,'Thursday','11:30:00','12:30:00',60,4,'2026-06-06 11:37:16'),
(35,'Thursday','12:30:00','13:30:00',60,5,'2026-06-06 11:37:16'),
(36,'Thursday','13:30:00','14:30:00',60,6,'2026-06-06 11:37:16'),
(37,'Thursday','14:30:00','15:30:00',60,7,'2026-06-06 11:37:16'),
(38,'Thursday','15:30:00','16:30:00',60,8,'2026-06-06 11:37:16'),
(39,'Thursday','16:30:00','17:30:00',60,9,'2026-06-06 11:37:16'),
(40,'Thursday','17:30:00','18:30:00',60,10,'2026-06-06 11:37:16'),
(41,'Friday','08:30:00','09:30:00',60,1,'2026-06-06 11:37:16'),
(42,'Friday','09:30:00','10:30:00',60,2,'2026-06-06 11:37:16'),
(43,'Friday','10:30:00','11:30:00',60,3,'2026-06-06 11:37:16'),
(44,'Friday','11:30:00','12:30:00',60,4,'2026-06-06 11:37:16'),
(45,'Friday','12:30:00','13:30:00',60,5,'2026-06-06 11:37:16'),
(46,'Friday','13:30:00','14:30:00',60,6,'2026-06-06 11:37:16'),
(47,'Friday','14:30:00','15:30:00',60,7,'2026-06-06 11:37:16'),
(48,'Friday','15:30:00','16:30:00',60,8,'2026-06-06 11:37:16'),
(49,'Friday','16:30:00','17:30:00',60,9,'2026-06-06 11:37:16'),
(50,'Friday','17:30:00','18:30:00',60,10,'2026-06-06 11:37:16'),
(51,'Saturday','08:30:00','09:30:00',60,1,'2026-06-06 11:37:16'),
(52,'Saturday','09:30:00','10:30:00',60,2,'2026-06-06 11:37:16'),
(53,'Saturday','10:30:00','11:30:00',60,3,'2026-06-06 11:37:16'),
(54,'Saturday','11:30:00','12:30:00',60,4,'2026-06-06 11:37:16'),
(55,'Saturday','12:30:00','13:30:00',60,5,'2026-06-06 11:37:16'),
(56,'Saturday','13:30:00','14:30:00',60,6,'2026-06-06 11:37:16'),
(57,'Saturday','14:30:00','15:30:00',60,7,'2026-06-06 11:37:16'),
(58,'Saturday','15:30:00','16:30:00',60,8,'2026-06-06 11:37:16'),
(59,'Saturday','16:30:00','17:30:00',60,9,'2026-06-06 11:37:16'),
(60,'Saturday','17:30:00','18:30:00',60,10,'2026-06-06 11:37:16');
/*!40000 ALTER TABLE `time_slot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timetable`
--

DROP TABLE IF EXISTS `timetable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `timetable` (
  `timetable_id` int(11) NOT NULL AUTO_INCREMENT,
  `batch_id` int(11) NOT NULL,
  `timetable_name` varchar(100) NOT NULL,
  `academic_year` year(4) NOT NULL,
  `semester` tinyint(4) NOT NULL,
  `status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
  `generated_at` datetime DEFAULT NULL,
  `effective_from` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`timetable_id`),
  KEY `idx_tt_batch` (`batch_id`),
  KEY `idx_tt_status` (`status`),
  CONSTRAINT `fk_tt_batch` FOREIGN KEY (`batch_id`) REFERENCES `batch` (`batch_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_tt_semester` CHECK (`semester` in (1,2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Generated schedule version for a batch — supports draft/active/archived';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timetable`
--

LOCK TABLES `timetable` WRITE;
/*!40000 ALTER TABLE `timetable` DISABLE KEYS */;
/*!40000 ALTER TABLE `timetable` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timetable_entry`
--

DROP TABLE IF EXISTS `timetable_entry`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `timetable_entry` (
  `entry_id` int(11) NOT NULL AUTO_INCREMENT,
  `timetable_id` int(11) NOT NULL,
  `batch_module_id` int(11) NOT NULL,
  `hall_id` int(11) NOT NULL,
  `slot_id` int(11) NOT NULL,
  `session_type` enum('lecture','lab','tutorial') NOT NULL,
  `is_recurring` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`entry_id`),
  UNIQUE KEY `uq_no_hall_double_book` (`timetable_id`,`hall_id`,`slot_id`),
  UNIQUE KEY `uq_no_batch_double_book` (`timetable_id`,`batch_module_id`,`slot_id`),
  KEY `fk_te_batch_module` (`batch_module_id`),
  KEY `idx_te_timetable` (`timetable_id`),
  KEY `idx_te_slot` (`slot_id`),
  KEY `idx_te_hall` (`hall_id`),
  CONSTRAINT `fk_te_batch_module` FOREIGN KEY (`batch_module_id`) REFERENCES `batch_module` (`batch_module_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_te_hall` FOREIGN KEY (`hall_id`) REFERENCES `hall` (`hall_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_te_slot` FOREIGN KEY (`slot_id`) REFERENCES `time_slot` (`slot_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_te_timetable` FOREIGN KEY (`timetable_id`) REFERENCES `timetable` (`timetable_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='One row = one scheduled session (the AI optimizer output)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timetable_entry`
--

LOCK TABLES `timetable_entry` WRITE;
/*!40000 ALTER TABLE `timetable_entry` DISABLE KEYS */;
/*!40000 ALTER TABLE `timetable_entry` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_account`
--

DROP TABLE IF EXISTS `user_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_account` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL COMMENT 'bcrypt hash — never store plaintext',
  `role` enum('admin','lecturer','student') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Authentication and role management for all system users';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_account`
--

LOCK TABLES `user_account` WRITE;
/*!40000 ALTER TABLE `user_account` DISABLE KEYS */;
INSERT INTO `user_account` VALUES
(1,'nirosha.m','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:55:22','2026-06-06 06:55:22'),
(2,'harsha.s','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:55:22','2026-06-06 06:55:22'),
(3,'sushan.m','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:55:22','2026-06-06 06:55:22'),
(4,'appuhamy.j','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:55:22','2026-06-06 06:55:22'),
(5,'nuwan.s','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:55:22','2026-06-06 06:55:22'),
(6,'bandara.w','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:55:22','2026-06-06 06:55:22'),
(7,'tushara.c','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:55:22','2026-06-06 06:55:22'),
(8,'arunoda','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:59:14','2026-06-06 06:59:14'),
(9,'wanniarachchi','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:59:14','2026-06-06 06:59:14'),
(10,'subodha','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:59:14','2026-06-06 06:59:14'),
(11,'rajitha','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:59:14','2026-06-06 06:59:14'),
(12,'sanath','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:59:14','2026-06-06 06:59:14'),
(13,'rgallage','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:59:14','2026-06-06 06:59:14'),
(14,'bandaradms','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 06:59:14','2026-06-06 06:59:14'),
(15,'seneviratne.c','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 07:00:37','2026-06-06 07:00:37'),
(16,'gevin.h','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 07:00:37','2026-06-06 07:00:37'),
(17,'sandamali.g','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 07:00:37','2026-06-06 07:00:37'),
(18,'neel.k','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 07:00:37','2026-06-06 07:00:37'),
(19,'konara.k','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 07:00:37','2026-06-06 07:00:37'),
(20,'chamod.d','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 07:00:37','2026-06-06 07:00:37'),
(21,'yugani.g','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 07:00:37','2026-06-06 07:00:37'),
(22,'tharindu.g','SecurePassHash123!','lecturer',1,NULL,'2026-06-06 07:00:37','2026-06-06 07:00:37');
/*!40000 ALTER TABLE `user_account` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-06-08 23:39:13
