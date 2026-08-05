"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import { fetchBatchModules, fetchBatches, fetchUserProfile, fetchTimetable, fetchStudentExamTimetable } from "../lib/api";
import { GraduationCap, BookOpen, AlertTriangle, Calendar, ArrowRight } from "lucide-react";
import UpcomingLecture from "../components/UpcomingLecture";
import "./student.css";

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [batch, setBatch] = useState(null);
  const [modules, setModules] = useState([]);
  const [entries, setEntries] = useState([]);
  const [isExamPublished, setIsExamPublished] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Authenticate student session
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/");
      return;
    }
    const userData = JSON.parse(userStr);
    if (userData.role !== "student") {
      router.push(`/${userData.role}`);
      return;
    }
    setUser(userData);

    loadStudentData(userData);

    const interval = setInterval(() => {
      loadStudentData(userData, false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function loadStudentData(userData, showLoading = true) {
    if (!userData.batchId) {
      setError("No batch assigned to this student account. Please contact an administrator.");
      if (showLoading) setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    setError("");

    try {
      // 1. Fetch batches to find student's batch name
      const batchesList = await fetchBatches();
      const currentBatch = batchesList.find((b) => b.batchId === userData.batchId);
      setBatch(currentBatch);

      // 2. Fetch modules for this batch
      const modulesData = await fetchBatchModules(userData.batchId, userData.departmentId);      
      setModules(modulesData);

      // 3. Fetch timetable entries for this student
      const timetableData = await fetchTimetable(userData.batchId, userData.departmentId, false, null);
      if (Array.isArray(timetableData)) {
        setEntries(timetableData);
      } else if (timetableData && timetableData.entries) {
        setEntries(timetableData.entries);
      }

      // 4. Fetch exam timetable status for this student's batch
      try {
        const examData = await fetchStudentExamTimetable(userData.batchId);
        if (examData && examData.status === "published" && examData.entries && examData.entries.length > 0) {
          setIsExamPublished(true);
        } else {
          setIsExamPublished(false);
        }
      } catch (examErr) {
        console.error("Exam timetable status check:", examErr);
      }

      // 5. Fetch user profile to get first and last name
      try {
        const profileData = await fetchUserProfile(userData.userId);
        if (profileData) {
          const updatedUser = { 
            ...userData, 
            firstName: profileData.firstName, 
            lastName: profileData.lastName,
            profilePicture: profileData.profilePicture,
            studentIdNumber: profileData.studentIdNumber
          };
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } catch (profileErr) {
        console.error("Failed to sync profile info:", profileErr);
      }
    } catch (err) {
      console.error(err);
      setError("Could not load student dashboard details from the database.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <main className="page-content">
            <div className="empty-state" style={{ marginTop: 80 }}>
              <div className="empty-state-text">Loading Student Dashboard...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              Home <span style={{ color: "var(--neutral-400)" }}>/</span> <span>Student Dashboard</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          {error ? (
            <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", padding: "20px", color: "#991b1b" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                {error}
              </div>
            </div>
          ) : (
            <div>
              {/* Welcome Profile Card — full width */}
              <div className="card" style={{ background: "linear-gradient(135deg, var(--primary-800) 0%, var(--primary-900) 100%)", color: "#fff", marginBottom: "24px" }}>
                <div className="card-body" style={{ padding: "28px 32px", display: "flex", alignItems: "center", gap: "28px", flexWrap: "wrap" }}>
                  <div style={{ color: "rgba(255, 255, 255, 0.9)" }}>
                    <GraduationCap size={52} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "4px" }}>
                      Welcome, {user?.firstName ? `${user.firstName} ${user.lastName || ""}` : user?.username}!
                    </h2>
                    <p style={{ fontSize: "14px", opacity: 0.75 }}>Student Dashboard</p>
                  </div>
                  <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "11px", opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Academic Batch</div>
                      <div style={{ fontSize: "16px", fontWeight: "700" }}>{batch?.batchName || "—"}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "11px", opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Current Semester</div>
                      <div style={{ fontSize: "16px", fontWeight: "700" }}>Semester {batch?.semester || "—"}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "11px", opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Modules</div>
                      <div style={{ fontSize: "16px", fontWeight: "700" }}>{modules.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Exam Published Announcement Card */}
              {isExamPublished && (
                <div className="card" style={{ 
                  background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", 
                  color: "#ffffff", 
                  marginBottom: "24px",
                  borderRadius: "16px",
                  padding: "20px 24px",
                  boxShadow: "0 4px 16px rgba(49, 46, 129, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "50%", padding: "12px", display: "flex" }}>
                      <Calendar size={28} color="#ffffff" />
                    </div>
                    <div>
                      <div style={{ fontSize: "17px", fontWeight: "700" }}>
                        Exam timetables are now published!
                      </div>
                      <p style={{ margin: "2px 0 0 0", fontSize: "13px", opacity: 0.85 }}>
                        Your official end-semester exam dates, times, and hall locations are now available. Click below to view your schedule.
                      </p>
                    </div>
                  </div>
                  <Link href="/student/exam-timetable" className="btn" style={{ 
                    background: "#ffffff", 
                    color: "#312e81", 
                    fontWeight: "700", 
                    padding: "10px 18px", 
                    borderRadius: "10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    textDecoration: "none"
                  }}>
                    <span>View Exam Schedule</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )}

              {/* Upcoming Lecture Widget */}
              <UpcomingLecture entries={entries} />

              {/* Your Course Modules — full width below welcome card */}
              <div className="card" style={{ marginBottom: "32px" }}>
                <div className="card-header">
                  <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <BookOpen size={18} style={{ color: "var(--primary-600)" }} />
                    Your Course Modules
                  </div>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {modules.length === 0 ? (
                    <div style={{ padding: "24px", color: "var(--neutral-500)", textAlign: "center" }}>
                      No modules registered in this batch yet.
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Module Name</th>
                          <th>Lecture Hrs / Wk</th>
                          <th>Lab Hrs / Wk</th>
                          <th>Lecturer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map((m) => (
                          <tr key={m.batchModuleId}>
                            <td><strong>{m.moduleCode}</strong></td>
                            <td>{m.moduleName}</td>
                            <td style={{ textAlign: "center" }}>{m.lectureHoursPerWeek}</td>
                            <td style={{ textAlign: "center" }}>{m.labHoursPerWeek}</td>
                            <td>{m.lecturerName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
