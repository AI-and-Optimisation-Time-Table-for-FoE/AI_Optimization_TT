import "./globals.css";

export const metadata = {
  title: "Timetable Scheduler - Smart Academic Planning",
  description: "Intelligent timetable scheduling system for academic institutions. Optimize batch schedules, manage lecturers, modules, and hall allocations effortlessly.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
