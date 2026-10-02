"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { fetchStudentExamTimetable, updateUser, fetchDepartments } from "../../lib/api";
import { Calendar, Building, Clock, Inbox, BookOpen, Award, User, CheckCircle, Edit2, Save, Download } from "lucide-react";

export default function StudentExamTimetablePage() {
  const [user, setUser] = useState(null);
  const [examTimetable, setExamTimetable] = useState(null);
  const [entries, setEntries] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingStudentId, setEditingStudentId] = useState(false);
  const [studentIdInput, setStudentIdInput] = useState("");
  const [savingId, setSavingId] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const u = JSON.parse(userStr);
      setUser(u);
      setStudentIdInput(u.studentIdNumber || u.username || "");
      if (u.batchId) {
        loadStudentExamSchedule(u.batchId);
      } else {
        setLoading(false);
        setError("No batch linked to your student profile.");
      }
    } else {
      setLoading(false);
    }
    fetchDepartments().then(setDepartments).catch(console.error);
  }, []);

  const loadStudentExamSchedule = async (batchId) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchStudentExamTimetable(batchId);
      if (data && data.status === "published") {
        setExamTimetable(data.examTimetable);
        setEntries(data.entries || []);
      } else {
        setExamTimetable(null);
        setEntries([]);
      }
    } catch (err) {
      console.error(err);
      setError("Could not load exam timetable details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStudentId = async () => {
    if (!user || !studentIdInput.trim()) return;
    setSavingId(true);
    try {
      const updated = await updateUser(user.userId, { studentIdNumber: studentIdInput.trim() });
      const updatedUser = { ...user, studentIdNumber: updated.studentIdNumber || studentIdInput.trim() };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setEditingStudentId(false);
      alert("Student Registration ID updated successfully!");
    } catch (err) {
      alert("Error updating Student ID: " + err.message);
    } finally {
      setSavingId(false);
    }
  };

  const getDisplayStudentId = (u) => {
    if (!u) return "Official Record";
    if (u.studentIdNumber && u.studentIdNumber.trim() !== "") {
      return u.studentIdNumber;
    }
    const uname = (u.username || "").trim();
    const match = uname.match(/^eg(\d{2})(\d{4})/i);
    if (match) {
      return `EG/20${match[1]}/${match[2]}`;
    }
    return uname || "Official Record";
  };

  const isStudentAssignedToRange = (rangeStr) => {
    if (!user || !rangeStr) return false;
    const currentId = getDisplayStudentId(user).toUpperCase().trim();
    if (!currentId) return false;

    // Check if ID range contains numbers
    if (rangeStr.includes(" - ")) {
      const parts = rangeStr.split(" - ").map(s => s.trim().toUpperCase());
      if (parts.length === 2) {
        if (currentId >= parts[0] && currentId <= parts[1]) return true;
        
        // Compare numerical suffix
        const numCurrent = parseInt(currentId.replace(/[^0-9]/g, ""), 10);
        const numStart = parseInt(parts[0].replace(/[^0-9]/g, ""), 10);
        const numEnd = parseInt(parts[1].replace(/[^0-9]/g, ""), 10);
        if (!isNaN(numCurrent) && !isNaN(numStart) && !isNaN(numEnd)) {
          if (numCurrent >= numStart && numCurrent <= numEnd) return true;
        }
      }
    }
    return rangeStr.toUpperCase().includes(currentId);
  };

  const isModuleForStudent = (entry) => {
    if (!user) return true;
    if (user.semester === 1 || user.semester === 2) return true;
    const studentDeptId = user.departmentId || user.department?.departmentId;
    const modCode = (entry.module?.moduleCode || "").toUpperCase();
    if (modCode.startsWith("IS") || modCode.startsWith("COM")) return true;

    let modDeptId = entry.module?.departmentId || entry.module?.department?.departmentId;
    if (!modDeptId) {
      const foundDept = departments.find(d => d.departmentCode && modCode.startsWith(d.departmentCode.toUpperCase()));
      if (foundDept) modDeptId = foundDept.departmentId;
    }

    if (studentDeptId && modDeptId) {
      return String(studentDeptId) === String(modDeptId);
    }
    return true;
  };

  const getPersonalizedEntries = () => {
    const deptFiltered = entries.filter(e => isModuleForStudent(e));
    const moduleGroups = {};
    for (const e of deptFiltered) {
      const key = e.module ? String(e.module.moduleId) : String(e.examEntryId);
      if (!moduleGroups[key]) moduleGroups[key] = [];
      moduleGroups[key].push(e);
    }

    // Merge entries per module: combine all venues into a single row
    const merged = [];
    for (const key in moduleGroups) {
      const group = moduleGroups[key];
      const first = group[0];

      // Check if student is assigned to any specific hall via ID range
      const matchingRows = group.filter(e => isStudentAssignedToRange(e.studentIdRange));

      // Build venues array for merged display
      const venues = group.map(e => ({
        hall: e.hall,
        studentIdRange: e.studentIdRange,
        allocatedCount: e.allocatedCount,
        isMatch: isStudentAssignedToRange(e.studentIdRange),
      }));

      merged.push({
        ...first,
        _venues: venues,
        _hasMatch: matchingRows.length > 0,
        _matchedHall: matchingRows.length > 0 ? matchingRows[0].hall : null,
      });
    }
    return merged;
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <main className="page-content">
            <div className="empty-state" style={{ marginTop: 80 }}>
              <div className="empty-state-text">Loading Exam Schedule...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              Home <span style={{ color: "var(--neutral-400)" }}>/</span> <span>Exam Schedule</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          {/* Welcome Header */}
          <div className="card" style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            padding: "24px 28px",
            marginBottom: "20px",
            borderRadius: "16px",
            boxShadow: "var(--shadow-md)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}>
            <div>
              <h1 style={{ fontSize: "26px", fontWeight: "800", margin: 0, color: "#ffffff" }}>
                Official End-Semester Exam Schedule
              </h1>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", margin: "4px 0 0 0" }}>
                {user ? `Hello ${user.firstName || user.username}, here is your batch's official exam venue allocation.` : "Viewing official exam schedule."}
              </p>
            </div>

            {/* Registration ID Badge (Read-Only) */}
            <div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", padding: "10px 16px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
              <User size={20} color="#ffffff" />
              <div>
                <div style={{ fontSize: "11px", opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.5px" }}>Student Registration ID</div>
                <div style={{ fontSize: "15px", fontWeight: "700" }}>
                  {getDisplayStudentId(user)}
                </div>
              </div>
            </div>
          </div>

          {/* Best of Luck Encouragement Card */}
          <div className="card" style={{ 
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", 
            color: "#ffffff", 
            marginBottom: "24px",
            borderRadius: "16px",
            padding: "20px 24px",
            boxShadow: "0 4px 16px rgba(124, 58, 237, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: "20px"
          }}>
            <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", padding: "14px", display: "flex" }}>
              <Award size={32} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: "18px", fontWeight: "800" }}>
                Best of Luck for your exam!
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", opacity: 0.9, lineHeight: 1.4 }}>
                Please check your assigned venue below based on your Student Registration ID Number. Make sure to arrive 15 minutes before exam start time.
              </p>
            </div>
          </div>

          {error && (
            <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", padding: "20px", color: "#991b1b", marginBottom: "20px" }}>
              ⚠️ {error}
            </div>
          )}

          {!examTimetable || entries.length === 0 ? (
            <div className="card" style={{ padding: "40px" }}>
              <div className="empty-state">
                <div className="empty-state-icon" style={{ color: "var(--neutral-400)", marginBottom: "12px", display: "flex", justifyContent: "center" }}>
                  <Inbox size={48} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--neutral-800)" }}>
                  No Published Exam Schedule Available
                </div>
                <div style={{ color: "var(--neutral-600)", fontSize: 14 }}>
                  The administration has not published an official exam schedule for your batch yet. Please check back later!
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Calendar size={18} style={{ color: "var(--primary-600)" }} />
                  Exam Time Table & Multi-Venue Allocations
                </h3>
                {examTimetable.publishedAt && (
                  <span style={{ fontSize: "12px", color: "var(--neutral-600)", fontWeight: "500" }}>
                    Published on: {new Date(examTimetable.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-responsive">
                  <table className="table" style={{ margin: 0, width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "18px 24px", minWidth: "260px" }}>Module Code & Title</th>
                        <th style={{ padding: "18px 20px", width: "200px" }}>Exam Date</th>
                        <th style={{ padding: "18px 20px", width: "220px" }}>Session / Time</th>
                        <th style={{ padding: "18px 24px", minWidth: "320px" }}>Venue Allocation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPersonalizedEntries().map((entry) => {
                        const venues = entry._venues || [{ hall: entry.hall, studentIdRange: entry.studentIdRange, allocatedCount: entry.allocatedCount, isMatch: isStudentAssignedToRange(entry.studentIdRange) }];
                        const hasAnyMatch = entry._hasMatch || false;
                        return (
                          <tr key={entry.examEntryId} style={{ background: hasAnyMatch ? "#f0fdf4" : undefined }}>
                            <td style={{ padding: "18px 24px", verticalAlign: "middle" }}>
                              <div><strong style={{ fontSize: "15px", color: "var(--neutral-900)" }}>{entry.module?.moduleCode}</strong></div>
                              <div style={{ fontSize: "13px", color: "var(--neutral-600)" }}>{entry.module?.moduleName}</div>
                            </td>
                            <td style={{ padding: "18px 20px", verticalAlign: "middle" }}>
                              <div style={{ fontWeight: "700", color: "var(--neutral-800)" }}>
                                {new Date(entry.examDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                              </div>
                            </td>
                            <td style={{ padding: "18px 20px", verticalAlign: "middle" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Clock size={14} style={{ color: "var(--primary-600)" }} />
                                <span>{entry.startTime ? entry.startTime.substring(0, 5) : ""} - {entry.endTime ? entry.endTime.substring(0, 5) : ""}</span>
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase" }}>
                                {entry.sessionName || "Session"}
                              </div>
                            </td>
                            <td style={{ padding: "18px 24px", verticalAlign: "middle" }}>
                              {venues.length === 0 ? (
                                <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontStyle: "italic" }}>
                                  Venue to be announced
                                </span>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {venues.map((v, idx) => (
                                    <div key={idx} style={{
                                      background: v.isMatch ? "#dcfce7" : "#f8fafc",
                                      border: v.isMatch ? "1px solid #86efac" : "1px solid #e2e8f0",
                                      borderRadius: "8px",
                                      padding: "8px 12px",
                                    }}>
                                      {v.hall ? (
                                        <div>
                                          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#047857", fontWeight: "700", fontSize: "13px" }}>
                                            <Building size={14} />
                                            <span>{v.hall.hallName}</span>
                                          </div>
                                          <div style={{ fontSize: "12px", color: "var(--neutral-600)", marginTop: "2px" }}>
                                            {v.studentIdRange || ""}{v.allocatedCount ? ` (${v.allocatedCount} seats)` : ""}
                                          </div>
                                          {v.isMatch && (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#16a34a", color: "#fff", fontSize: "10px", fontWeight: "800", padding: "2px 8px", borderRadius: "10px", marginTop: "4px" }}>
                                              <CheckCircle size={11} /> YOUR HALL
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontStyle: "italic" }}>TBA</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Download PDF button — shown when exam entries are loaded */}
          {entries.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }} className="no-print">
              <button
                onClick={() => window.print()}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: "linear-gradient(135deg, #1e3a5f, #2563eb)",
                  color: "#ffffff",
                  border: "none", borderRadius: "10px",
                  padding: "10px 20px", fontSize: "14px",
                  fontWeight: "600", cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.25)"
                }}
              >
                <Download size={16} /> Download as PDF
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
    <style>{`
      @media print {
        .sidebar, .topbar, .no-print, header, button {
          display: none !important;
        }
        body, .app-layout, .main-content, .page-content {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          color: #000 !important;
        }
        .card {
          box-shadow: none !important;
          border: 1px solid #ccc !important;
          page-break-inside: avoid;
        }
        table { border-collapse: collapse !important; width: 100% !important; }
        th, td { border: 1px solid #ccc !important; padding: 4px 8px !important; font-size: 11px !important; }
      }
    `}</style>
    </>
  );
}
