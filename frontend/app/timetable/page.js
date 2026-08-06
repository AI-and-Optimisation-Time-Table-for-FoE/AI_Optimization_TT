"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { fetchBatches, fetchTimetable, fetchTimetableStatus, fetchDepartments, fetchTimeSlots, fetchLabSchedules, fetchLecturerTimetable, moveTimetableEntry, fetchTimetableVersions, publishTimetableVersion, unpublishTimetableVersion, fetchMasterLecturerStatus, publishMasterLecturerTimetable, unpublishMasterLecturerTimetable, fetchLecturers, deleteTimetableVersion } from "../lib/api";
import { Calendar, Inbox, FlaskConical, GraduationCap, Building, User, CheckCircle, Radio, EyeOff, Trash2, Download } from "lucide-react";
import "./timetable.css";

export default function TimetablePage() {
  return (
    <Suspense fallback={
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <main className="page-content">
            <div className="empty-state" style={{ marginTop: 80 }}>
              <div className="empty-state-text">Loading timetable…</div>
            </div>
          </main>
        </div>
      </div>
    }>
      <TimetableViewPage />
    </Suspense>
  );
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function buildTimeSlots(entries, dbTimeSlots, selectedBatch) {
  const slotMap = new Map();

  // 1. Add slots from database
  if (Array.isArray(dbTimeSlots) && dbTimeSlots.length > 0) {
    for (const slot of dbTimeSlots) {
      const start = slot.startTime.substring(0, 5);
      const end = slot.endTime.substring(0, 5);
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

  // 2. Add slots from entries (in case any custom timing exists)
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      const start = entry.startTime.substring(0, 5);
      const end = entry.endTime.substring(0, 5);
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

  // 3. Make sure lunch break is added as a slot
  if (selectedBatch) {
    const lunchStart = selectedBatch.lunchStartTime ? selectedBatch.lunchStartTime.substring(0, 5) : "12:30";
    const lunchEnd = selectedBatch.lunchEndTime ? selectedBatch.lunchEndTime.substring(0, 5) : "13:30";
    const key = `${lunchStart}|${lunchEnd}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, {
        start: lunchStart,
        end: lunchEnd,
        label: `${lunchStart} – ${lunchEnd}`,
      });
    }
  }

  // 4. Default slots if database is empty
  if (slotMap.size === 0) {
    const defaults = ["08:30|09:30", "09:30|10:30", "10:30|11:30", "11:30|12:30", "12:30|13:30", "13:30|14:30", "14:30|15:30", "15:30|16:30", "16:30|17:30", "17:30|18:30"];
    for (const d of defaults) {
      const [start, end] = d.split("|");
      slotMap.set(d, { start, end, label: `${start} – ${end}` });
    }
  }

  return Array.from(slotMap.values()).sort((a, b) => a.start.localeCompare(b.start));
}

function TimetableViewPage() {
  const searchParams = useSearchParams();
  const initialBatchId = searchParams.get("batchId");

  const initialDeptId = searchParams.get("departmentId");
  const [selectedDeptId, setSelectedDeptId] = useState(initialDeptId || "");
  const [departments, setDepartments] = useState([]);

  const [batches, setBatches] = useState([]);

  const handleDrop = async (e, day, slot) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.backgroundColor = '';
    
    if (user?.role !== "admin") return;

    const rawData = e.dataTransfer.getData("text/plain");
    if (!rawData) return;
    
    try {
      const data = JSON.parse(rawData);
      const entryId = data.entryId;
      const oldDay = data.oldDay;
      const oldStart = data.oldStart;
      
      if (!entryId || (oldDay === day && oldStart === slot.start)) return;
      
      setLoading(true);
      await moveTimetableEntry(entryId, day, slot.start, slot.end, null);
      setError("");
      
      // Refresh
      const isAdmin = user?.role === "admin";
      const selectedBatch = batches.find(b => String(b.batchId) === String(selectedBatchId));
      const deptIdToFetch = (selectedBatch?.semester >= 3 && selectedDeptId) ? Number(selectedDeptId) : null;
      const timetableIdParam = searchParams.get("timetableId");
      const entriesData = await fetchTimetable(Number(selectedBatchId), deptIdToFetch, isAdmin, timetableIdParam ? Number(timetableIdParam) : null);
      setEntries(entriesData);
    } catch (err) {
      console.error("Move error", err);
      alert(err.message || "Failed to move entry due to a conflict.");
    } finally {
      setLoading(false);
    }
  };

  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId || "");
  const [selectedTimetableId, setSelectedTimetableId] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [versions, setVersions] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("none");
  const [publishedAt, setPublishedAt] = useState("");
  const [dbTimeSlots, setDbTimeSlots] = useState([]);
  const [labSchedules, setLabSchedules] = useState([]);

  useEffect(() => {
    fetchTimeSlots()
      .then(setDbTimeSlots)
      .catch((err) => console.error("Error loading timeslots:", err));
  }, []);

  useEffect(() => {
    fetchLabSchedules()
      .then(setLabSchedules)
      .catch((err) => console.error("Error loading lab schedules:", err));
  }, []);

  useEffect(() => {
    if (initialDeptId) {
      setSelectedDeptId(initialDeptId);
    }
  }, [initialDeptId]);

  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch(err => console.error("Error loading departments:", err));
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const u = JSON.parse(userStr);
      setUser(u);
      if (u.role === "student") {
        setSelectedBatchId(String(u.batchId));
        setSelectedDeptId(u.departmentId ? String(u.departmentId) : "");
      }
    }
  }, []);

  useEffect(() => {
    fetchBatches()
      .then((data) => {
        setBatches(data);
        const userStr = localStorage.getItem("user");
        const u = userStr ? JSON.parse(userStr) : null;
        if (u && u.role === "student") {
          setSelectedBatchId(String(u.batchId));
          setSelectedDeptId(u.departmentId ? String(u.departmentId) : "");
        } else if (!initialBatchId && data.length > 0) {
          setSelectedBatchId(String(data[0].batchId));
        }
      })
      .catch(() => setError("Could not load batches from the database."));
  }, [initialBatchId]);

  const loadTimetable = useCallback(async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isLecturer = currentUser?.role === "lecturer";

    if (!isLecturer && !selectedBatchId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isLecturer) {
        let lecId = currentUser?.lecturerId;
        if (!lecId) {
          try {
            const allLecs = await fetchLecturers();
            const found = allLecs.find(l => (l.userAccount && l.userAccount.userId === currentUser?.userId) || (l.email && currentUser?.universityEmail && l.email.toLowerCase() === currentUser.universityEmail.toLowerCase()));
            if (found) lecId = found.lecturerId;
          } catch (e) {}
        }
        const [tData, statusData] = await Promise.all([
          lecId ? fetchLecturerTimetable(lecId) : Promise.resolve([]),
          fetchTimetableStatus("", "")
        ]);
        setEntries(Array.isArray(tData) ? tData : []);
        setStatus(tData && tData.length > 0 ? "active" : "none");
        setPublishedAt(statusData?.publishedAt || "");
      } else {
        const isAdmin = currentUser?.role === "admin";
        let deptIdToFetch = null;
        if (isAdmin) {
          deptIdToFetch = selectedDeptId ? Number(selectedDeptId) : null;
        } else if (currentUser?.role === "student") {
          deptIdToFetch = currentUser.departmentId ? Number(currentUser.departmentId) : null;
        }

        const initialParamId = selectedTimetableId || searchParams.get("timetableId");
        
        let fetchedVersions = [];
        if (isAdmin) {
          try {
            fetchedVersions = await fetchTimetableVersions(Number(selectedBatchId), deptIdToFetch);
            setVersions(fetchedVersions);
          } catch (e) {
            console.error("Failed to load versions", e);
          }
        }

        const [tData, statusData] = await Promise.all([
          fetchTimetable(Number(selectedBatchId), deptIdToFetch, isAdmin, initialParamId ? Number(initialParamId) : null),
          fetchTimetableStatus(Number(selectedBatchId), deptIdToFetch, isAdmin)
        ]);

        setEntries(Array.isArray(tData) ? tData : []);
        setStatus(statusData?.status || "none");
        setPublishedAt(statusData?.publishedAt || "");
        
        if (initialParamId) {
          setSelectedTimetableId(initialParamId);
        } else if (statusData?.timetableId) {
          setSelectedTimetableId(String(statusData.timetableId));
        } else if (fetchedVersions.length > 0) {
          setSelectedTimetableId(String(fetchedVersions[0].timetableId));
        } else {
          setSelectedTimetableId("");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Could not load timetable from the database. Make sure the backend is running on port 8080.");
      setEntries([]);
      setStatus("none");
    } finally {
      setLoading(false);
    }
  }, [selectedBatchId, selectedDeptId, searchParams, selectedTimetableId]);

  useEffect(() => {
    loadTimetable();
  }, [selectedBatchId, selectedDeptId, selectedTimetableId]);

  const [masterLecturerStatus, setMasterLecturerStatus] = useState({ isLecturerPublished: false, publishedAt: "" });

  useEffect(() => {
    fetchMasterLecturerStatus()
      .then(setMasterLecturerStatus)
      .catch((e) => console.warn(e));
  }, []);

  const handleApprove = async () => {
    const activeVer = versions.find(v => String(v.timetableId) === selectedTimetableId) || versions.find(v => v.status === "active") || versions[0];
    const targetIdToUse = selectedTimetableId || (activeVer ? String(activeVer.timetableId) : "");
    if (!targetIdToUse) {
      alert("No timetable version found to publish.");
      return;
    }
    try {
      setIsPublishing(true);
      await publishTimetableVersion(Number(targetIdToUse));
      alert("Timetable approved and published successfully!");
      
      const selectedBatch = batches.find(b => String(b.batchId) === String(selectedBatchId));
      const deptIdToFetch = (selectedBatch?.semester >= 3 && selectedDeptId) ? Number(selectedDeptId) : null;
      const fetchedVersions = await fetchTimetableVersions(Number(selectedBatchId), deptIdToFetch);
      setVersions(fetchedVersions);
      setSelectedTimetableId(String(targetIdToUse));
      
      setStatus("active");
      setPublishedAt(new Date().toISOString());
    } catch (err) {
      alert("Failed to publish timetable: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublishVersion = async () => {
    const activeVer = versions.find(v => String(v.timetableId) === selectedTimetableId) || versions.find(v => v.status === "active") || versions[0];
    const targetIdToUse = selectedTimetableId || (activeVer ? String(activeVer.timetableId) : "");
    if (!targetIdToUse) {
      alert("No timetable version found to unpublish.");
      return;
    }
    try {
      setIsPublishing(true);
      await unpublishTimetableVersion(Number(targetIdToUse));
      alert("Timetable version unpublished! It is now in draft mode.");
      
      const selectedBatch = batches.find(b => String(b.batchId) === String(selectedBatchId));
      const deptIdToFetch = (selectedBatch?.semester >= 3 && selectedDeptId) ? Number(selectedDeptId) : null;
      const fetchedVersions = await fetchTimetableVersions(Number(selectedBatchId), deptIdToFetch);
      setVersions(fetchedVersions);
      setSelectedTimetableId(String(targetIdToUse));
      
      setStatus("draft");
      setPublishedAt("");
    } catch (err) {
      alert("Failed to unpublish timetable: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteDraft = async () => {
    const selectedVer = versions.find(v => String(v.timetableId) === selectedTimetableId);
    if (!selectedVer) { alert("No version selected."); return; }
    if (selectedVer.status === "active") { alert("Cannot delete a published timetable. Unpublish it first."); return; }
    if (!confirm(`Delete this draft timetable (generated ${new Date(selectedVer.generatedAt).toLocaleString()})? This cannot be undone.`)) return;
    try {
      setIsPublishing(true);
      await deleteTimetableVersion(Number(selectedTimetableId));
      alert("Draft timetable deleted successfully.");
      const selectedBatch = batches.find(b => String(b.batchId) === String(selectedBatchId));
      const deptIdToFetch = (selectedBatch?.semester >= 3 && selectedDeptId) ? Number(selectedDeptId) : null;
      const fetchedVersions = await fetchTimetableVersions(Number(selectedBatchId), deptIdToFetch);
      setVersions(fetchedVersions);
      setSelectedTimetableId(fetchedVersions.length > 0 ? String(fetchedVersions[0].timetableId) : "");
      setEntries([]);
      setStatus("none");
    } catch (err) {
      alert("Failed to delete draft: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleMasterLecturer = async () => {
    try {
      if (masterLecturerStatus.isLecturerPublished) {
        if (confirm("Are you sure you want to unpublish the Lecturer Timetable? Lecturers will see a draft notification on their dashboard.")) {
          await unpublishMasterLecturerTimetable();
          setMasterLecturerStatus({ isLecturerPublished: false, publishedAt: "" });
          alert("Lecturer Timetable unpublished! Lecturer view is now in draft mode.");
        }
      } else {
        const res = await publishMasterLecturerTimetable();
        setMasterLecturerStatus({ isLecturerPublished: true, publishedAt: res.publishedAt || new Date().toISOString() });
        alert("Lecturer Timetable published successfully! All lecturers can now view their complete schedules.");
      }
    } catch (err) {
      alert("Error updating Lecturer Timetable status: " + err.message);
    }
  };

  useEffect(() => {
    // Only poll for student and lecturer dashboards to receive live updates
    const userStr = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    const currentUser = userStr ? JSON.parse(userStr) : null;
    if (currentUser && (currentUser.role === "student" || currentUser.role === "lecturer")) {
      const interval = setInterval(() => {
        loadTimetable();
      }, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [loadTimetable]);

  const selectedBatch = batches.find((b) => String(b.batchId) === String(selectedBatchId));
  const batchLabel = selectedBatch?.batchName || (selectedBatchId ? `Batch ${selectedBatchId}` : "No batch");

  const timeSlots = useMemo(() => buildTimeSlots(entries, dbTimeSlots, selectedBatch), [entries, dbTimeSlots, selectedBatch]);
  const visibleDays = useMemo(() => {
    if (entries.length === 0) return [];
    const usedDays = new Set(entries.map((entry) => entry.dayOfWeek));
    const defaultDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const combinedDays = Array.from(new Set([...defaultDays, ...usedDays]));
    return DAYS.filter((day) => combinedDays.includes(day));
  }, [entries]);

  const entryMap = useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      const start = entry.startTime ? entry.startTime.substring(0, 5) : "";
      const end = entry.endTime ? entry.endTime.substring(0, 5) : "";
      const key = `${entry.dayOfWeek}|${start}|${end}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(entry);
    }
    return map;
  }, [entries]);

  const getLabSchedulesForCell = (day, slotStart, slotEnd) => {
    return labSchedules.filter((lab) => {
      if (!lab.batch || String(lab.batch.batchId) !== String(selectedBatchId)) {
        return false;
      }
      if (lab.dayOfWeek !== day) {
        return false;
      }

      const isAdmin = user?.role === "admin";
      let deptFilterId = null;
      if (isAdmin) {
        deptFilterId = selectedDeptId ? Number(selectedDeptId) : null;
      } else if (user?.role === "student") {
        deptFilterId = user.departmentId ? Number(user.departmentId) : null;
      }

      if (deptFilterId) {
        if (lab.department && lab.department.departmentId !== deptFilterId) {
          return false;
        }
      }

      const normalizeTime = (t) => {
        if (!t) return "";
        return t.replace(".", ":").substring(0, 5);
      };

      const nLabStart = normalizeTime(lab.startTime);
      const nLabEnd = normalizeTime(lab.endTime);
      const nSlotStart = normalizeTime(slotStart);
      const nSlotEnd = normalizeTime(slotEnd);

      return nSlotStart < nLabEnd && nSlotEnd > nLabStart;
    });
  };

  return (
    <>
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              Home <span style={{ color: "var(--neutral-400)" }}>/</span> <span>Weekly Lecture Schedule</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          <div className="timetable-hero" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div>
              <h1 style={{ display: "flex", alignItems: "center", gap: "12px", margin: 0 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                  <Calendar size={24} style={{ color: "#ffffff" }} />
                  <span>
                    {user?.role === "student"
                      ? "Weekly Lecture Schedule"
                      : user?.role === "lecturer"
                      ? "My Teaching Schedule"
                      : "Batch Lecture Timetable"}
                  </span>
                </span>
                {(() => {
                  if (user?.role === "admin" && selectedTimetableId) {
                    const currentVersion = versions.find(v => String(v.timetableId) === selectedTimetableId);
                    const isPublished = currentVersion?.status === "active";
                    
                    return (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <span className={`badge ${isPublished ? 'badge-success' : 'badge-warning'}`} style={{
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          background: isPublished ? "var(--success-500, #22c55e)" : "var(--warning-500, #f59e0b)",
                          color: "#fff"
                        }}>
                          {isPublished ? "Published" : "Draft"}
                        </span>
                        {isPublished && publishedAt && (
                          <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", fontWeight: "500" }}>
                            (Last Updated: {new Date(publishedAt).toLocaleString()})
                          </span>
                        )}
                      </span>
                    );
                  }
                  
                  if (status === "active") {
                    return (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <span className="badge badge-success" style={{
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          background: "var(--success-500, #22c55e)",
                          color: "#fff"
                        }}>
                          Published
                        </span>
                        {publishedAt && (
                          <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", fontWeight: "500" }}>
                            (Last Updated: {new Date(publishedAt).toLocaleString()})
                          </span>
                        )}
                      </span>
                    );
                  }
                  return null;
                })()}
              </h1>
              {user?.role !== "student" && (
                <p style={{ margin: "4px 0 0 0", fontSize: "14px", opacity: 0.9 }}>
                  {user?.role === "lecturer"
                    ? "Showing your personalized teaching schedule across all modules."
                    : (entries.length > 0
                        ? `Showing published lecture schedule for ${selectedBatch ? selectedBatch.batchName : 'Batch'}.`
                        : "Generate a timetable from the Optimizer page to see database entries here.")}
                </p>
              )}
            </div>
            
          </div>

          {user?.role === "admin" && (
            <div className="card" style={{ 
              padding: "16px 20px", 
              marginBottom: "20px", 
              borderRadius: "12px",
              background: masterLecturerStatus.isLecturerPublished ? "linear-gradient(135deg, #064e3b 0%, #047857 100%)" : "linear-gradient(135deg, #78350f 0%, #d97706 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 14px rgba(0,0,0,0.12)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", padding: "10px", display: "flex" }}>
                  <Radio size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                    Lecturer Timetable Status: 
                    <span style={{ 
                      padding: "2px 10px", 
                      borderRadius: "12px", 
                      fontSize: "11px", 
                      fontWeight: "800",
                      textTransform: "uppercase",
                      background: masterLecturerStatus.isLecturerPublished ? "#10b981" : "#f59e0b",
                      color: "#ffffff"
                    }}>
                      {masterLecturerStatus.isLecturerPublished ? "PUBLISHED" : "DRAFT MODE"}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "2px" }}>
                    {masterLecturerStatus.isLecturerPublished
                      ? `Visible to all lecturers. (Published: ${masterLecturerStatus.publishedAt ? new Date(masterLecturerStatus.publishedAt).toLocaleString() : 'Active'})`
                      : "Hidden from lecturers so you can generate and publish individual batch timetables privately."}
                  </div>
                </div>
              </div>
              <button
                className="btn"
                onClick={handleToggleMasterLecturer}
                style={{
                  background: masterLecturerStatus.isLecturerPublished ? "rgba(255,255,255,0.2)" : "#ffffff",
                  color: masterLecturerStatus.isLecturerPublished ? "#ffffff" : "#78350f",
                  fontWeight: "700",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: "pointer"
                }}
              >
                {masterLecturerStatus.isLecturerPublished ? "Unpublish Lecturer Timetable" : "Publish Lecturer Timetable"}
              </button>
            </div>
          )}

          {user?.role === "admin" && (
            <div className="timetable-actions" style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
              <select
                className="form-select"
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setSelectedDeptId(""); 
                  setSelectedTimetableId("");
                }}
                style={{ minWidth: 220 }}
              >
                {batches.map((batch) => (
                  <option key={batch.batchId} value={batch.batchId}>
                    {batch.batchName} (Sem {batch.semester})
                  </option>
                ))}
              </select>

              {(() => {
                const selBatch = batches.find(b => String(b.batchId) === String(selectedBatchId));
                const showDeptSelect = user?.role === "admin" || (selBatch && selBatch.semester >= 3);
                if (showDeptSelect && departments.length > 0) {
                  return (
                    <select
                      className="form-select"
                      value={selectedDeptId}
                      onChange={(e) => {
                        setSelectedDeptId(e.target.value);
                        setSelectedTimetableId("");
                      }}
                      style={{ minWidth: 220 }}
                    >
                      <option value="">All Departments</option>
                      {departments.map(d => (
                        <option key={d.departmentId} value={d.departmentId}>
                          {d.departmentName} ({d.departmentCode})
                        </option>
                      ))}
                    </select>
                  );
                }
                return null;
              })()}

              {versions.length > 0 && (
                <select
                  className="form-select"
                  value={selectedTimetableId}
                  onChange={(e) => setSelectedTimetableId(e.target.value)}
                  style={{ minWidth: 250 }}
                >
                  <option value="" disabled>Select Version...</option>
                  {versions.map(v => (
                    <option key={v.timetableId} value={v.timetableId}>
                      {v.status === "active" ? "PUBLISHED: " : "DRAFT: "} 
                      {new Date(v.generatedAt).toLocaleString()}
                    </option>
                  ))}
                </select>
              )}

              {/* Publish / Unpublish / Delete Draft Action Buttons */}
              {(() => {
                const activeVer = versions.find(v => String(v.timetableId) === selectedTimetableId) || versions.find(v => v.status === "active");
                const targetIdToUse = selectedTimetableId || (activeVer ? String(activeVer.timetableId) : "");
                
                if (!targetIdToUse && versions.length === 0) return null;

                const selectedVer = versions.find(v => String(v.timetableId) === selectedTimetableId);
                const isCurrentActive = (selectedVer?.status === "active") || (status === "active");
                const isDraft = selectedVer && selectedVer.status !== "active";

                return (
                  <>
                    {/* Delete Draft button — only for draft versions */}
                    {isDraft && (
                      <button
                        onClick={handleDeleteDraft}
                        disabled={isPublishing}
                        style={{ display: "flex", alignItems: "center", gap: "6px", background: "#6b7280", color: "#ffffff", border: "none", padding: "8px 14px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
                        title="Delete this draft version permanently"
                      >
                        <Trash2 size={15} />
                        Delete Draft
                      </button>
                    )}
                    {/* Publish / Unpublish button */}
                    {isCurrentActive ? (
                      <button 
                        className="btn btn-secondary" 
                        onClick={handleUnpublishVersion}
                        disabled={isPublishing}
                        style={{ display: "flex", alignItems: "center", gap: "6px", background: "#dc2626", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
                      >
                        <EyeOff size={16} />
                        {isPublishing ? "Updating..." : "Unpublish Batch Timetable"}
                      </button>
                    ) : (
                      <button 
                        className="btn btn-primary" 
                        onClick={handleApprove}
                        disabled={isPublishing || !targetIdToUse}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
                      >
                        <CheckCircle size={16} />
                        {isPublishing ? "Publishing..." : "Publish Batch Timetable"}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {error && (
            <div className="card" style={{ marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2" }}>
              <div className="card-body" style={{ color: "#991b1b" }}>{error}</div>
            </div>
          )}

          {!loading && entries.length === 0 && !error && (
            <div className="card">
              <div className="timetable-empty">
                <div className="timetable-empty-icon" style={{ color: "var(--neutral-400)", marginBottom: "12px", display: "flex", justifyContent: "center" }}>
                  <Inbox size={48} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  {user?.role === "lecturer" ? "No scheduled classes found" : "No timetable in database yet"}
                </div>
                <div>
                  {user?.role === "lecturer"
                    ? "Your personalized teaching schedule will appear here once the administrator publishes the batch timetables."
                    : "No schedule has been generated for this academic batch."}
                </div>
              </div>
            </div>
          )}

          {entries.length > 0 && (
            <div className="timetable-grid-wrap" id="timetable-print-area">
              <table className="timetable-grid">
                <thead>
                  <tr>
                    <th className="time-col">Time</th>
                    {visibleDays.map((day) => (
                      <th key={day}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot) => {
                    const lunchStart = selectedBatch?.lunchStartTime ? selectedBatch.lunchStartTime.substring(0, 5) : "12:30";
                    const lunchEnd = selectedBatch?.lunchEndTime ? selectedBatch.lunchEndTime.substring(0, 5) : "13:30";
                    const isLunchRow = user?.role !== "lecturer" && slot.start < lunchEnd && slot.end > lunchStart;

                    if (isLunchRow) {
                      return (
                        <tr key={slot.label}>
                          <td className="time-col">{slot.label}</td>
                          <td colSpan={visibleDays.length} className="timetable-lunch-cell">
                            Lunch Break
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={slot.label}>
                        <td className="time-col">{slot.label}</td>
                        {visibleDays.map((day) => {
                          const isCommon = day === "Wednesday" && slot.start < "16:30" && slot.end > "14:30";

                          if (isCommon) {
                            return (
                              <td key={`${day}-${slot.label}`}>
                                <div className="timetable-common-hours-cell">
                                  <div>Common Hours</div>
                                </div>
                              </td>
                            );
                          }

                          const key = `${day}|${slot.start}|${slot.end}`;
                          const cellEntries = entryMap.get(key) || [];

                          const cellLabs = user?.role === "lecturer" ? [] : getLabSchedulesForCell(day, slot.start, slot.end);
                          if (cellLabs.length > 0) {
                            return (
                              <td key={`${day}-${slot.label}`}>
                                <div className="timetable-lab-session-cell">
                                  {cellLabs.map((lab) => {
                                    const deptSuffix = lab.department ? ` (${lab.department.departmentCode})` : "";
                                    return (
                                      <div key={lab.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                        <FlaskConical size={12} style={{ flexShrink: 0 }} />
                                        <span>Lab Session{deptSuffix}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td 
                              key={`${day}-${slot.label}`}
                              onDragOver={(e) => {
                                if (user?.role === "admin") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.dataTransfer.dropEffect = 'move';
                                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                                }
                              }}
                              onDragLeave={(e) => {
                                if (user?.role === "admin") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.currentTarget.style.backgroundColor = '';
                                }
                              }}
                              onDrop={(e) => handleDrop(e, day, slot)}
                            >
                              <div className="timetable-cell">
                                {cellEntries.map((entry) => (
                                  <div 
                                    key={entry.entryId} 
                                    className="timetable-session"
                                    draggable={user?.role === "admin"}
                                    style={{ cursor: user?.role === "admin" ? "grab" : "default" }}
                                    onDragStart={(e) => {
                                      if (user?.role === "admin") {
                                        e.stopPropagation();
                                        const dragData = { entryId: entry.entryId.toString(), oldDay: day, oldStart: slot.start };
                                        e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
                                        e.dataTransfer.effectAllowed = "move";
                                      }
                                    }}
                                  >
                                    <div className="timetable-session-code">{entry.moduleCode}</div>
                                    <div className="timetable-session-name">{entry.moduleName}</div>
                                    <div className="timetable-session-meta">
                                      {user?.role === "lecturer" ? (
                                        <>
                                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <GraduationCap size={12} style={{ color: "#0f766e", flexShrink: 0 }} />
                                            <span>{entry.batchName}</span>
                                          </span>
                                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <Building size={12} style={{ color: "#1d4ed8", flexShrink: 0 }} />
                                            <span>{entry.hallName}</span>
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <Building size={12} style={{ color: "#1d4ed8", flexShrink: 0 }} />
                                            <span>{entry.hallName}</span>
                                          </span>
                                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <User size={12} style={{ color: "#7c3aed", flexShrink: 0 }} />
                                            <span>{entry.lecturerName}</span>
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
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

          {/* Download PDF button — shown for all roles when timetable has entries */}
          {entries.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }} className="no-print">
              <button
                onClick={() => window.print()}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: "var(--primary-600)", color: "#ffffff",
                  border: "none", borderRadius: "10px",
                  padding: "10px 20px", fontSize: "14px",
                  fontWeight: "600", cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(22,163,74,0.25)"
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
        .sidebar, .topbar, .timetable-hero, .timetable-actions, .no-print,
        .card:not(#timetable-print-area), header, button {
          display: none !important;
        }
        body, .app-layout, .main-content, .page-content {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }
        #timetable-print-area {
          display: block !important;
          width: 100% !important;
          overflow: visible !important;
          page-break-inside: avoid;
        }
        .timetable-grid {
          width: 100% !important;
          font-size: 10px !important;
          border-collapse: collapse !important;
        }
        .timetable-grid th, .timetable-grid td {
          border: 1px solid #ccc !important;
          padding: 4px 6px !important;
        }
        .timetable-session {
          box-shadow: none !important;
        }
      }
    `}</style>
    </>
  );
}
