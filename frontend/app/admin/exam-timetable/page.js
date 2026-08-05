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
  deleteExamEntry,
  publishExamTimetable,
  unpublishExamTimetable,
  deleteExamTimetable,
  fetchExamHallUnavailabilities,
  addExamHallUnavailability,
} from "../../lib/api";
import { Calendar, CheckCircle, EyeOff, Plus, Trash2, AlertTriangle, Save, Zap, ChevronDown, ChevronUp, Building2, Tag } from "lucide-react";

function moduleKey(entry) {
  return entry.module ? String(entry.module.moduleId) : ("nomod_" + (entry._localId || ""));
}

function calcCountFromRange(rangeStr) {
  if (!rangeStr) return null;
  const matches = rangeStr.match(/(\d+)\s*[-\u2013]\s*.*?(\d+)\s*$/);
  if (matches && matches[1] && matches[2]) {
    const startN = parseInt(matches[1], 10);
    const endN = parseInt(matches[2], 10);
    if (!isNaN(startN) && !isNaN(endN) && endN >= startN) return endN - startN + 1;
  }
  return null;
}

// Given the current range string and a new count, recompute the end reg number
// keeping the start reg number and prefix (e.g. "EG/2021/") fixed.
function calcRangeFromCount(currentRange, newCount) {
  if (!currentRange || !newCount || newCount <= 0) return currentRange;
  // Match prefix + start number, e.g. "EG/2021/4001" → prefix="EG/2021/", startN=4001
  const m = currentRange.match(/^(.*?)(\d+)\s*[-\u2013]/);
  if (!m) return currentRange;
  const prefix = m[1];          // e.g. "EG/2021/"
  const startN = parseInt(m[2], 10); // e.g. 4001
  if (isNaN(startN)) return currentRange;
  const endN = startN + newCount - 1;
  // Preserve zero-padding width from original number
  const padLen = m[2].length;
  const endStr = String(endN).padStart(padLen, "0");
  return prefix + m[2] + " - " + prefix + endStr;
}

function getDeptBadgeConfig(prefixStr) {
  const p = (prefixStr || "").toUpperCase().trim();
  if (p === "EE") return { bg: "#e0f2fe", text: "#0369a1", border: "#7dd3fc", label: "EE" };
  if (p === "ME") return { bg: "#ffedd5", text: "#c2410c", border: "#fdba74", label: "ME" };
  if (p === "CE") return { bg: "#dcfce7", text: "#15803d", border: "#86efac", label: "CE" };
  if (p === "EC" || p === "COM") return { bg: "#f3e8ff", text: "#7e22ce", border: "#d8b4fe", label: "EC" };
  if (p === "MN") return { bg: "#ffe4e6", text: "#be123c", border: "#fda4af", label: "MN" };
  if (p === "IS") return { bg: "#fef9c3", text: "#854d0e", border: "#fde047", label: "IS" };
  return { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1", label: p || "ID" };
}

let localIdCounter = 1;

const SESSION_OPTIONS = [
  { value: "Morning Session", label: "Morning (09:00 - 12:00) [3h]", start: "09:00", end: "12:00" },
  { value: "Morning Session (2 Hours)", label: "Morning (09:00 - 11:00) [2h]", start: "09:00", end: "11:00" },
  { value: "Afternoon Session", label: "Afternoon (13:30 - 16:30) [3h]", start: "13:30", end: "16:30" },
  { value: "Afternoon Session (2 Hours)", label: "Afternoon (13:30 - 15:30) [2h]", start: "13:30", end: "15:30" },
  { value: "Custom Session", label: "Custom Time Slot", start: null, end: null },
];

export default function AdminExamTimetablePage() {
  const [batches, setBatches] = useState([]);
  const [halls, setHalls] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [examTimetable, setExamTimetable] = useState(null);
  const [entries, setEntries] = useState([]);
  const [collapsedModules, setCollapsedModules] = useState({});

  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [unavailabilities, setUnavailabilities] = useState([]);
  const [showUnavailPanel, setShowUnavailPanel] = useState(false);
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
    if (selectedBatchId) loadBatchExamTimetable(Number(selectedBatchId));
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
        const loaded = (details.entries || []).map(e => ({ ...e, _localId: localIdCounter++ }));
        setEntries(loaded);
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

  const groupedModules = () => {
    const groups = [];
    const seen = {};
    for (const entry of entries) {
      const key = moduleKey(entry);
      if (!seen[key]) {
        seen[key] = true;
        groups.push(key);
      }
    }
    return groups.map(key => ({
      key,
      rows: entries.filter(e => moduleKey(e) === key)
    }));
  };

  const updateEntry = (localId, field, value) => {
    setEntries(prev => prev.map(e => e._localId === localId ? { ...e, [field]: value } : e));
  };

  const updateModuleSharedField = (key, field, value) => {
    setEntries(prev => prev.map(e => moduleKey(e) === key ? { ...e, [field]: value } : e));
  };

  const handleAddVenue = (key, templateEntry) => {
    const newEntry = {
      _localId: localIdCounter++,
      _isNew: true,
      module: templateEntry.module,
      examDate: templateEntry.examDate,
      startTime: templateEntry.startTime,
      endTime: templateEntry.endTime,
      sessionName: templateEntry.sessionName,
      hall: null,
      studentIdRange: "",
      allocatedCount: 0
    };
    setEntries(prev => {
      const lastIdx = prev.reduce((best, e, i) => moduleKey(e) === key ? i : best, -1);
      const next = [...prev];
      next.splice(lastIdx + 1, 0, newEntry);
      return next;
    });
  };

  const handleDeleteVenueRow = async (entry) => {
    if (entry.examEntryId && examTimetable) {
      try {
        await deleteExamEntry(examTimetable.examTimetableId, entry.examEntryId);
      } catch (err) {
        alert("Error deleting venue: " + err.message);
        return;
      }
    }
    setEntries(prev => prev.filter(e => e._localId !== entry._localId));
  };

  const handleCreate = async () => {
    if (!selectedBatchId || !startDate) { alert("Please select a batch and start date."); return; }
    setLoading(true);
    try {
      await createExamTimetable({ batchId: Number(selectedBatchId), startDate, durationWeeks: Number(durationWeeks) });
      alert("Exam timetable auto-optimized and created!");
      await loadBatchExamTimetable(Number(selectedBatchId));
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReoptimize = async () => {
    if (!examTimetable) return;
    if (confirm("Re-run optimization? This will recalculate all dates, sessions, and venues.")) {
      setLoading(true);
      try {
        await reoptimizeExamTimetable(examTimetable.examTimetableId);
        alert("Exam schedule re-optimized!");
        await loadBatchExamTimetable(Number(selectedBatchId));
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveEntries = async () => {
    if (!examTimetable) return;
    setSaving(true);
    try {
      const payload = entries.map(e => ({
        examEntryId: e.examEntryId || null,
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
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!examTimetable) return;
    try {
      if (examTimetable.status === "published") {
        if (confirm("Unpublish this timetable? Students will no longer see it.")) {
          await unpublishExamTimetable(examTimetable.examTimetableId);
          alert("Unpublished!");
          await loadBatchExamTimetable(Number(selectedBatchId));
        }
      } else {
        await publishExamTimetable(examTimetable.examTimetableId);
        alert("Published to students!");
        await loadBatchExamTimetable(Number(selectedBatchId));
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteTimetable = async () => {
    if (!examTimetable) return;
    if (confirm("Delete this exam timetable draft?")) {
      try {
        await deleteExamTimetable(examTimetable.examTimetableId);
        alert("Deleted!");
        await loadBatchExamTimetable(Number(selectedBatchId));
      } catch (err) {
        alert("Error: " + err.message);
      }
    }
  };

  const handleAddUnavailability = async (e) => {
    e.preventDefault();
    if (!unavailHallId) { alert("Please select a Hall."); return; }
    try {
      await addExamHallUnavailability({ hallId: Number(unavailHallId), unavailableDate: unavailDate || null, startTime: unavailStartTime, endTime: unavailEndTime, reason: unavailReason });
      alert("Hall unavailability recorded!");
      setUnavailReason("");
      setUnavailDate("");
      setUnavailStartTime("");
      setUnavailEndTime("");
      loadUnavailabilities();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const isHallUnavailable = (hallId, examDate) => {
    if (!hallId || !examDate) return false;
    return unavailabilities.some(u => {
      if (!u.hall || u.hall.hallId !== Number(hallId)) return false;
      if (!u.unavailableDate) return true;
      return String(u.unavailableDate).substring(0, 10) === String(examDate).substring(0, 10);
    });
  };

  const toggleCollapse = (key) => setCollapsedModules(prev => ({ ...prev, [key]: !prev[key] }));

  const groups = groupedModules();

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              Home <span style={{ color: "var(--neutral-400)" }}>/</span> <span>Exam Timetable</span>
            </div>
          </div>
        </header>

        <main className="page-content">

          {/* ─── Header Banner ─── */}
          <div style={{
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#fff", padding: "24px", marginBottom: "24px",
            borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.18)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h1 style={{ fontSize: "22px", fontWeight: "800", margin: "0 0 6px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Calendar size={24} style={{ color: "#60a5fa" }} /> Exam Timetable Management
                </h1>
                <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
                  Multi-venue support per module. Add extra halls, set student ranges, and manually adjust any entry.
                </p>
              </div>
              {examTimetable && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={handleReoptimize} disabled={loading} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Zap size={14} /> Re-Optimize
                  </button>
                  <button onClick={handleTogglePublish} style={{ background: examTimetable.status === "published" ? "#dc2626" : "#16a34a", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                    {examTimetable.status === "published" ? <><EyeOff size={14} /> Unpublish</> : <><CheckCircle size={14} /> Publish</>}
                  </button>
                  <button onClick={handleDeleteTimetable} style={{ background: "#6b7280", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Trash2 size={14} /> Delete Draft
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>{error}</div>}

          {/* ─── Batch & Settings ─── */}
          <div className="card" style={{ marginBottom: "20px" }}>
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>Batch &amp; Schedule Settings</h3>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <label className="form-label" style={{ fontWeight: "700", color: "#334155" }}>Batch</label>
                  <select className="form-select" value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} style={{ borderRadius: "10px", border: "1.5px solid #cbd5e1", fontWeight: "600", fontSize: "13px", padding: "8px 12px", background: "#f8fafc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                    {batches.map(b => <option key={b.batchId} value={b.batchId}>{b.batchName}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 1 160px" }}>
                  <label className="form-label" style={{ fontWeight: "700", color: "#334155" }}>Start Date</label>
                  <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ borderRadius: "10px", border: "1.5px solid #cbd5e1", fontWeight: "600", fontSize: "13px", padding: "8px 12px", background: "#f8fafc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }} />
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <label className="form-label" style={{ fontWeight: "700", color: "#334155" }}>Duration (weeks)</label>
                  <input type="number" className="form-control" min={1} max={8} value={durationWeeks} onChange={e => setDurationWeeks(Number(e.target.value))} style={{ borderRadius: "10px", border: "1.5px solid #cbd5e1", fontWeight: "600", fontSize: "13px", padding: "8px 12px", background: "#f8fafc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }} />
                </div>
                <div>
                  {!examTimetable && (
                    <button onClick={handleCreate} disabled={loading} style={{ background: "var(--primary-600)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Zap size={15} /> {loading ? "Generating..." : "Auto-Generate & Optimize"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Hall Unavailabilities ─── */}
          <div className="card" style={{ marginBottom: "20px" }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={16} style={{ color: "#f59e0b" }} /> Hall Unavailabilities
                {unavailabilities.length > 0 && (
                  <span style={{ background: "#fef3c7", color: "#92400e", fontSize: "11px", padding: "1px 7px", borderRadius: "10px", fontWeight: "700" }}>{unavailabilities.length}</span>
                )}
              </h3>
              <button onClick={() => setShowUnavailPanel(!showUnavailPanel)} style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                {showUnavailPanel ? "Hide" : "+ Add Unavailability"}
              </button>
            </div>
            {showUnavailPanel && (
              <div className="card-body" style={{ borderTop: "1px solid var(--neutral-200)" }}>
                <form onSubmit={handleAddUnavailability} style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end", marginBottom: "16px" }}>
                  <div style={{ flex: "1 1 180px" }}>
                    <label className="form-label" style={{ fontSize: "12px" }}>Hall</label>
                    <select className="form-select" value={unavailHallId} onChange={e => setUnavailHallId(e.target.value)} required>
                      <option value="">Select Hall...</option>
                      {halls.map(h => <option key={h.hallId} value={h.hallId}>{h.hallName}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: "1 1 130px" }}>
                    <label className="form-label" style={{ fontSize: "12px" }}>Date</label>
                    <input type="date" className="form-control form-control-sm" value={unavailDate} onChange={e => setUnavailDate(e.target.value)} />
                  </div>
                  <div style={{ flex: "0 0 100px" }}>
                    <label className="form-label" style={{ fontSize: "12px" }}>Start</label>
                    <input type="time" className="form-control form-control-sm" value={unavailStartTime} onChange={e => setUnavailStartTime(e.target.value)} />
                  </div>
                  <div style={{ flex: "0 0 100px" }}>
                    <label className="form-label" style={{ fontSize: "12px" }}>End</label>
                    <input type="time" className="form-control form-control-sm" value={unavailEndTime} onChange={e => setUnavailEndTime(e.target.value)} />
                  </div>
                  <div style={{ flex: "2 1 180px" }}>
                    <label className="form-label" style={{ fontSize: "12px" }}>Reason</label>
                    <input type="text" className="form-control form-control-sm" placeholder="Reason" value={unavailReason} onChange={e => setUnavailReason(e.target.value)} />
                  </div>
                  <button type="submit" style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: "6px", padding: "7px 14px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>Record</button>
                </form>
                {unavailabilities.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {unavailabilities.map(u => (
                      <div key={u.unavailabilityId} style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "5px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span><strong>{u.hall?.hallName}</strong> — {u.unavailableDate ? String(u.unavailableDate).substring(0, 10) : "All Dates"}</span>
                        <span style={{ fontWeight: "600", color: "#991b1b" }}>
                          {u.startTime && u.endTime ? `(${String(u.startTime).substring(0, 5)} - ${String(u.endTime).substring(0, 5)})` : "(Full Day)"}
                        </span>
                        {u.reason && <span style={{ color: "#6b7280" }}>[{u.reason}]</span>}
                        <button onClick={() => { deleteExamHallUnavailability(u.unavailabilityId).then(loadUnavailabilities).catch(e => alert(e.message)); }} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: 0 }}><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Multi-Venue Exam Schedule Editor ─── */}
          {examTimetable && (
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Calendar size={18} style={{ color: "var(--primary-600)" }} />
                    Exam Schedule — Multi-Venue Editor
                    <span style={{ fontSize: "12px", background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "12px", fontWeight: "600" }}>
                      {groups.length} modules
                    </span>
                  </h3>
                  <p style={{ margin: "4px 0 0 26px", fontSize: "12px", color: "var(--neutral-500)" }}>
                    Each module can have multiple venue rows. Click <strong>Add Another Venue</strong> to split across halls.
                  </p>
                </div>
                <button onClick={handleSaveEntries} disabled={saving} style={{ background: "var(--primary-600)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Save size={15} /> {saving ? "Saving..." : "Save All Changes"}
                </button>
              </div>

              <div className="card-body" style={{ padding: 0 }}>
                {groups.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "var(--neutral-500)" }}>No modules found for this batch.</div>
                ) : (
                  <div>
                    {groups.map((group, gIdx) => {
                      const firstRow = group.rows[0];
                      const totalAllocated = group.rows.reduce((sum, r) => sum + (Number(r.allocatedCount) || 0), 0);
                      const hasUnavail = group.rows.some(r => isHallUnavailable(r.hall?.hallId, r.examDate));
                      const isCollapsed = collapsedModules[group.key];
                      const rowBg = gIdx % 2 === 0 ? "#f8fafc" : "#ffffff";

                      return (
                        <div key={group.key} style={{ borderBottom: "2px solid var(--neutral-200)" }}>

                          {/* Module header row (clickable to expand/collapse) */}
                          <div
                            style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", background: rowBg, cursor: "pointer", flexWrap: "wrap" }}
                            onClick={() => toggleCollapse(group.key)}
                          >
                            <div style={{ color: "var(--neutral-400)", flexShrink: 0 }}>
                              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </div>

                            {/* Module info */}
                            <div style={{ flex: "0 0 200px", minWidth: "160px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <strong style={{ fontSize: "14px", color: "var(--neutral-900)" }}>{firstRow?.module?.moduleCode}</strong>
                                {hasUnavail && <span style={{ fontSize: "10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", padding: "1px 5px", borderRadius: "5px", fontWeight: "700" }}>⚠ Conflict</span>}
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--neutral-500)", marginTop: "2px" }}>{firstRow?.module?.moduleName}</div>
                            </div>

                            {/* Shared Date */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 170px" }} onClick={e => e.stopPropagation()}>
                              <Calendar size={14} style={{ color: "var(--neutral-500)" }} />
                              <input
                                type="date"
                                className="form-control form-control-sm"
                                value={firstRow?.examDate ? String(firstRow.examDate).substring(0, 10) : ""}
                                onChange={e => updateModuleSharedField(group.key, "examDate", e.target.value)}
                                style={{ fontSize: "12px", maxWidth: "145px" }}
                              />
                            </div>

                            {/* Shared Session */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 210px" }} onClick={e => e.stopPropagation()}>
                              <span style={{ fontSize: "11px", color: "var(--neutral-500)", fontWeight: "600", whiteSpace: "nowrap" }}>Session:</span>
                              <select
                                className="form-select"
                                value={firstRow?.sessionName || "Morning Session"}
                                onChange={e => {
                                  const val = e.target.value;
                                  const opt = SESSION_OPTIONS.find(o => o.value === val);
                                  updateModuleSharedField(group.key, "sessionName", val);
                                  if (opt?.start) { updateModuleSharedField(group.key, "startTime", opt.start); updateModuleSharedField(group.key, "endTime", opt.end); }
                                }}
                                style={{ maxWidth: "220px" }}
                              >
                                {SESSION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>

                            {/* Custom time */}
                            <div style={{ display: "flex", alignItems: "center", gap: "3px" }} onClick={e => e.stopPropagation()}>
                              <input type="time" className="form-control form-control-sm"
                                value={firstRow?.startTime ? String(firstRow.startTime).substring(0, 5) : "09:00"}
                                onChange={e => { updateModuleSharedField(group.key, "startTime", e.target.value); updateModuleSharedField(group.key, "sessionName", "Custom Session"); }}
                                style={{ fontSize: "11px", width: "80px" }}
                              />
                              <span style={{ fontSize: "11px", color: "var(--neutral-400)" }}>–</span>
                              <input type="time" className="form-control form-control-sm"
                                value={firstRow?.endTime ? String(firstRow.endTime).substring(0, 5) : "12:00"}
                                onChange={e => { updateModuleSharedField(group.key, "endTime", e.target.value); updateModuleSharedField(group.key, "sessionName", "Custom Session"); }}
                                style={{ fontSize: "11px", width: "80px" }}
                              />
                            </div>

                            {/* Summary */}
                            <div style={{ flex: "0 0 auto", marginLeft: "auto" }} onClick={e => e.stopPropagation()}>
                              <span style={{ fontSize: "12px", background: "#eff6ff", color: "#1d4ed8", padding: "4px 10px", borderRadius: "10px", fontWeight: "700", whiteSpace: "nowrap" }}>
                                👥 {totalAllocated} students / {group.rows.length} {group.rows.length === 1 ? "venue" : "venues"}
                              </span>
                            </div>
                          </div>

                          {/* Venue sub-rows */}
                          {!isCollapsed && (
                            <div style={{ background: gIdx % 2 === 0 ? "#f1f5f9" : "#f8fafc", paddingBottom: "10px" }}>
                              {/* Column headers */}
                              <div style={{ display: "grid", gridTemplateColumns: "minmax(200px,1fr) minmax(220px,1fr) 50px 36px", gap: "8px", padding: "6px 20px 6px 52px", fontSize: "10px", fontWeight: "800", color: "var(--neutral-400)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--neutral-200)" }}>
                                <span>Venue / Hall</span>
                                <span>Student Registration Range</span>
                                <span>Count</span>
                                <span></span>
                              </div>

                              {group.rows.map((entry) => {
                                const hallUnavail = isHallUnavailable(entry.hall?.hallId, entry.examDate);
                                return (
                                  <div key={entry._localId} style={{ display: "grid", gridTemplateColumns: "minmax(200px,1fr) minmax(220px,1fr) 50px 36px", gap: "8px", padding: "8px 20px 8px 52px", alignItems: "center", borderBottom: "1px solid var(--neutral-100)", background: hallUnavail ? "#fff5f5" : "transparent" }}>

                                    {/* Hall select */}
                                    <div style={{ position: "relative" }}>
                                      <div style={{
                                        position: "absolute",
                                        left: "10px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        pointerEvents: "none",
                                        color: "#64748b",
                                        display: "flex",
                                        alignItems: "center"
                                      }}>
                                        <Building2 size={16} />
                                      </div>
                                      <select
                                        className="form-select"
                                        value={entry.hall ? entry.hall.hallId : ""}
                                        onChange={e => {
                                          const hId = e.target.value;
                                          const found = halls.find(h => String(h.hallId) === String(hId));
                                          updateEntry(entry._localId, "hall", found || null);
                                        }}
                                        style={{
                                          width: "100%",
                                          padding: "8px 12px 8px 34px",
                                          fontSize: "13px",
                                          fontWeight: "600",
                                          color: "#0f172a",
                                          background: "#ffffff",
                                          border: "1.5px solid",
                                          borderColor: hallUnavail ? "#ef4444" : "#cbd5e1",
                                          borderRadius: "10px",
                                          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                                          outline: "none",
                                          transition: "all 0.2s ease"
                                        }}
                                      >
                                        <option value="">— Select Hall / Venue —</option>
                                        {halls.map(h => (
                                          <option key={h.hallId} value={h.hallId}>{h.hallName} (Cap: {h.capacity})</option>
                                        ))}
                                      </select>
                                      {hallUnavail && <div style={{ fontSize: "11px", color: "#dc2626", fontWeight: "700", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}><AlertTriangle size={12} /> Unavailable on exam date!</div>}
                                    </div>

                                    {/* Student range */}
                                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                      {(() => {
                                        let prefix = null;
                                        if (entry.studentIdRange && entry.studentIdRange.includes(":")) {
                                          prefix = entry.studentIdRange.split(":")[0].trim();
                                        }
                                        const cfg = prefix ? getDeptBadgeConfig(prefix) : null;
                                        return (
                                          <div style={{
                                            position: "absolute",
                                            left: "10px",
                                            display: "flex",
                                            alignItems: "center",
                                            pointerEvents: "none",
                                            zIndex: 2
                                          }}>
                                            {cfg ? (
                                              <span style={{
                                                background: cfg.bg,
                                                color: cfg.text,
                                                border: `1px solid ${cfg.border}`,
                                                padding: "2px 7px",
                                                borderRadius: "6px",
                                                fontSize: "11px",
                                                fontWeight: "800",
                                                letterSpacing: "0.04em",
                                                textTransform: "uppercase",
                                                boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                                              }}>
                                                {cfg.label}
                                              </span>
                                            ) : (
                                              <Tag size={15} style={{ color: "#3b82f6" }} />
                                            )}
                                          </div>
                                        );
                                      })()}
                                      <input
                                        type="text"
                                        placeholder="e.g. EG/2022/4985 - EG/2023/5085"
                                        value={entry.studentIdRange || ""}
                                        onChange={e => {
                                          const val = e.target.value;
                                          updateEntry(entry._localId, "studentIdRange", val);
                                          const calc = calcCountFromRange(val);
                                          if (calc !== null) updateEntry(entry._localId, "allocatedCount", calc);
                                        }}
                                        style={{
                                          width: "100%",
                                          padding: "9px 12px",
                                          paddingLeft: (entry.studentIdRange && entry.studentIdRange.includes(":")) ? "64px" : "36px",
                                          fontSize: "13px",
                                          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                                          fontWeight: "600",
                                          color: "#0f172a",
                                          letterSpacing: "0.02em",
                                          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                                          border: "1.5px solid #cbd5e1",
                                          borderRadius: "10px",
                                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(0, 0, 0, 0.02)",
                                          outline: "none",
                                          transition: "all 0.2s ease"
                                        }}
                                        onFocus={e => {
                                          e.target.style.borderColor = "#3b82f6";
                                          e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.18), inset 0 1px 2px rgba(0, 0, 0, 0.02)";
                                          e.target.style.background = "#ffffff";
                                        }}
                                        onBlur={e => {
                                          e.target.style.borderColor = "#cbd5e1";
                                          e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(0, 0, 0, 0.02)";
                                          e.target.style.background = "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)";
                                        }}
                                      />
                                    </div>

                                    {/* Count */}
                                    <div>
                                      <input
                                        type="number"
                                        placeholder="0"
                                        min={1}
                                        value={entry.allocatedCount ? entry.allocatedCount : ""}
                                        onChange={e => {
                                          const newCount = e.target.value ? Number(e.target.value) : 0;
                                          updateEntry(entry._localId, "allocatedCount", newCount);
                                          if (newCount > 0 && entry.studentIdRange) {
                                            const newRange = calcRangeFromCount(entry.studentIdRange, newCount);
                                            if (newRange !== entry.studentIdRange) {
                                              updateEntry(entry._localId, "studentIdRange", newRange);
                                            }
                                          }
                                        }}
                                        style={{
                                          width: "56px",
                                          padding: "8px 4px",
                                          fontSize: "13px",
                                          fontWeight: "800",
                                          fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                                          color: "#1d4ed8",
                                          background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
                                          border: "1.5px solid #93c5fd",
                                          borderRadius: "10px",
                                          textAlign: "center",
                                          boxShadow: "0 1px 2px rgba(37, 99, 235, 0.08)",
                                          outline: "none",
                                          transition: "all 0.2s ease"
                                        }}
                                        onFocus={e => {
                                          e.target.style.borderColor = "#2563eb";
                                          e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.2)";
                                        }}
                                        onBlur={e => {
                                          e.target.style.borderColor = "#93c5fd";
                                          e.target.style.boxShadow = "0 1px 2px rgba(37, 99, 235, 0.08)";
                                        }}
                                      />
                                    </div>

                                    {/* Delete — inline, same row, centered */}
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      <button
                                        onClick={() => handleDeleteVenueRow(entry)}
                                        title="Remove this venue"
                                        style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", padding: "5px 7px", cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center" }}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}


                              {/* Add Venue button */}
                              <div style={{ padding: "8px 20px 2px 52px" }}>
                                <button
                                  onClick={() => handleAddVenue(group.key, group.rows[0])}
                                  style={{ background: "#eff6ff", border: "1px dashed #93c5fd", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", color: "#1d4ed8", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s" }}
                                  onMouseEnter={e => e.currentTarget.style.background = "#dbeafe"}
                                  onMouseLeave={e => e.currentTarget.style.background = "#eff6ff"}
                                >
                                  <Plus size={13} /> Add Another Venue for this Module
                                </button>
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
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
