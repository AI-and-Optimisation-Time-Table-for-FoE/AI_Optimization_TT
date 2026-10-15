# AI & Optimisation Time Table for FoE: Frontend

Web frontend for the **Faculty of Engineering, University of Ruhuna** timetable
management system. It replaces the manual timetable process with a web application
where admins, lecturers and students can view and manage lecture and exam timetables.

The frontend is built with Next.js and communicates with a Java backend through a
REST API.

## Features

- Role-based sign in for **admin**, **student** and **lecturer** users
- Role-based sidebar navigation that changes with the signed-in user
- Lecture schedule view for each batch
- Exam timetable view, with an admin page to manage it
- "Upcoming lecture" card showing the ongoing or next lecture
- Account profile page with profile photo upload and password change
- Forgot-password flow on the login page
- Responsive layout with a mobile sidebar menu

## Tech Stack

| Area | Technology |
|------|------------|
| Framework | Next.js (App Router) |
| UI library | React |
| Icons | lucide-react |
| Styling | CSS (`globals.css`, `optimizer.css`) and inline styles |
| Backend | Java REST API (`timetable` folder in this repository) |
| Hosting | Vercel (see `vercel.json`) |

## Getting Started

### Prerequisites

- Node.js (LTS version)
- npm (installed with Node.js)

### Installation

```bash
cd frontend
npm install
```

### Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
Press `Ctrl + C` in the terminal to stop the server.

### Production build

```bash
npm run build
npm start
```