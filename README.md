# AI and Optimization-Based Timetable Scheduler for FoE

An AI and optimization-driven timetable generation system for the Faculty of Engineering, University of Ruhuna. Built as a Software Project (Semester 5–6) for client Dr. Prabhath.

## Overview

This system replaces manual, spreadsheet-based academic scheduling with an automated solution that generates conflict-free timetables using constraint satisfaction and optimization techniques. It manages academic data (batches, modules, lecturers, halls), models scheduling constraints, and produces optimized timetables through a web-based interface.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular |
| Backend | Spring Boot (Java) |
| Database | MySQL |
| Optimization Engine | Python, Google OR-Tools (CP-SAT) |
| Version Control | Git / GitHub |

## Team

| Name | Role |
|---|---|
| Keshika (Lead) | Project Management, Optimization Algorithm, GitHub Reviewer & Release Manager |
| — | Backend Development (Spring Boot, REST API) |
| — | Frontend Development (Angular UI) |
| — | Database Design (MySQL) |

*(Fill in teammate names above)*

## Project Structure

```
AI_Optimization_TT/
├── backend/        # Spring Boot REST API
├── frontend/       # Angular application
├── database/       # MySQL schema and seed scripts
├── algorithm/      # OR-Tools optimization engine (Python)
├── docs/           # SRS, sprint notes, diagrams
└── README.md
```

## Getting Started

### Prerequisites

Install the following before running the project locally:

- [Git](https://git-scm.com/)
- [Java 17](https://openjdk.org/) (for Spring Boot)
- [Node.js](https://nodejs.org/) and npm (for Angular)
- [MySQL](https://www.mysql.com/) 8.x
- [Python 3.10+](https://www.python.org/) (for the optimization engine)
- [Angular CLI](https://angular.io/cli): `npm install -g @angular/cli`

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/AI_Optimization_TT.git
cd AI_Optimization_TT
git checkout dev
```

### 2. Database setup

Start MySQL and create the database:

```bash
mysql -u root -p -e "CREATE DATABASE foe_timetable;"
```

Run the schema and seed scripts:

```bash
mysql -u root -p foe_timetable < database/create_tables.sql
mysql -u root -p foe_timetable < database/seed_data.sql
```

### 3. Backend setup (Spring Boot)

Update database credentials in `backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/foe_timetable
spring.datasource.username=root
spring.datasource.password=your_password_here
spring.jpa.hibernate.ddl-auto=update
```

Run the backend:

```bash
cd backend
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080`.

### 4. Frontend setup (Angular)

```bash
cd frontend
npm install
ng serve
```

The app will be available at `http://localhost:4200`.

### 5. Optimization engine setup (Python / OR-Tools)

```bash
cd algorithm
pip install ortools --break-system-packages
python3 scheduler.py
```

## Branching Strategy

- `main` — production-ready, sprint-reviewed code only. Protected; merges require a Pull Request and review.
- `dev` — integration branch. All feature branches merge here first.
- `feature/*` — one branch per task (e.g. `feature/timetable-api`, `feature/login-page`). Branch from `dev`, merge back via Pull Request.

### Daily workflow

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-task-name

# ... make changes ...

git add .
git commit -m "feat: short description of change"
git push origin feature/your-task-name
```

Then open a Pull Request on GitHub from your feature branch into `dev`.

### Commit message convention

| Prefix | Use for |
|---|---|
| `feat:` | New functionality |
| `fix:` | Bug fixes |
| `docs:` | Documentation changes |
| `style:` | UI/CSS changes |
| `db:` | Database schema changes |
| `test:` | Adding or updating tests |

## Sprint Plan

This project is delivered across 6 sprints:

1. **Sprint 1** — Requirements & Setup
2. **Sprint 2** — Database & Data Modelling
3. **Sprint 3** — Optimization Engine (Core AI)
4. **Sprint 4** — Frontend & AI Integration
5. **Sprint 5** — Testing & Refinement
6. **Sprint 6** — Deployment & Documentation

## Documentation

Full project documentation, including the Software Requirements Specification (SRS), is available in the [`docs/`](./docs) folder.

## License

This project is developed for academic purposes as part of the Software Project module, Faculty of Engineering, University of Ruhuna.
