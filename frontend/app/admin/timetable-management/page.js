"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { 
  fetchBatches, 
  fetchTimetableVersions, 
  publishTimetableVersion, 
  deleteTimetableVersion, 
  fetchTimetable,
  fetchTimeSlots,
  fetchLabSchedules,
  fetchDepartments
} from "../../lib/api";
import { 
  Calendar, 
  CheckCircle, 
  Eye, 
  Trash2, 
  Clock, 
  Layers,
  GraduationCap,
  RefreshCw,
  Building,
  Users,
  FlaskConical,
  X
} from "lucide-react";

function buildTimeSlots(entries, dbTimeSlots, selectedBatch) {
  const slotMap = new Map();

  // 1. Add slots from database
  if (Array.isArray(dbTimeSlots) && dbTimeSlots.length > 0) {
    for (const slot of dbTimeSlots) {
      const start = slot.startTime.substring(0, 5);
      const end = slot.endTime.substring(0, 5);
      // Filter strictly between 08:30 and 17:30
      if (start >= "08:30" && end <= "17:30") {
        const key = `${start}|${end}`;
        if (!slotMap.has(key)) {
          slotMap.set(key, {
            start,
            end,
            label: `${start} – ${end}`,
          });
        }
      }
    }
  }

  // 2. Add slots from entries (in case any custom timing exists)
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      if (entry.startTime && entry.endTime) {
        const start = entry.startTime.substring(0, 5);
        const end = entry.endTime.substring(0, 5);
        if (start >= "08:30" && end <= "17:30") {
          const key = `${start}|${end}`;
          if (!slotMap.has(key)) {
            slotMap.set(key, {
              start,
              end,
              label: `${start} – ${end}`,
            });
          }
        }
      }
    }
  }

  // 3. Make sure lunch break is added as a slot
  if (selectedBatch) {
    const lunchStart = selectedBatch.lunchStartTime ? selectedBatch.lunchStartTime.substring(0, 5) : "12:30";
    const lunchEnd = selectedBatch.lunchEndTime ? selectedBatch.lunchEndTime.substring(0, 5) : "13:30";
    if (lunchStart >= "08:30" && lunchEnd <= "17:30") {
      const key = `${lunchStart}|${lunchEnd}`;
      if (!slotMap.has(key)) {
        slotMap.set(key, {
          start: lunchStart,
          end: lunchEnd,
          label: `${lunchStart} – ${lunchEnd}`,
        });
      }
    }
  }

  // 4. Default slots if database is empty
  if (slotMap.size === 0) {
    const defaults = ["08:30|09:30", "09:30|10:30", "10:30|11:30", "11:30|12:30", "12:30|13:30", "13:30|14:30", "14:30|15:30", "15:30|16:30", "16:30|17:30"];
    for (const d of defaults) {
      const [start, end] = d.split("|");
      slotMap.set(d, { start, end, label: `${start} – ${end}` });
    }
  }

  return Array.from(slotMap.values()).sort((a, b) => a.start.localeCompare(b.start));
}

export default function TimetableManagement() {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [versions, setVersions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");

  // Bulk publish state removed

  // Preview modal states
  const [previewVersion, setPreviewVersion] = useState(null);
  const [previewEntries, setPreviewEntries] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [labSchedules, setLabSchedules] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [loading, setLoading] = useState(true);
  const [versionLoading, setVersionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    loadBatches();
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  };

  const loadBatches = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchBatches();
      setBatches(data);
      if (data.length > 0) {
        setSelectedBatchId(String(data[0].batchId));
        // Only auto-load versions for sem < 3 batches; sem >= 3 requires dept selection
        if (data[0].semester < 3) {
          loadVersions(data[0].batchId, "");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch batches from the system.");
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (batchId, deptId = selectedDeptId) => {
    setVersionLoading(true);
    setActionMessage("");
    setActionError("");
    try {
      const data = await fetchTimetableVersions(batchId, deptId);
      setVersions(data);
    } catch (err) {
      console.error(err);
      setActionError("Failed to fetch versions for the selected batch.");
    } finally {
      setVersionLoading(false);
    }
  };

  const handleBatchChange = (batchId) => {
    setSelectedBatchId(batchId);
    setSelectedDeptId(""); // Reset department filter on batch change
    // For sem >= 3, require dept selection first
    const selBatch = batches.find(b => String(b.batchId) === String(batchId));
    if (selBatch && selBatch.semester >= 3) {
      setVersions([]);
    } else {
      loadVersions(batchId, "");
    }
  };

  const handleDeptChange = (deptId) => {
    setSelectedDeptId(deptId);
    if (selectedBatchId) {
      if (deptId) {
        loadVersions(selectedBatchId, deptId);
      } else {
        setVersions([]);
      }
    }
  };

  const handlePublish = async (timetableId) => {
    setActionMessage("");
    setActionError("");
    try {
      const res = await publishTimetableVersion(timetableId);
      setActionMessage("Timetable version set to Active! Other versions have been set to Draft.");
      loadVersions(selectedBatchId, selectedDeptId);
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Failed to publish timetable version.");
    }
  };

  const handleDelete = async (timetableId) => {
    if (!confirm("Are you sure you want to delete this timetable version? All its slots will be lost permanently.")) {
      return;
    }
    setActionMessage("");
    setActionError("");
    try {
      await deleteTimetableVersion(timetableId);
      setActionMessage("Timetable version deleted successfully.");
      loadVersions(selectedBatchId, selectedDeptId);
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Failed to delete timetable version.");
    }
  };

  // handleBulkPublish removed

  const handleOpenPreview = async (version) => {
    if (selectedBatchObj && selectedBatchObj.semester >= 3 && !selectedDeptId) {
      alert("Please select a Department first to preview the semester schedule.");
      return;
    }
    setPreviewVersion(version);
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewEntries([]);
    try {
      // Fetch slots, labs and timetable entries in parallel
      const [slotsData, labsData, entriesData] = await Promise.all([
        fetchTimeSlots(),
        fetchLabSchedules(),
        fetchTimetable(null, selectedDeptId ? Number(selectedDeptId) : null, false, version.timetableId)
      ]);
      setTimeSlots(slotsData);
      setLabSchedules(labsData);
      setPreviewEntries(entriesData);
    } catch (err) {
      console.error(err);
      setPreviewError("Could not load preview data for this timetable version.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewVersion(null);
    setPreviewEntries([]);
  };

  const selectedBatchObj = batches.find(b => String(b.batchId) === String(selectedBatchId));

  // Build grid helper variables for Preview Modal
  const visibleDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  
  // Group entries by slot & day
  const previewEntryMap = new Map();
  previewEntries.forEach(entry => {
    if (entry.dayOfWeek) {
      const start = entry.startTime ? entry.startTime.substring(0, 5) : "";
      const end = entry.endTime ? entry.endTime.substring(0, 5) : "";
      const key = `${entry.dayOfWeek}|${start}|${end}`;
      if (!previewEntryMap.has(key)) {
        previewEntryMap.set(key, []);
      }
      previewEntryMap.get(key).push(entry);
    }
  });

  // Filter lab schedules belonging to previewed batch and department
  const getLabSchedulesForCell = (day, start, end) => {
    if (!selectedBatchObj) return [];
    return labSchedules.filter(lab => {
      const isSameBatch = lab.batch && lab.batch.batchId === selectedBatchObj.batchId;
      const isSameDay = lab.dayOfWeek === day;
      const labStart = lab.startTime ? lab.startTime.substring(0, 5) : "";
      const labEnd = lab.endTime ? lab.endTime.substring(0, 5) : "";
      const overlaps = labStart < end && labEnd > start;
      
      if (selectedBatchObj.semester >= 3 && selectedDeptId) {
        const isSameDept = lab.department && String(lab.department.departmentId) === String(selectedDeptId);
        return isSameBatch && isSameDay && overlaps && isSameDept;
      }
      return isSameBatch && isSameDay && overlaps;
    });
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              Home <span style={{ color: "var(--neutral-400)" }}>/</span> <span>Manage Timetables</span>
            </div>
          </div>
        </header>

        <main className="page-content" style={{ padding: "32px" }}>
          
          <div className="hero" style={{ marginBottom: "32px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--neutral-900)", display: "flex", alignItems: "center", gap: "10px" }}>
              <Layers style={{ color: "var(--primary-600)" }} />
              Timetable Management
            </h1>
            <p style={{ color: "var(--neutral-500)", marginTop: "4px" }}>
              Manage versions, compare schedules, preview draft layouts, and publish drafts.
            </p>
          </div>

          {error && (
            <div className="card" style={{ marginBottom: "24px", borderColor: "#fecaca", background: "#fef2f2" }}>
              <div className="card-body" style={{ color: "#991b1b", padding: "16px" }}>{error}</div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "28px", alignItems: "start" }}>
            
            {/* Left Column: Version Management */}
            <div>
              <div className="card" style={{ marginBottom: "24px" }}>
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Calendar size={18} style={{ color: "var(--primary-600)" }} />
                    Version Control by Batch
                  </h3>
                  <button 
                    onClick={() => selectedBatchId && loadVersions(selectedBatchId, selectedDeptId)} 
                    className="btn btn-icon"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--neutral-500)" }}
                    title="Refresh list"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <div className="card-body" style={{ padding: "20px" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "var(--neutral-600)", marginBottom: "6px" }}>Select Academic Batch</label>
                    <select
                      className="form-select"
                      value={selectedBatchId}
                      onChange={(e) => handleBatchChange(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--neutral-300)" }}
                      disabled={loading || batches.length === 0}
                    >
                      {batches.map((b) => (
                        <option key={b.batchId} value={b.batchId}>
                          {b.batchName} (Semester {b.semester})
                        </option>
                      ))}
                    </select>

                    {selectedBatchObj && selectedBatchObj.semester >= 3 && (
                      <div style={{ marginTop: "16px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "var(--neutral-600)", marginBottom: "6px" }}>Filter by Department</label>
                        <select
                          className="form-select"
                          value={selectedDeptId}
                          onChange={(e) => handleDeptChange(e.target.value)}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--neutral-300)" }}
                        >
                          <option value="">Select Department</option>
                          {departments.filter(d => d.departmentId !== 4).map((d) => (
                            <option key={d.departmentId} value={d.departmentId}>
                              {d.departmentName} ({d.departmentCode})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {actionMessage && (
                    <div className="card" style={{ marginBottom: "16px", borderColor: "#bbf7d0", background: "#f0fdf4" }}>
                      <div className="card-body" style={{ color: "#166534", padding: "12px", fontSize: "14px" }}>
                        ✓ {actionMessage}
                      </div>
                    </div>
                  )}

                  {actionError && (
                    <div className="card" style={{ marginBottom: "16px", borderColor: "#fecaca", background: "#fef2f2" }}>
                      <div className="card-body" style={{ color: "#991b1b", padding: "12px", fontSize: "14px" }}>
                        ⚠️ {actionError}
                      </div>
                    </div>
                  )}

                  {versionLoading ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--neutral-500)" }}>
                      <RefreshCw className="animate-spin" style={{ margin: "0 auto 12px auto" }} />
                      Loading version history...
                    </div>
                  ) : (() => {
                    const selBatch = batches.find(b => String(b.batchId) === String(selectedBatchId));
                    const needsDept = selBatch && selBatch.semester >= 3;
                    if (needsDept && !selectedDeptId) {
                      return (
                        <div style={{ padding: "32px", textAlign: "center", color: "var(--neutral-600)", border: "1px dashed var(--neutral-300)", borderRadius: "8px", background: "var(--neutral-50)" }}>
                          <div style={{ fontSize: "28px", marginBottom: "8px" }}>🏫</div>
                          <div style={{ fontWeight: "700", marginBottom: "4px" }}>Select a Department</div>
                          <p style={{ fontSize: "12px", color: "var(--neutral-500)" }}>
                            This batch has department-wise timetables (Semester {selBatch.semester}).<br/>
                            Please select a department above to view its version history.
                          </p>
                        </div>
                      );
                    }
                    if (versions.length === 0) {
                      return (
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--neutral-500)", border: "1px dashed var(--neutral-300)", borderRadius: "8px" }}>
                          No timetables generated for this {needsDept ? "department" : "batch"} yet.
                          <p style={{ fontSize: "12px", marginTop: "4px" }}>Go to the Admin Panel to run the AI Optimizer.</p>
                        </div>
                      );
                    }
                    return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {versions.map((ver) => {
                        const isActive = ver.status === "active";
                        const dateStr = ver.generatedAt 
                          ? new Date(ver.generatedAt).toLocaleString()
                          : "N/A";
                        return (
                          <div 
                            key={ver.timetableId} 
                            style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "space-between", 
                              padding: "16px", 
                              borderRadius: "12px", 
                              border: isActive ? "2px solid var(--primary-500)" : "1px solid var(--neutral-200)",
                              background: isActive ? "var(--neutral-0)" : "var(--neutral-50)",
                              boxShadow: isActive ? "var(--shadow-md)" : "var(--shadow-xs)"
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontWeight: "700", color: "var(--neutral-900)" }}>{ver.timetableName}</span>
                                {isActive ? (
                                  <span style={{ 
                                    fontSize: "11px", 
                                    padding: "2px 8px", 
                                    borderRadius: "12px", 
                                    background: "#dcfce7", 
                                    color: "#166534", 
                                    fontWeight: "700" 
                                  }}>Active{(() => {
                                     const d = departments.find(dept => dept.departmentId === ver.departmentId);
                                     return d ? ` (${d.departmentCode})` : "";
                                   })()}</span>
                                ) : (
                                  <span style={{ 
                                    fontSize: "11px", 
                                    padding: "2px 8px", 
                                    borderRadius: "12px", 
                                    background: "#e2e8f0", 
                                    color: "#475569", 
                                    fontWeight: "700" 
                                  }}>Draft</span>
                                )}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--neutral-500)", marginTop: "4px" }}>
                                <Clock size={12} />
                                <span>Generated: {dateStr}</span>
                              </div>
                            </div>
                            
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => handleOpenPreview(ver)}
                                className="btn btn-sm btn-secondary"
                                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px" }}
                              >
                                <Eye size={14} /> Preview
                              </button>
                              
                              {!isActive && (
                                <>
                                  <button
                                    onClick={() => handlePublish(ver.timetableId)}
                                    className="btn btn-sm btn-save"
                                    style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px" }}
                                  >
                                    <CheckCircle size={14} /> Publish
                                  </button>
                                  <button
                                    onClick={() => handleDelete(ver.timetableId)}
                                    className="btn btn-sm btn-danger"
                                    style={{ display: "flex", alignItems: "center", justifyItems: "center", padding: "6px 10px" }}
                                    title="Delete Draft"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Right Column: Bulk Operations & Info */}
            <div>
              
              {/* Bulk Publish Card removed */}

              {/* Information / Help Card */}
              <div className="card" style={{ background: "linear-gradient(135deg, var(--primary-800) 0%, var(--primary-900) 100%)", color: "#fff" }}>
                <div className="card-body" style={{ padding: "24px" }}>
                  <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <GraduationCap size={18} />
                    How to Manage?
                  </h4>
                  <ul style={{ paddingLeft: "18px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px", opacity: 0.9 }}>
                    <li>Multiple drafts can be generated sequentially to check different layouts.</li>
                    <li>Use the <strong>Preview</strong> button to check a schedule's layout before activating it.</li>
                    <li>Publishing a version immediately sets it as live for students and lecturers.</li>
                    <li>Unpublished drafts can be deleted to keep database tables clean.</li>
                  </ul>
                </div>
              </div>

            </div>

          </div>

        </main>
      </div>

      {/* Preview Modal Overlay */}
      {previewVersion && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            width: "90%",
            maxWidth: "1100px",
            maxHeight: "85%",
            backgroundColor: "#fff",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-xl)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "20px 24px",
              borderBottom: "1px solid var(--neutral-200)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--neutral-50)"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "var(--neutral-900)" }}>
                  Preview: {previewVersion.timetableName}
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "var(--neutral-500)" }}>
                  For Batch: {selectedBatchObj?.batchName || ""} (Semester {selectedBatchObj?.semester || ""})
                </p>
              </div>
              <button 
                onClick={handleClosePreview} 
                className="btn btn-secondary"
                style={{ 
                  padding: "6px", 
                  borderRadius: "50%", 
                  width: "36px", 
                  height: "36px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  cursor: "pointer" 
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              {previewLoading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "var(--neutral-500)" }}>
                  <RefreshCw className="animate-spin" style={{ margin: "0 auto 12px auto" }} />
                  Loading schedule grid...
                </div>
              ) : previewError ? (
                <div style={{ color: "#991b1b", padding: "20px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                  {previewError}
                </div>
              ) : previewEntries.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--neutral-500)", border: "1px dashed var(--neutral-300)", borderRadius: "8px" }}>
                  No session assignments found in this timetable version.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table" style={{ width: "100%", tableLayout: "fixed" }}>
                    <thead>
                      <tr style={{ background: "var(--neutral-100)" }}>
                        <th style={{ width: "120px", textAlign: "center" }}>Time Slot</th>
                        {visibleDays.map((day) => (
                          <th key={day} style={{ textAlign: "center" }}>{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {buildTimeSlots(previewEntries, timeSlots, selectedBatchObj).map((slot) => {
                        const lunchStart = selectedBatchObj?.lunchStartTime ? selectedBatchObj.lunchStartTime.substring(0, 5) : "12:30";
                        const lunchEnd = selectedBatchObj?.lunchEndTime ? selectedBatchObj.lunchEndTime.substring(0, 5) : "13:30";
                        const isLunchRow = slot.start < lunchEnd && slot.end > lunchStart;

                        if (isLunchRow) {
                          return (
                            <tr key={slot.label}>
                              <td style={{ textAlign: "center", fontWeight: "600", color: "var(--neutral-50)", background: "var(--neutral-50)" }}>
                                {slot.label}
                              </td>
                              <td colSpan={visibleDays.length} style={{ 
                                textAlign: "center", 
                                background: "#fffbeb", 
                                color: "#b45309", 
                                fontWeight: "700", 
                                letterSpacing: "1px",
                                textTransform: "uppercase",
                                fontSize: "12px",
                                padding: "12px"
                              }}>
                                Lunch Break
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={slot.label}>
                            <td style={{ 
                              textAlign: "center", 
                              fontWeight: "600", 
                              color: "var(--neutral-600)", 
                              background: "var(--neutral-50)", 
                              fontSize: "12px",
                              padding: "10px"
                            }}>
                              {slot.label}
                            </td>
                            {visibleDays.map((day) => {
                              const isCommon = day === "Wednesday" && slot.start < "16:30" && slot.end > "14:30";

                              if (isCommon) {
                                return (
                                  <td key={`${day}-${slot.label}`} style={{ background: "#eff6ff", padding: "6px" }}>
                                    <div style={{ 
                                      textAlign: "center", 
                                      color: "#1d4ed8", 
                                      fontWeight: "700", 
                                      fontSize: "11px",
                                      textTransform: "uppercase"
                                    }}>
                                      Common Hours
                                    </div>
                                  </td>
                                );
                              }

                              const key = `${day}|${slot.start}|${slot.end}`;
                              const cellEntries = previewEntryMap.get(key) || [];

                              const cellLabs = getLabSchedulesForCell(day, slot.start, slot.end);
                              if (cellLabs.length > 0) {
                                return (
                                  <td key={`${day}-${slot.label}`} style={{ background: "#faf5ff", padding: "6px" }}>
                                    <div style={{ 
                                      display: "flex", 
                                      flexDirection: "column", 
                                      alignItems: "center", 
                                      justifyContent: "center",
                                      color: "#7e22ce", 
                                      fontWeight: "700", 
                                      fontSize: "11px",
                                      gap: "4px"
                                    }}>
                                      {cellLabs.map((lab) => (
                                        <div key={lab.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                          <FlaskConical size={11} />
                                          <span>Lab Session {lab.department ? `(${lab.department.departmentCode})` : ""}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td key={`${day}-${slot.label}`} style={{ padding: "6px" }}>
                                  {cellEntries.map((entry) => (
                                    <div 
                                      key={entry.entryId} 
                                      style={{
                                        background: "var(--bg-primary)",
                                        borderLeft: "3px solid var(--primary-500)",
                                        padding: "6px 8px",
                                        borderRadius: "4px",
                                        textAlign: "left"
                                      }}
                                    >
                                      <div style={{ fontSize: "11px", fontWeight: "800", color: "var(--primary-700)" }}>{entry.moduleCode}</div>
                                      <div style={{ fontSize: "10px", fontWeight: "600", color: "var(--neutral-700)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "1px 0" }}>{entry.moduleName}</div>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "9px", color: "var(--neutral-500)", marginTop: "2px" }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                          <Building size={10} style={{ opacity: 0.8 }} />
                                          <span>{entry.hallName}</span>
                                        </span>
                                        <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                          <Users size={10} style={{ opacity: 0.8 }} />
                                          <span>{entry.lecturerName}</span>
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--neutral-200)",
              display: "flex",
              justifyContent: "flex-end",
              background: "var(--neutral-50)"
            }}>
              <button 
                onClick={handleClosePreview} 
                className="btn btn-secondary"
                style={{ padding: "10px 20px" }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
