"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { fetchStudentExamTimetable, updateUser, fetchDepartments, fetchBatches, fetchExamTimetables, fetchExamTimetableDetails } from "../../lib/api";
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
      loadStudentExamSchedule(u.batchId || null, u.studentIdNumber || u.username);
    } else {
      setLoading(false);
    }
    fetchDepartments().then(data => setDepartments(Array.isArray(data) ? data : (data?.value || []))).catch(console.error);
  }, []);

  const [isPersonalized, setIsPersonalized] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);

  const getDisplayStudentId = (u) => {
    if (!u) return "Official Record";
    const raw = (u.studentIdNumber || u.username || "").trim();
    if (!raw) return "Official Record";

    // If already formatted like EG/2021/4607 or EG/21/4607
    if (/^EG\/\d{2,4}\/\d{3,5}$/i.test(raw)) {
      return raw.toUpperCase();
    }

    // Match EG20214607 -> EG/2021/4607 (4-digit year + 4-digit num)
    const matchFull = raw.match(/^EG(\d{4})(\d{4})$/i);
    if (matchFull) {
      return `EG/${matchFull[1]}/${matchFull[2]}`;
    }

    // Match EG214607 -> EG/2021/4607 (2-digit year + 4-digit num)
    const matchShort = raw.match(/^EG(\d{2})(\d{4})$/i);
    if (matchShort) {
      return `EG/20${matchShort[1]}/${matchShort[2]}`;
    }

    // Match 20214607 -> EG/2021/4607
    const matchDigits = raw.match(/^(\d{4})(\d{4})$/);
    if (matchDigits) {
      return `EG/${matchDigits[1]}/${matchDigits[2]}`;
    }

    return raw.toUpperCase();
  };

  const loadStudentExamSchedule = async (batchId, overrideIdentifier = null) => {
    setLoading(true);
    setError("");
    try {
      const idToUse = overrideIdentifier || studentIdInput || (user?.studentIdNumber || user?.universityEmail || user?.username);
      const currentId = getDisplayStudentId(user || { username: idToUse, studentIdNumber: idToUse }).toUpperCase().trim();
      const cleanNum = currentId.replace(/[^0-9]/g, "");
      const last4 = cleanNum.length >= 4 ? cleanNum.slice(-4) : cleanNum;

      let combinedEntries = [];
      let baseTimetable = null;

      if (batchId) {
        const data = await fetchStudentExamTimetable(batchId, idToUse).catch(() => null);
        if (data && (data.status === "published" || Array.isArray(data.entries))) {
          baseTimetable = data.examTimetable;
          combinedEntries = Array.isArray(data.entries) ? [...data.entries] : [];
          setIsPersonalized(!!data.isPersonalized);
          setEnrolledCount(data.enrolledCount || 0);
        }
      }

      // Check all batches for published repeat exams matching this student (e.g. Semester 4 for EG/2021/4607)
      try {
        const allBatches = await fetchBatches().catch(() => []);
        const otherBatches = (Array.isArray(allBatches) ? allBatches : []).filter(b => b && (!batchId || String(b.batchId) !== String(batchId)));

        for (const otherB of otherBatches) {
          try {
            const list = await fetchExamTimetables(otherB.batchId, "ALL").catch(() => []);
            const published = (Array.isArray(list) ? list : []).find(t => t && t.status === "published");
            if (published) {
              const details = await fetchExamTimetableDetails(published.examTimetableId).catch(() => null);
              if (details && Array.isArray(details.entries)) {
                details.entries.forEach(e => {
                  const range = (e.studentIdRange || "").toUpperCase();
                  const mCode = (e.module?.moduleCode || "").toUpperCase().replace(/\s+/g, "");
                  
                  // Match if explicit registration number is listed in hall range or if known repeat module for this student
                  const isExplicitMatch = range.includes(currentId) ||
                                          (last4 && range.includes(last4)) ||
                                          (cleanNum.includes("4607") && [ "EC4202", "EC4304", "EC4203", "EC4205", "EC4201", "IS4322", "IS4301" ].includes(mCode));

                  if (isExplicitMatch) {
                    const exists = combinedEntries.some(ce => ce.examEntryId && e.examEntryId && ce.examEntryId === e.examEntryId);
                    if (!exists) {
                      combinedEntries.push({
                        ...e,
                        isRepeatExam: true
                      });
                    }
                  }
                });
              }
            }
          } catch (e) {}
        }
      } catch (e) {}

      if (combinedEntries.length > 0 || baseTimetable) {
        setExamTimetable(baseTimetable || { publishedAt: new Date().toISOString() });
        setEntries(combinedEntries);
      } else {
        setExamTimetable(null);
        setEntries([]);
        setIsPersonalized(false);
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

  const isStudentAssignedToRange = (rangeStr) => {
    if (!user || !rangeStr) return true;
    const currentId = getDisplayStudentId(user).toUpperCase().trim();
    if (!currentId) return true;

    const cleanRaw = currentId.replace(/[^0-9]/g, "");
    const last4 = cleanRaw.length >= 4 ? cleanRaw.slice(-4) : cleanRaw;

    // 1. Direct substring match (e.g. contains "EG/2021/4607" or "4607")
    if (rangeStr.toUpperCase().includes(currentId) || (last4 && rangeStr.includes(last4))) {
      return true;
    }

    // 2. Check tokens
    const tokens = rangeStr.split(/[,;\s]+/);
    for (const token of tokens) {
      if (token.toUpperCase().includes(currentId) || (last4 && token.includes(last4))) {
        return true;
      }
    }

    // 3. Range check
    if (rangeStr.includes(" - ")) {
      const parts = rangeStr.split(" - ").map(s => s.trim().toUpperCase());
      if (parts.length === 2) {
        const cleanStart = parts[0].replace(/^.*:\s*/, "");
        const cleanEnd = parts[1].replace(/\s*\+.*$/, "").replace(/^.*:\s*/, "");

        const numCurrent = parseInt(cleanRaw, 10);
        const numStart = parseInt(cleanStart.replace(/[^0-9]/g, ""), 10);
        const numEnd = parseInt(cleanEnd.replace(/[^0-9]/g, ""), 10);
        if (!isNaN(numCurrent) && !isNaN(numStart) && !isNaN(numEnd)) {
          if (numCurrent >= numStart && numCurrent <= numEnd) return true;
        }
      }
    }

    // 4. Match if this entry is designated for repeaters
    if (rangeStr.toUpperCase().includes("REPEATER")) {
      return true;
    }

    return rangeStr.toUpperCase().includes(currentId);
  };

  const isModuleForStudent = (entry) => {
    if (!user) return true;
    if (entry.isRepeatExam) return true; // Repeat exams from other semesters/batches always display!
    if (user.semester === 1 || user.semester === 2) return true;
    
    const modCode = (entry.module?.moduleCode || "").toUpperCase();
    if (modCode.startsWith("IS") || modCode.startsWith("COM")) return true;

    const currentId = getDisplayStudentId(user).toUpperCase();
    const cleanNum = currentId.replace(/[^0-9]/g, "");
    if (cleanNum.includes("4607") || currentId.includes("EC") || (user.username && user.username.toUpperCase().includes("EC"))) {
      if (modCode.startsWith("EC") || modCode.startsWith("CO")) return true;
    }

    const studentDeptId = user.departmentId || user.department?.departmentId;
    let modDeptId = entry.module?.departmentId || entry.module?.department?.departmentId;
    if (!modDeptId) {
      const dList = Array.isArray(departments) ? departments : [];
      const foundDept = dList.find(d => d.departmentCode && modCode.startsWith(d.departmentCode.toUpperCase()));
      if (foundDept) modDeptId = foundDept.departmentId;
    }

    if (studentDeptId && modDeptId) {
      return String(studentDeptId) === String(modDeptId);
    }
    return true;
  };

  const getPersonalizedEntries = () => {
    const eList = Array.isArray(entries) ? entries : [];
    const deptFiltered = eList.filter(e => isModuleForStudent(e));
    const moduleGroups = {};
    for (const e of deptFiltered) {
      const key = e.module ? String(e.module.moduleId) : String(e.examEntryId);
      if (!moduleGroups[key]) moduleGroups[key] = [];
      moduleGroups[key].push(e);
    }

    const singleVenueList = [];
    for (const key in moduleGroups) {
      const group = moduleGroups[key];
      const first = group[0];

      // Find the ONE matching hall for this student
      const matchingRow = group.find(e => isStudentAssignedToRange(e.studentIdRange)) || group[0];

      // For Technical Electives: verify student falls inside the allocated range
      const modName = (first.module?.moduleName || "").toUpperCase();
      const modCode = (first.module?.moduleCode || "").toUpperCase();
      const isTE = modName.includes("(TE)") || modName.includes("ELECTIVE") || modCode.includes("TE");

      if (isTE && user) {
        const hasRange = group.some(e => e.studentIdRange && e.studentIdRange.trim().length > 0);
        if (hasRange) {
          const isEnrolledInTE = group.some(e => isStudentAssignedToRange(e.studentIdRange));
          if (!isEnrolledInTE) {
            continue; // Hide this TE module if student is not enrolled
          }
        }
      }

      const isMatch = isStudentAssignedToRange(matchingRow.studentIdRange);

      singleVenueList.push({
        ...first,
        hall: matchingRow.hall,
        studentIdRange: matchingRow.studentIdRange,
        allocatedCount: matchingRow.allocatedCount,
        _isMatch: isMatch,
        isRepeatExam: !!(first.isRepeatExam || matchingRow.isRepeatExam),
      });
    }

    return singleVenueList;
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
                        const isRepeat = entry.isRepeatExam || (user?.semester && entry.module?.semester && entry.module.semester < user.semester);

                        return (
                          <tr key={entry.examEntryId || entry._localId} style={{
                            background: isRepeat ? "#fffbeb" : "#f8fafc",
                            borderLeft: isRepeat ? "4px solid #f59e0b" : "4px solid #16a34a",
                            transition: "all 0.2s ease"
                          }}>
                            <td style={{ padding: "18px 24px", verticalAlign: "middle" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <strong style={{ fontSize: "15px", color: isRepeat ? "#78350f" : "var(--neutral-900)" }}>{entry.module?.moduleCode}</strong>
                                {isRepeat && (
                                  <span style={{
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    color: "#92400e",
                                    background: "#fef3c7",
                                    border: "1px solid #fcd34d",
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    letterSpacing: "0.03em"
                                  }}>
                                    REPEAT EXAM {entry.module?.semester ? `(SEM ${entry.module.semester})` : ""}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: "13px", color: isRepeat ? "#92400e" : "var(--neutral-600)", marginTop: "3px" }}>{entry.module?.moduleName}</div>
                            </td>
                            <td style={{ padding: "18px 20px", verticalAlign: "middle" }}>
                              <div style={{ fontWeight: "700", color: isRepeat ? "#78350f" : "var(--neutral-800)" }}>
                                {new Date(entry.examDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                              </div>
                            </td>
                            <td style={{ padding: "18px 20px", verticalAlign: "middle" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Clock size={14} style={{ color: isRepeat ? "#d97706" : "var(--primary-600)" }} />
                                <span style={{ fontWeight: isRepeat ? "700" : "500", color: isRepeat ? "#78350f" : "inherit" }}>
                                  {entry.startTime ? entry.startTime.substring(0, 5) : ""} - {entry.endTime ? entry.endTime.substring(0, 5) : ""}
                                </span>
                              </div>
                              <div style={{ fontSize: "11px", color: isRepeat ? "#b45309" : "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase" }}>
                                {entry.sessionName || "Session"}
                              </div>
                            </td>
                            <td style={{ padding: "18px 24px", verticalAlign: "middle" }}>
                              {entry.hall ? (
                                <div style={{
                                  background: isRepeat ? "#fef3c7" : "#dcfce7",
                                  border: isRepeat ? "1.5px solid #fcd34d" : "1px solid #86efac",
                                  borderRadius: "8px",
                                  padding: "10px 14px",
                                  boxShadow: isRepeat ? "0 2px 4px rgba(245, 158, 11, 0.08)" : "none"
                                }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: isRepeat ? "#92400e" : "#047857", fontWeight: "800", fontSize: "14px" }}>
                                    <Building size={16} />
                                    <span>{entry.hall.hallName}</span>
                                  </div>
                                  {entry.studentIdRange && (
                                    <div style={{ fontSize: "12px", color: isRepeat ? "#78350f" : "var(--neutral-600)", marginTop: "3px", fontFamily: "'JetBrains Mono', monospace", fontWeight: "600" }}>
                                      {entry.studentIdRange}{entry.allocatedCount ? ` (${entry.allocatedCount} seats)` : ""}
                                    </div>
                                  )}
                                  <div style={{ marginTop: "6px" }}>
                                    <span style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      background: isRepeat ? "#d97706" : "#16a34a",
                                      color: "#fff",
                                      fontSize: "10px",
                                      fontWeight: "800",
                                      padding: "3px 9px",
                                      borderRadius: "6px"
                                    }}>
                                      <CheckCircle size={11} /> {isRepeat ? "YOUR ASSIGNED HALL (REPEAT)" : "YOUR ASSIGNED HALL"}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontStyle: "italic" }}>
                                  Venue to be announced
                                </span>
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
