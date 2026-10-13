# AI Optimization Timetable System

An automated university timetable generation system that leverages a genetic algorithm to create conflict-free schedules. The platform includes dedicated web interfaces for administrators, lecturers, and students to manage and view their respective schedules.

##  Tech Stack

* **Frontend:** Next.js (React), CSS modules (`/frontend` directory)
* **Backend:** Java Spring Boot (`/timetable` directory)
* **Optimization Engine:** Python (`/optimizer` directory)[cite: 1]
* **Database:** SQL Database (Managed via `restore_db.py` and cloud DB scripts)[cite: 1]

##  Project Structure

* `/frontend`: Contains the Next.js application with role-based routing (`/admin`, `/lecturer`, `/student`) and UI components[cite: 1].
* `/timetable`: Contains the Spring Boot REST API, JPA entities, and database controllers[cite: 1].
* `/optimizer`: Contains the AI logic, including `genetic_algorithm.py` and system `constraints.py`[cite: 1].

##  Local Setup & Installation

### Prerequisites
* Node.js (v18+)
* Java (JDK 17+) & Maven
* Python 3.10+
* SQL Database (MySQL/PostgreSQL)

### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
