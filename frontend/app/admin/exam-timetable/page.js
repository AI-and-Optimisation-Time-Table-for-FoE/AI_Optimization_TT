"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import {
  fetchBatches,
  fetchHalls,
  fetchExamTimetables,
  fetchExamTimetableDetails,
  createExamTimetable,
  saveExamEntries,
  publishExamTimetable,
  unpublishExamTimetable,
  deleteExamTimetable,
  fetchExamHallUnavailabilities,
  addExamHallUnavailability,
  deleteExamHallUnavailability,
  reoptimizeExamTimetable
} from "../../lib/api";
import { Calendar, Building, CheckCircle, EyeOff, Plus, Trash2, AlertTriangle, Save, Clock, Zap } from "lucide-react";

export default function AdminExamTimetablePage() {
  const [batches, setBatches] = useState([]);
  const [halls, setHalls] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [examTimetable, setExamTimetable] = useState(null);
  const [entries, setEntries] = useState([]);

  // Form states for creating exam timetable
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Hall unavailabilities state
  const [unavailabilities, setUnavailabilities] = useState([]);
  const [showUnavailModal, setShowUnavailModal] = useState(false);
  const [unavailHallId, setUnavailHallId] = useState("");
  const [unavailDate, setUnavailDate] = useState(new Date().toISOString().split("T")[0]);
  const [unavailStartTime, setUnavailStartTime] = useState("09:00");
  const [unavailEndTime, setUnavailEndTime] = useState("16:30");
  const [unavailReason, setUnavailReason] = useState("");

  useEffect(() => {
    fetchBatches().then(data => {
      setBatches(data);
      if (data.length > 0) setSelectedBatchId(String(data[0].batchId));
    }).catch(console.error);

    fetchHalls().then(setHalls).catch(console.error);
    loadUnavailabilities();
  }, []);

  const loadUnavailabilities = () => {
    fetchExamHallUnavailabilities().then(setUnavailabilities).catch(console.error);
  };

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchExamTimetable(Number(selectedBatchId));
    }
  }, [selectedBatchId]);

  const loadBatchExamTimetable = async (batchId) => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchExamTimetables(batchId);
      if (list && list.length > 0) {
        const latest = list[0];
        const details = await fetchExamTimetableDetails(latest.examTimetableId);
        setExamTimetable(details.examTimetable);
        setEntries(details.entries || []);
        if (latest.startDate) setStartDate(latest.startDate);
        if (latest.durationWeeks) setDurationWeeks(latest.durationWeeks);
      } else {
        setExamTimetable(null);
        setEntries([]);
      }
    } catch (err) {
      console.error(err);
      setError("Error loading exam timetable details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedBatchId || !startDate) {
      alert("Please select a batch and start date.");
      return;
    }
    setLoading(true);
    try {
      await createExamTimetable({
        batchId: Number(selectedBatchId),
        startDate: startDate,
        durationWeeks: Number(durationWeeks)
      });
      alert("Exam timetable auto-optimized and created for this batch!");
      await loadBatchExamTimetable(Number(selectedBatchId));
    } catch (err) {
      alert("Error initializing exam timetable: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReoptimize = async () => {
    if (!examTimetable) return;
    if (confirm("Run optimization solver? This will automatically recalculate dates, sessions, and venues based on all hall availability constraints.")) {
      setLoading(true);
      try {
        await reoptimizeExamTimetable(examTimetable.examTimetableId);
        alert("Exam schedule auto-optimized successfully!");
        await loadBatchExamTimetable(Number(selectedBatchId));
      } catch (err) {
        alert("Error re-optimizing exam timetable: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEntryChange = (index, field, value) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  const handleSaveEntries = async () => {
    if (!examTimetable) return;
    setSaving(true);
    try {
      const payload = entries.map(e => ({
        examEntryId: e.examEntryId,
        moduleId: e.module ? e.module.moduleId : null,
        examDate: e.examDate,
        startTime: e.startTime,
        endTime: e.endTime,
        hallId: e.hall ? e.hall.hallId : null,
        sessionName: e.sessionName,
        studentIdRange: e.studentIdRange,
        allocatedCount: e.allocatedCount
      }));
      await saveExamEntries(examTimetable.examTimetableId, payload);
      alert("Exam schedule saved successfully!");
      await loadBatchExamTimetable(Number(selectedBatchId));
    } catch (err) {
      alert("Error saving exam schedule: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!examTimetable) return;
    try {
      if (examTimetable.status === "published") {
        if (confirm("Are you sure you want to unpublish this exam timetable? Students will no longer see it.")) {
          await unpublishExamTimetable(examTimetable.examTimetableId);
          alert("Exam timetable unpublished!");
          await loadBatchExamTimetable(Number(selectedBatchId));
        }
      } else {
        await publishExamTimetable(examTimetable.examTimetableId);
        alert("Exam timetable published to students successfully!");
        await loadBatchExamTimetable(Number(selectedBatchId));
      }
    } catch (err) {
      alert("Error updating publish status: " + err.message);
    }
  };

  const handleDeleteTimetable = async () => {
    if (!examTimetable) return;
    if (confirm("Are you sure you want to delete this exam timetable draft?")) {
      try {
        await deleteExamTimetable(examTimetable.examTimetableId);
        alert("Exam timetable deleted!");
        await loadBatchExamTimetable(Number(selectedBatchId));
      } catch (err) {
        alert("Error deleting exam timetable: " + err.message);
      }
    }
  };

  const handleAddUnavailability = async (e) => {
    e.preventDefault();
    if (!unavailHallId || !unavailDate) {
      alert("Hall and Date are required.");
      return;
    }
    try {
      await addExamHallUnavailability({
        hallId: Number(unavailHallId),
        unavailableDate: unavailDate,
        startTime: unavailStartTime,
        endTime: unavailEndTime,
        reason: unavailReason
      });
      alert("Hall unavailability recorded!");
      setUnavailReason("");
      loadUnavailabilities();
    } catch (err) {
      alert("Error adding hall unavailability: " + err.message);
    }
  };

  const handleDeleteUnavailability = async (id) => {
    try {
      await deleteExamHallUnavailability(id);
      loadUnavailabilities();
    } catch (err) {
      alert("Error deleting record: " + err.message);
    }
  };

  const isHallUnavailable = (hallId, examDate, startTime) => {
    if (!hallId || !examDate) return false;
    return unavailabilities.some(u => {
      if (u.hall && u.hall.hallId === Number(hallId) && String(u.unavailableDate).substring(0, 10) === String(examDate).substring(0, 10)) {
        return true;
      }
      return false;
    });
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              Home <span style={{ color: "var(--neutral-400)" }}>/</span> <span>Exam Timetable Management</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          {/* Header Banner */}
          <div className="card" style={{
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#ffffff",
            padding: "24px",
            marginBottom: "24px",
            borderRadius: "16px",
            boxShadow: "var(--shadow-md)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: "800", margin: 0, color: "#ffffff" }}>
                Batch Exam Timetable Scheduler
              </h1>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", margin: "4px 0 0 0" }}>
                Define exam periods, run constraint optimization, assign venues, manage hall unavailabilities, and publish official exam schedules to students.
              </p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setShowUnavailModal(!showUnavailModal)}
              style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}
            >
              <Building size={16} />
              <span>Manage Hall Unavailabilities</span>
            </button>
          </div>

          {/* Hall Unavailability Modal / Section */}
          {showUnavailModal && (
            <div className="card" style={{ marginBottom: "24px", borderColor: "var(--primary-300)", background: "var(--neutral-50)" }}>
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Building size={18} style={{ color: "var(--primary-600)" }} />
                  Exam Hall Unavailabilities & Maintenance
                </h3>
                <button className="btn btn-sm" onClick={() => setShowUnavailModal(false)}>Close</button>
              </div>
              <div className="card-body">
                <form onSubmit={handleAddUnavailability} style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr) auto", gap: "12px", alignItems: "end", marginBottom: "20px" }}>
                  <div>
                    <label className="form-label" style={{ fontSize: "12px" }}>Select Hall</label>
                    <select className="form-select" value={unavailHallId} onChange={e => setUnavailHallId(e.target.value)} required>
                      <option value="">Select Hall...</option>
                      {halls.map(h => (
                        <option key={h.hallId} value={h.hallId}>{h.hallName} (Cap: {h.capacity})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: "12px" }}>Unavailable Date</label>
                    <input type="date" className="form-control" value={unavailDate} onChange={e => setUnavailDate(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: "12px" }}>Start Time</label>
                    <input type="time" className="form-control" value={unavailStartTime} onChange={e => setUnavailStartTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: "12px" }}>End Time</label>
                    <input type="time" className="form-control" value={unavailEndTime} onChange={e => setUnavailEndTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: "12px" }}>Reason (Optional)</label>
                    <input type="text" className="form-control" placeholder="Maintenance, event, etc." value={unavailReason} onChange={e => setUnavailReason(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Plus size={14} /> Add Restriction
                  </button>
                </form>

                {unavailabilities.length > 0 && (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Hall</th>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Reason</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unavailabilities.map(u => (
                          <tr key={u.unavailabilityId}>
                            <td><strong>{u.hall?.hallName}</strong></td>
                            <td>{u.unavailableDate}</td>
                            <td>{u.startTime || "09:00"} - {u.endTime || "16:30"}</td>
                            <td>{u.reason || "Unavailable"}</td>
                            <td>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteUnavailability(u.unavailabilityId)}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Batch Selector & Setup Bar */}
          <div className="card" style={{ marginBottom: "24px" }}>
            <div className="card-body" style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ minWidth: "220px" }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Select Academic Batch</label>
                <select
                  className="form-select"
                  value={selectedBatchId}
                  onChange={e => setSelectedBatchId(e.target.value)}
                >
                  {batches.map(b => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.batchName} (Semester {b.semester})
                    </option>
                  ))}
                </select>
              </div>

              {!examTimetable ? (
                <>
                  <div>
                    <label className="form-label" style={{ fontSize: "12px" }}>Exam Start Date</label>
                    <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: "12px" }}>Duration</label>
                    <select className="form-select" value={durationWeeks} onChange={e => setDurationWeeks(e.target.value)}>
                      <option value={1}>1 Week</option>
                      <option value={2}>2 Weeks</option>
                      <option value={3}>3 Weeks</option>
                    </select>
                  </div>
                  <button className="btn btn-primary" onClick={handleCreate} disabled={loading} style={{ marginTop: "22px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Zap size={16} />
                    <span>Auto-Generate & Optimize Schedule</span>
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginLeft: "auto" }}>
                  <button className="btn btn-outline-primary" onClick={handleReoptimize} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Zap size={16} />
                    <span>Auto-Optimize Schedule</span>
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={`badge ${examTimetable.status === "published" ? "badge-success" : "badge-warning"}`} style={{
                      padding: "6px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "700",
                      background: examTimetable.status === "published" ? "#10b981" : "#f59e0b",
                      color: "#fff",
                      textTransform: "uppercase"
                    }}>
                      {examTimetable.status === "published" ? "Published for Students" : "Draft Mode"}
                    </span>
                  </div>

                  <button
                    className={`btn ${examTimetable.status === "published" ? "btn-secondary" : "btn-primary"}`}
                    onClick={handleTogglePublish}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    {examTimetable.status === "published" ? <EyeOff size={16} /> : <CheckCircle size={16} />}
                    <span>{examTimetable.status === "published" ? "Unpublish" : "Publish to Students"}</span>
                  </button>

                  <button className="btn btn-outline-danger" onClick={handleDeleteTimetable}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Exam Schedule Table Editor */}
          {examTimetable && (
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Calendar size={18} style={{ color: "var(--primary-600)" }} />
                  Exam Module Schedule & Manual Venue Settings
                </h3>

                <button className="btn btn-primary" onClick={handleSaveEntries} disabled={saving} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Save size={16} />
                  <span>{saving ? "Saving..." : "Save Exam Schedule"}</span>
                </button>
              </div>

              <div className="card-body" style={{ padding: 0 }}>
                {entries.length === 0 ? (
                  <div className="empty-state" style={{ padding: "40px" }}>
                    <div className="empty-state-text">No modules found for this batch to schedule exams.</div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table" style={{ margin: 0, width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ padding: "16px 24px", minWidth: "260px" }}>Module Code & Name</th>
                          <th style={{ padding: "16px 20px", width: "200px" }}>Exam Date</th>
                          <th style={{ padding: "16px 20px", width: "240px" }}>Session / Time</th>
                          <th style={{ padding: "16px 20px", width: "250px" }}>Assigned Venue (Hall)</th>
                          <th style={{ padding: "16px 20px", width: "260px" }}>Student ID Range / Allocation</th>
                          <th style={{ padding: "16px 24px", width: "160px" }}>Status / Alerts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry, idx) => {
                          const isUnavail = isHallUnavailable(entry.hall?.hallId, entry.examDate, entry.startTime);
                          return (
                            <tr key={entry.examEntryId || idx}>
                              <td style={{ padding: "16px 24px", verticalAlign: "middle" }}>
                                <div><strong style={{ fontSize: "15px", color: "var(--neutral-900)" }}>{entry.module?.moduleCode}</strong></div>
                                <div style={{ fontSize: "12px", color: "var(--neutral-600)" }}>{entry.module?.moduleName}</div>
                              </td>
                              <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                                <input
                                  type="date"
                                  className="form-control form-control-sm"
                                  value={entry.examDate ? String(entry.examDate).substring(0, 10) : ""}
                                  onChange={e => handleEntryChange(idx, "examDate", e.target.value)}
                                  style={{ padding: "6px 10px" }}
                                />
                              </td>
                              <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  <select
                                    className="form-select form-select-sm"
                                    value={entry.sessionName || "Morning Session"}
                                    onChange={e => {
                                      const val = e.target.value;
                                      handleEntryChange(idx, "sessionName", val);
                                      if (val === "Morning Session (3 Hours)" || val === "Morning Session") {
                                        handleEntryChange(idx, "startTime", "09:00");
                                        handleEntryChange(idx, "endTime", "12:00");
                                      } else if (val === "Morning Session (2 Hours)") {
                                        handleEntryChange(idx, "startTime", "09:00");
                                        handleEntryChange(idx, "endTime", "11:00");
                                      } else if (val === "Afternoon Session (3 Hours)" || val === "Afternoon Session") {
                                        handleEntryChange(idx, "startTime", "13:30");
                                        handleEntryChange(idx, "endTime", "16:30");
                                      } else if (val === "Afternoon Session (2 Hours)") {
                                        handleEntryChange(idx, "startTime", "13:30");
                                        handleEntryChange(idx, "endTime", "15:30");
                                      }
                                    }}
                                    style={{ padding: "4px 8px", fontSize: "12px" }}
                                  >
                                    <option value="Morning Session">Morning (09:00 - 12:00) [3h]</option>
                                    <option value="Morning Session (2 Hours)">Morning (09:00 - 11:00) [2h]</option>
                                    <option value="Afternoon Session">Afternoon (13:30 - 16:30) [3h]</option>
                                    <option value="Afternoon Session (2 Hours)">Afternoon (13:30 - 15:30) [2h]</option>
                                    <option value="Custom Session">Custom Time Slot</option>
                                  </select>

                                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <input
                                      type="time"
                                      className="form-control form-control-sm"
                                      value={entry.startTime ? String(entry.startTime).substring(0, 5) : "09:00"}
                                      onChange={e => {
                                        handleEntryChange(idx, "startTime", e.target.value);
                                        handleEntryChange(idx, "sessionName", "Custom Session");
                                      }}
                                      style={{ fontSize: "11px", padding: "2px 4px", width: "90px" }}
                                    />
                                    <span style={{ fontSize: "11px", color: "var(--neutral-500)" }}>to</span>
                                    <input
                                      type="time"
                                      className="form-control form-control-sm"
                                      value={entry.endTime ? String(entry.endTime).substring(0, 5) : "12:00"}
                                      onChange={e => {
                                        handleEntryChange(idx, "endTime", e.target.value);
                                        handleEntryChange(idx, "sessionName", "Custom Session");
                                      }}
                                      style={{ fontSize: "11px", padding: "2px 4px", width: "90px" }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                                <select
                                  className="form-select form-select-sm"
                                  value={entry.hall ? entry.hall.hallId : ""}
                                  onChange={e => {
                                    const hId = e.target.value;
                                    const found = halls.find(h => String(h.hallId) === String(hId));
                                    handleEntryChange(idx, "hall", found || null);
                                  }}
                                  style={{ padding: "6px 10px", borderColor: isUnavail ? "#ef4444" : undefined, background: isUnavail ? "#fef2f2" : undefined }}
                                >
                                  <option value="">Select Exam Hall...</option>
                                  {halls.map(h => (
                                    <option key={h.hallId} value={h.hallId}>
                                      {h.hallName} (Cap: {h.capacity})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="e.g. EG/2021/4001 - EG/2021/4100"
                                    value={entry.studentIdRange || ""}
                                    onChange={e => handleEntryChange(idx, "studentIdRange", e.target.value)}
                                    style={{ fontSize: "12px", padding: "4px 8px" }}
                                  />
                                  <span style={{ fontSize: "11px", color: "var(--primary-700)", fontWeight: "600" }}>
                                    👥 {entry.allocatedCount ? `${entry.allocatedCount} Students` : "Batch Range"}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: "16px 24px", verticalAlign: "middle" }}>
                                {isUnavail ? (
                                  <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <AlertTriangle size={14} /> Hall Unavailable!
                                  </span>
                                ) : entry.hall ? (
                                  <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600" }}>
                                    ✓ Venue Assigned
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "11px", color: "#6b7280" }}>
                                    Pending Venue
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
