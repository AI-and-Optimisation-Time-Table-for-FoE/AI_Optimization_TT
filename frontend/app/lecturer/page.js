"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { fetchLecturerTimetable, fetchLecturers, fetchLecturerModules } from "../lib/api";
import { BookOpen, Clock, Calendar } from "lucide-react";

export default function LecturerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [lecturer, setLecturer] = useState(null);
  const [entries, setEntries] = useState([]);
  const [assignedModules, setAssignedModules] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Authenticate lecturer session
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/");
      return;
    }
    const userData = JSON.parse(userStr);
    if (userData.role !== "lecturer") {
      router.push(`/${userData.role}`);
      return;
    }
    setUser(userData);

    loadLecturerData(userData);
  }, []);

  const loadLecturerData = async (userData) => {
    if (!userData.lecturerId) {
      setError("No lecturer profile linked to this user account. Please contact an administrator.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Fetch lecturer profile details
      const currentLecturer = (await fetchLecturers()).find((l) => l.lecturerId === userData.lecturerId);
      setLecturer(currentLecturer);

      // 2. Fetch assigned academic modules from BatchModule mapping
      const modulesData = await fetchLecturerModules(userData.lecturerId);
      setAssignedModules(Array.isArray(modulesData) ? modulesData : []);

      // 3. Fetch timetable entries for this lecturer (active/published only) to compute weekly slots count
      const timetableData = await fetchLecturerTimetable(userData.lecturerId);
      setEntries(Array.isArray(timetableData) ? timetableData : []);
    } catch (err) {
      console.error(err);
      setError("Could not load lecturer dashboard details from the database.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate total teaching hours per week from assigned modules
  const totalHours = useMemo(() => {
    return assignedModules.reduce((acc, m) => acc + (m.lectureHoursPerWeek || 0), 0);
  }, [assignedModules]);

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <main className="page-content">
            <div className="empty-state" style={{ marginTop: 80 }}>
              <div className="empty-state-text">Loading Lecturer Dashboard...</div>
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
              Home <span style={{ color: "var(--neutral-400)" }}>/</span> <span>Lecturer Panel</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          {error ? (
            <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", padding: "20px", color: "#991b1b" }}>
              ⚠️ {error}
            </div>
          ) : (
            <div>
              {/* Welcome Header Banner */}
              <div className="card" style={{ 
                background: "var(--bg-sidebar)", 
                color: "#fff", 
                padding: "32px 24px", 
                marginBottom: "32px", 
                border: "none",
                boxShadow: "var(--shadow-md)"
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <h1 style={{ fontSize: "32px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.5px", margin: 0 }}>
                    Welcome, {lecturer?.name || user?.username}!
                  </h1>
                  <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "14px", margin: 0, fontWeight: "500" }}>
                    Here is your weekly academic overview.
                  </p>
                </div>
              </div>

              {/* Stats Cards Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "32px" }}>

                {/* Modules count - Deep Teal */}
                <div className="card" style={{ background: "linear-gradient(135deg, #0f766e 0%, #0e9280 100%)", border: "none", boxShadow: "0 8px 24px rgba(15,118,110,0.35)", display: "flex", flexDirection: "column", justifyContent: "center", borderRadius: "16px" }}>
                  <div className="card-body" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "8px" }}>
                    <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                      <BookOpen size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: "26px", fontWeight: "900", color: "#ffffff", lineHeight: 1.1 }}>{assignedModules.length}</div>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.85)", fontWeight: "700", marginTop: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Modules Teaching</div>
                    </div>
                  </div>
                </div>

                {/* Workload Hours - Deep Indigo */}
                <div className="card" style={{ background: "linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)", border: "none", boxShadow: "0 8px 24px rgba(67,56,202,0.35)", display: "flex", flexDirection: "column", justifyContent: "center", borderRadius: "16px" }}>
                  <div className="card-body" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "8px" }}>
                    <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                      <Clock size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: "26px", fontWeight: "900", color: "#ffffff", lineHeight: 1.1 }}>{totalHours} hrs</div>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.85)", fontWeight: "700", marginTop: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Weekly Teaching Hours</div>
                    </div>
                  </div>
                </div>

                {/* Scheduled Slots - Deep Amber-Orange */}
                <div className="card" style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)", border: "none", boxShadow: "0 8px 24px rgba(180,83,9,0.35)", display: "flex", flexDirection: "column", justifyContent: "center", borderRadius: "16px" }}>
                  <div className="card-body" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "8px" }}>
                    <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                      <Calendar size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: "26px", fontWeight: "900", color: "#ffffff", lineHeight: 1.1 }}>{entries.length}</div>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.85)", fontWeight: "700", marginTop: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Weekly Scheduled Slots</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Assigned Academic Modules Table under Welcome Message */}
              <div className="card" style={{ border: "1px solid var(--neutral-200)", boxShadow: "var(--shadow-sm)" }}>
                <div className="card-header" style={{ borderBottom: "1px solid var(--neutral-200)" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "var(--neutral-800)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <BookOpen size={18} style={{ color: "var(--primary-600)" }} />
                    Assigned Academic Modules
                  </h3>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {assignedModules.length === 0 ? (
                    <div style={{ padding: "40px", color: "var(--neutral-500)", textAlign: "center" }}>
                      No modules assigned by the administrator yet.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                      <thead>
                        <tr style={{ background: "var(--neutral-50)", borderBottom: "1px solid var(--neutral-200)" }}>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 700 }}>Module Code</th>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 700 }}>Module Name</th>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 700 }}>Target Batch</th>
                          <th style={{ textAlign: "center", padding: "12px 16px", fontWeight: 700 }}>Credits</th>
                          <th style={{ textAlign: "center", padding: "12px 16px", fontWeight: 700 }}>Weekly Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedModules.map((m) => (
                          <tr key={m.batchModuleId} style={{ borderBottom: "1px solid var(--neutral-200)" }}>
                            <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--primary-700)" }}>{m.moduleCode}</td>
                            <td style={{ padding: "12px 16px", fontWeight: 500, color: "var(--neutral-800)" }}>{m.moduleName}</td>
                            <td style={{ padding: "12px 16px" }}>
                              <span style={{
                                fontSize: "12px",
                                fontWeight: "600",
                                padding: "3px 8px",
                                borderRadius: "12px",
                                background: "var(--primary-50)",
                                color: "var(--primary-700)"
                              }}>{m.batchName || "N/A"}</span>
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600 }}>{m.creditHours}</td>
                            <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600 }}>
                              {(m.lectureHoursPerWeek || 0)} hrs
                            </td>
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
