/*"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import {
  fetchBatches,
  fetchBatchModules,
  fetchHalls,
  fetchLecturers,
  generateTimetable,
} from "./lib/api";
import "./optimizer.css";

const SEMESTERS = [
  { id: "2", label: "1st Semester" },
  { id: "1", label: "2nd Semester" },
  { id: "3", label: "3rd Semester" },
  { id: "4", label: "4th Semester" },
  { id: "5", label: "5th Semester" },
  { id: "6", label: "6th Semester" },
  { id: "7", label: "7th Semester" },
  { id: "8", label: "8th Semester" },
];

export default function OptimizerPage() {
  const router = useRouter();

  const [selectedSemester, setSelectedSemester] = useState("1");
  const [modules, setModules] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [halls, setHalls] = useState([]);

  const [showAllLecturers, setShowAllLecturers] = useState(false);
  const [showAllHalls, setShowAllHalls] = useState(false);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    Promise.all([fetchBatchModules(selectedSemester), fetchLecturers(), fetchHalls()])
      .then(([modData, lecData, hallData]) => {
        setModules(modData);
        setLecturers(lecData);
        setHalls(hallData.filter((h) => h.isActive !== false));
      })
      .finally(() => setLoading(false));
  }, [selectedSemester]);

  const getDisplayedList = (list, showAll) => (showAll ? list : list.slice(0, 5));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateTimetable(selectedSemester);
      router.push(`/timetable?semester=${selectedSemester}`);
    } catch (err) {
      alert("Generation failed.");
    } finally { setGenerating(false); }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <main className="page-content">
          <div className="optimizer-hero">
            <h1>⚡ Timetable Optimizer</h1>
            <div className="batch-pill-row">
              <span className="batch-pill-label">Select Semester:</span>
              <div className="batch-pills">
                {SEMESTERS.map((s) => (
                  <button key={s.id} className={`batch-pill ${selectedSemester === s.id ? "active" : ""}`} onClick={() => setSelectedSemester(s.id)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="data-sections">
            {/* RESTORED: Batch Modules Table }/*
            <div className="card">
              <div className="card-header"><div className="card-title">📚 Batch Modules</div></div>
              <div className="card-body">
                <table className="data-table">
                  <thead><tr><th>Module Code</th><th>Module Name</th><th>Lec Hrs</th><th>Lab Hrs</th><th>Lecturer</th></tr></thead>
                // Add this inside your return statement, within the Batch Modules table
                          <div className="card">
  <div className="card-header"><div className="card-title">📚 Batch Modules</div></div>
  <div className="card-body" style={{ padding: "0" }}>
    <table className="data-table">
      <thead>
        <tr>
          <th>Module Code</th>
          <th>Module Name</th>
          <th>Lec Hrs</th>
          <th>Lab Hrs</th>
          <th>Lecturer</th>
        </tr>
      </thead>
      <tbody>
        {/* Use getDisplayedList here to limit rows to 5 }/*
        {getDisplayedList(modules, showAllModules).map((m) => (
          <tr key={m.batchModuleId}>
            <td>{m.moduleCode}</td>
            <td>{m.moduleName}</td>
            <td>{m.lectureHoursPerWeek}</td>
            <td>{m.labHoursPerWeek}</td>
            <td>{m.lecturerName}</td>
          </tr>
        ))}
      </tbody>
    </table>

    {/* Add the See More button logic }
    {modules.length > 5 && (
      <button 
        onClick={() => setShowAllModules(!showAllModules)} 
        style={{ width: "100%", padding: "10px", background: "none", border: "none", cursor: "pointer", color: "var(--primary-600)", borderTop: "1px solid var(--neutral-100)" }}
      >
        {showAllModules ? "▲ Show Less" : `▼ See More (${modules.length - 5} others)`}
      </button>
    )}
  </div>
</div> 
                </table>
              </div>
            </div>

            {/* Lecturers Card }
            <div className="card">
              <div className="card-header"><div className="card-title">👨‍🏫 Lecturers</div></div>
              <div className="card-body" style={{ padding: "0" }}>
                {getDisplayedList(lecturers, showAllLecturers).map((l) => (
                  <div key={l.lecturerId} style={{ padding: "12px 20px", borderBottom: "1px solid var(--neutral-100)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{l.name}</div>
                    <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{l.specialization || l.email || "—"}</div>
                  </div>
                ))}
                {lecturers.length > 5 && (
                  <button onClick={() => setShowAllLecturers(!showAllLecturers)} style={{ width: "100%", padding: "10px", background: "none", border: "none", cursor: "pointer", color: "var(--primary-600)" }}>
                    {showAllLecturers ? "▲ Show Less" : `▼ See More (${lecturers.length - 5} others)`}
                  </button>
                )}
              </div>
            </div>

            {/* Halls Card }
            <div className="card">
              <div className="card-header"><div className="card-title">🏛️ Halls</div></div>
              <div className="card-body" style={{ padding: "0" }}>
                {getDisplayedList(halls, showAllHalls).map((h) => (
                  <div key={h.hallId} style={{ padding: "12px 20px", borderBottom: "1px solid var(--neutral-100)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{h.hallName}</div>
                    <div style={{ fontSize: 12 }}>{h.capacity} seats</div>
                  </div>
                ))}
                {halls.length > 5 && (
                  <button onClick={() => setShowAllHalls(!showAllHalls)} style={{ width: "100%", padding: "10px", background: "none", border: "none", cursor: "pointer", color: "var(--primary-600)" }}>
                    {showAllHalls ? "▲ Show Less" : `▼ See More (${halls.length - 5} others)`}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
            <button onClick={handleGenerate} disabled={generating} style={{
                background: generating ? "linear-gradient(135deg, var(--primary-400), var(--primary-600))" : "linear-gradient(135deg, var(--primary-500), var(--primary-800))",
                color: "#fff", padding: "16px 64px", fontSize: 17, fontWeight: 700, border: "none", borderRadius: "8px", cursor: "pointer", boxShadow: "0 6px 24px rgba(0,150,136,0.35)"
            }}>
              {generating ? "Optimizing Timetable…" : "Generate Timetable"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}*/

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import {
  fetchBatches,
  fetchBatchModules,
  fetchHalls,
  fetchLecturers,
  generateTimetable,
} from "./lib/api";
import "./optimizer.css";

const SEMESTERS = [
  { id: "2", label: "1st Semester" }, // Fixed IDs to match your DB logic
  { id: "1", label: "2nd Semester" },
  { id: "3", label: "3rd Semester" },
  { id: "4", label: "4th Semester" },
  { id: "5", label: "5th Semester" },
  { id: "6", label: "6th Semester" },
  { id: "7", label: "7th Semester" },
  { id: "8", label: "8th Semester" },
];

export default function OptimizerPage() {
  const router = useRouter();

  const [selectedSemester, setSelectedSemester] = useState("1");
  const [modules, setModules] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [halls, setHalls] = useState([]);

  // State for "See More" functionality
  const [showAllLecturers, setShowAllLecturers] = useState(false);
  const [showAllHalls, setShowAllHalls] = useState(false);
  const [showAllModules, setShowAllModules] = useState(false); // FIXED: Added this state

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBatchModules(selectedSemester), fetchLecturers(), fetchHalls()])
      .then(([modData, lecData, hallData]) => {
        setModules(modData);
        setLecturers(lecData);
        setHalls(hallData.filter((h) => h.isActive !== false));
      })
      .finally(() => setLoading(false));
  }, [selectedSemester]);

  const getDisplayedList = (list, showAll) => (showAll ? list : list.slice(0, 5));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateTimetable(selectedSemester);
      router.push(`/timetable?semester=${selectedSemester}`);
    } catch (err) {
      alert("Generation failed.");
    } finally { setGenerating(false); }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <main className="page-content">
          <div className="optimizer-hero">
            <h1>⚡ Timetable Optimizer</h1>
            <div className="batch-pill-row">
              <span className="batch-pill-label">Select Semester:</span>
              <div className="batch-pills">
                {SEMESTERS.map((s) => (
                  <button key={s.id} className={`batch-pill ${selectedSemester === s.id ? "active" : ""}`} onClick={() => setSelectedSemester(s.id)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="data-sections">
            {/* Batch Modules Table with "See More" logic */}
            <div className="card">
              <div className="card-header"><div className="card-title">📚 Batch Modules</div></div>
              <div className="card-body" style={{ padding: "0" }}>
                <table className="data-table">
                  <thead><tr><th>Module Code</th><th>Module Name</th><th>Lec Hrs</th><th>Lab Hrs</th><th>Lecturer</th></tr></thead>
                  <tbody>
                    {getDisplayedList(modules, showAllModules).map((m) => (
                      <tr key={m.batchModuleId}>
                        <td>{m.moduleCode}</td><td>{m.moduleName}</td>
                        <td>{m.lectureHoursPerWeek}</td><td>{m.labHoursPerWeek}</td><td>{m.lecturerName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {modules.length > 5 && (
                  <button onClick={() => setShowAllModules(!showAllModules)} style={{ width: "100%", padding: "10px", background: "none", border: "none", cursor: "pointer", color: "var(--primary-600)", borderTop: "1px solid var(--neutral-100)" }}>
                    {showAllModules ? "▲ Show Less" : `▼ See More (${modules.length - 5} others)`}
                  </button>
                )}
              </div>
            </div>

            {/* Lecturers Card */}
            <div className="card">
              <div className="card-header"><div className="card-title">👨‍🏫 Lecturers</div></div>
              <div className="card-body" style={{ padding: "0" }}>
                {getDisplayedList(lecturers, showAllLecturers).map((l) => (
                  <div key={l.lecturerId} style={{ padding: "12px 20px", borderBottom: "1px solid var(--neutral-100)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{l.name}</div>
                    <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{l.specialization || l.email || "—"}</div>
                  </div>
                ))}
                {lecturers.length > 5 && (
                  <button onClick={() => setShowAllLecturers(!showAllLecturers)} style={{ width: "100%", padding: "10px", background: "none", border: "none", cursor: "pointer", color: "var(--primary-600)" }}>
                    {showAllLecturers ? "▲ Show Less" : `▼ See More (${lecturers.length - 5} others)`}
                  </button>
                )}
              </div>
            </div>

            {/* Halls Card */}
            <div className="card">
              <div className="card-header"><div className="card-title">🏛️ Halls</div></div>
              <div className="card-body" style={{ padding: "0" }}>
                {getDisplayedList(halls, showAllHalls).map((h) => (
                  <div key={h.hallId} style={{ padding: "12px 20px", borderBottom: "1px solid var(--neutral-100)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{h.hallName}</div>
                    <div style={{ fontSize: 12 }}>{h.capacity} seats</div>
                  </div>
                ))}
                {halls.length > 5 && (
                  <button onClick={() => setShowAllHalls(!showAllHalls)} style={{ width: "100%", padding: "10px", background: "none", border: "none", cursor: "pointer", color: "var(--primary-600)" }}>
                    {showAllHalls ? "▲ Show Less" : `▼ See More (${halls.length - 5} others)`}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
            <button onClick={handleGenerate} disabled={generating} style={{
                background: generating ? "var(--primary-400)" : "linear-gradient(135deg, var(--primary-500), var(--primary-800))",
                color: "#fff", padding: "16px 64px", fontSize: 17, fontWeight: 700, border: "none", borderRadius: "8px", cursor: "pointer"
            }}>
              {generating ? "Optimizing Timetable…" : "Generate Timetable"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}