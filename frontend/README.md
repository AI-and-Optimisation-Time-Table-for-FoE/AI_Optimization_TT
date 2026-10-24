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

## Backend Configuration

All API calls are defined in `app/lib/api.js` and go through one shared
`request()` helper.

The base URL is chosen as follows:

1. If the `NEXT_PUBLIC_API_URL` environment variable is set, it is used.
2. Otherwise, in development, `http://localhost:5000` is used.

To use a different backend, create a `.env.local` file in the `frontend` folder:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

The backend must be running for sign in and timetable data to work. Without it, the
pages still open but no data is loaded.

## Project Structure

```
frontend/
├── app/
│   ├── admin/          Admin pages (admin panel, exam timetable)
│   ├── student/        Student pages (student panel, exam schedule)
│   ├── lecturer/       Lecturer pages
│   ├── timetable/      Lecture schedule view
│   ├── profile/        Account profile page
│   ├── register/       Registration page
│   ├── components/     Shared components (Sidebar, UpcomingLecture)
│   ├── lib/api.js      Backend API functions
│   ├── page.js         Login page
│   ├── layout.js       Root layout
│   ├── globals.css     Global styles
│   └── optimizer.css   Additional styles
├── public/             Static files (logo, images)
└── package.json        Dependencies and scripts
```

## User Roles

| Role | Pages |
|------|-------|
| Admin | Admin Panel, Lecture Schedule, Exam Timetable |
| Student | Student Panel, Lecture Schedule, Exam Schedule |
| Lecturer | Lecturer Panel, Lecture Schedule |

After signing in, each user is redirected to the panel for their role. All roles can
open their **Profile** page to change their photo and password.

User details are stored in the browser's `localStorage` under the key `user`.

## Troubleshooting

| Problem | Likely cause and fix |
|---------|----------------------|
| `npm` is not recognized | Node.js is not installed. Install the LTS version and restart the terminal. |
| Pages open but sign in fails | The backend is not running, or `NEXT_PUBLIC_API_URL` is wrong. |
| Port 3000 is already in use | Close the other app using it, or run `npm run dev -- -p 3001`. |
| Strange errors after pulling new code | Run `npm install` again. |

## Team

Developed as a university software project by the Faculty of Engineering team.
Frontend: Madhavi.