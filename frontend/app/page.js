"use client";

import { useState } from "react";
import Sidebar from "./components/Sidebar";
import "./optimizer.css";

// ── initial demo data ──────────────────────────────────────────────────────
const BATCHES = [
  { id: "23", label: "23rd Intake", year: "23",  dept: "rd Intake" },
  { id: "24", label: "24th Intake", year: "24",  dept: "th Intake" },
  { id: "25", label: "25th Intake", year: "25",  dept: "th Intake" },
  { id: "26", label: "26th Intake", year: "26",  dept: "th Intake" },
  { id: "27", label: "27th Intake", year: "27",  dept: "th Intake" },
];

const MODULE_OPTIONS = ["CS101 - Intro to CS", "CS201 - Data Structures", "CS301 - Algorithms",
  "CS401 - AI & ML", "IT101 - Networking", "IT201 - Database Systems", "MATH101 - Calculus"];
const HALL_OPTIONS = ["Main Auditorium", "Hall A", "Hall B", "Hall C", "Lab 1", "Lab 2"];

// Per-batch module data
const initialBatchModules = {
  "23": [
    { id: 1, code: "CS401", name: "AI & ML",          hours: 4, lectures: 2 },
    { id: 2, code: "CS301", name: "Algorithms",        hours: 3, lectures: 3 },
    { id: 3, code: "MATH101", name: "Calculus",        hours: 2, lectures: 2 },
  ],
  "24": [
    { id: 4, code: "CS301", name: "Algorithms",        hours: 3, lectures: 3 },
    { id: 5, code: "CS201", name: "Data Structures",   hours: 4, lectures: 3 },
  ],
  "25": [
    { id: 6, code: "CS201", name: "Data Structures",   hours: 4, lectures: 3 },
    { id: 7, code: "CS101", name: "Intro to CS",       hours: 3, lectures: 2 },
    { id: 8, code: "MATH101", name: "Calculus",        hours: 2, lectures: 2 },
  ],
  "26": [
    { id: 9,  code: "IT101", name: "Networking",       hours: 3, lectures: 2 },
    { id: 10, code: "IT201", name: "Database Systems", hours: 4, lectures: 3 },
  ],
  "27": [
    { id: 11, code: "CS101", name: "Intro to CS",      hours: 3, lectures: 2 },
    { id: 12, code: "MATH101", name: "Calculus",       hours: 2, lectures: 2 },
  ],
};

const initialLecturers = [
  { id: 1, name: "Dr. Perera",  modules: ["CS101 - Intro to CS", "CS301 - Algorithms"] },
  { id: 2, name: "Prof. Silva", modules: ["CS201 - Data Structures"] },
];

const initialHalls = [
  { id: 1, hall: "Hall A",  capacity: 60,  start: "08:00", end: "17:00" },
  { id: 2, hall: "Lab 1",   capacity: 30,  start: "08:00", end: "16:00" },
];

// ── helpers ────────────────────────────────────────────────────────────────
let nextId = 100;
const uid = () => ++nextId;

// ══════════════════════════════════════════════════════════════════════════
export default function OptimizerPage() {
  // ── state ────────────────────────────────────────────────────────────────
  const [selectedBatch, setSelectedBatch]               = useState(BATCHES[0].id);
  const [generating, setGenerating]                     = useState(false);
  const [generateDone, setGenerateDone]                 = useState(false);

  // per-batch module data
  const [batchModules, setBatchModules]                 = useState(initialBatchModules);
  const [newMod, setNewMod]                             = useState({ code: "", name: "", hours: "", lectures: "" });

  // current batch's module list
  const modules = batchModules[selectedBatch] || [];

  // lecturer modal
  const [lecturers, setLecturers]                       = useState(initialLecturers);
  const [showLecturerModal, setShowLecturerModal]       = useState(false);
  const [lecturerForm, setLecturerForm]                 = useState({ name: "", modules: [] });
  const [selectedModule, setSelectedModule]             = useState("");

  // hall modal
  const [halls, setHalls]                               = useState(initialHalls);
  const [showHallModal, setShowHallModal]               = useState(false);
  const [hallForm, setHallForm]                         = useState({ hall: "", capacity: "", start: "08:00", end: "17:00" });

  // ── handlers – batch select ─────────────────────────────────────────────
  const handleBatchSelect = (batchId) => {
    setSelectedBatch(batchId);
    setGenerateDone(false);
  };

  // ── handlers – modules ──────────────────────────────────────────────────
  const addModule = () => {
    if (!newMod.code || !newMod.name) return;
    setBatchModules(prev => ({
      ...prev,
      [selectedBatch]: [...(prev[selectedBatch] || []), { id: uid(), ...newMod }],
    }));
    setNewMod({ code: "", name: "", hours: "", lectures: "" });
  };
  const deleteModule = (id) => setBatchModules(prev => ({
    ...prev,
    [selectedBatch]: (prev[selectedBatch] || []).filter(m => m.id !== id),
  }));

  // ── handlers – lecturers ────────────────────────────────────────────────
  const addModuleToLecturer = () => {
    if (!selectedModule || lecturerForm.modules.includes(selectedModule)) return;
    setLecturerForm(f => ({ ...f, modules: [...f.modules, selectedModule] }));
    setSelectedModule("");
  };
  const removeModuleFromLecturer = (mod) =>
    setLecturerForm(f => ({ ...f, modules: f.modules.filter(m => m !== mod) }));

  const saveLecturer = () => {
    if (!lecturerForm.name) return;
    setLecturers(prev => [...prev, { id: uid(), ...lecturerForm }]);
    setLecturerForm({ name: "", modules: [] });
    setShowLecturerModal(false);
  };
  const deleteLecturer = (id) => setLecturers(prev => prev.filter(l => l.id !== id));

  // ── handlers – halls ────────────────────────────────────────────────────
  const saveHall = () => {
    if (!hallForm.hall || !hallForm.capacity) return;
    setHalls(prev => [...prev, { id: uid(), ...hallForm }]);
    setHallForm({ hall: "", capacity: "", start: "08:00", end: "17:00" });
    setShowHallModal(false);
  };
  const deleteHall = (id) => setHalls(prev => prev.filter(h => h.id !== id));

  // ── handlers – generate ─────────────────────────────────────────────────
  const handleGenerate = () => {
    setGenerating(true);
    setGenerateDone(false);
    setTimeout(() => {
      setGenerating(false);
      setGenerateDone(true);
    }, 2500);
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        {/* ── Top Bar ── */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              Home <span style={{ color: "var(--neutral-400)" }}>/</span> <span>Optimizer</span>
            </div>
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn" title="Notifications">🔔</button>
            <button className="topbar-icon-btn" title="Settings">⚙️</button>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary-400), var(--primary-700))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer"
            }}>A</div>
          </div>
        </header>

        <main className="page-content">
          {/* ── Hero / Optimizer Banner ── */}
          <div className="optimizer-hero">
            <div className="optimizer-hero-content">
              <div className="optimizer-hero-text">
                <h1>⚡ Timetable Optimizer</h1>
                <p>
                  Select a batch, configure constraints, then generate a conflict-free timetable instantly.
                </p>
              </div>
            </div>

            {/* ── Batch Pill Selector ── */}
            <div className="batch-pill-row">
              <span className="batch-pill-label">Select Batch:</span>
              <div className="batch-pills">
                {BATCHES.map(b => (
                  <button
                    key={b.id}
                    id={`batch-pill-${b.id}`}
                    className={`batch-pill ${selectedBatch === b.id ? "active" : ""}`}
                    onClick={() => handleBatchSelect(b.id)}
                  >
                    <span className="batch-pill-year">{b.year}</span>
                    <span className="batch-pill-dept">{b.dept}</span>
                    {selectedBatch === b.id && <span className="batch-pill-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Data Sections ── */}

          <div className="data-sections">
            {/* ── Batch Modules Table ── */}
            <div className="card batch-card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-title-icon">📚</div>
                  Module Schedule
                </div>
                <span className="badge badge-primary" style={{ fontSize: 13, padding: "5px 14px" }}>
                  {BATCHES.find(b => b.id === selectedBatch)?.label}
                </span>
              </div>
              <div className="card-body" style={{ padding: "0 0 16px" }}>
                <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Module Code</th>
                        <th>Module Name</th>
                        <th>Hrs / Week</th>
                        <th>Lectures</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            <div className="empty-state">
                              <div className="empty-state-icon">📭</div>
                              <div className="empty-state-text">No modules added yet</div>
                            </div>
                          </td>
                        </tr>
                      ) : modules.map(m => (
                        <tr key={m.id}>
                          <td><span className="badge badge-primary">{m.code}</span></td>
                          <td>{m.name}</td>
                          <td style={{ textAlign: "center" }}>{m.hours}</td>
                          <td style={{ textAlign: "center" }}>{m.lectures}</td>
                          <td>
                            <button className="btn-delete" onClick={() => deleteModule(m.id)} title="Remove">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Row */}
                <div className="add-row-form" style={{ padding: "0 16px" }}>
                  <div className="form-group" style={{ flex: "0 0 90px" }}>
                    <input
                      id="mod-code"
                      className="form-input"
                      placeholder="Code"
                      value={newMod.code}
                      onChange={e => setNewMod(p => ({ ...p, code: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <input
                      id="mod-name"
                      className="form-input"
                      placeholder="Module Name"
                      value={newMod.name}
                      onChange={e => setNewMod(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ flex: "0 0 70px" }}>
                    <input
                      id="mod-hours"
                      className="form-input"
                      placeholder="Hrs"
                      type="number"
                      min="1"
                      value={newMod.hours}
                      onChange={e => setNewMod(p => ({ ...p, hours: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ flex: "0 0 70px" }}>
                    <input
                      id="mod-lectures"
                      className="form-input"
                      placeholder="Lec"
                      type="number"
                      min="1"
                      value={newMod.lectures}
                      onChange={e => setNewMod(p => ({ ...p, lectures: e.target.value }))}
                    />
                  </div>
                  <button
                    id="add-module-btn"
                    className="btn btn-primary btn-sm"
                    onClick={addModule}
                    style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>

            {/* ── Lecturer Card ── */}
            <div className="card lecturer-card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-title-icon">👨‍🏫</div>
                  Lecturers
                </div>
                <button
                  id="add-lecturer-btn"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowLecturerModal(true)}
                >
                  + Add
                </button>
              </div>
              <div className="card-body" style={{ padding: "0 0 8px" }}>
                {lecturers.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">👤</div>
                    <div className="empty-state-text">No lecturers added yet</div>
                  </div>
                ) : (
                  <div style={{ padding: "0 0 8px" }}>
                    {lecturers.map(l => (
                      <div key={l.id} style={{
                        padding: "12px 20px",
                        borderBottom: "1px solid var(--neutral-100)",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--neutral-800)", marginBottom: 6 }}>
                            {l.name}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {l.modules.map(mod => (
                              <span key={mod} className="badge badge-primary" style={{ fontSize: 11 }}>
                                {mod.split(" - ")[0]}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button className="btn-delete" onClick={() => deleteLecturer(l.id)} title="Remove">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Hall Card ── */}
            <div className="card hall-card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-title-icon">🏛️</div>
                  Halls
                </div>
                <button
                  id="add-hall-btn"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowHallModal(true)}
                >
                  + Add
                </button>
              </div>
              <div className="card-body" style={{ padding: "0 0 8px" }}>
                {halls.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🏛️</div>
                    <div className="empty-state-text">No halls configured</div>
                  </div>
                ) : (
                  halls.map(h => (
                    <div key={h.id} style={{
                      padding: "12px 20px",
                      borderBottom: "1px solid var(--neutral-100)",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--neutral-800)", marginBottom: 4 }}>
                          {h.hall}
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <span className="badge badge-neutral">
                            👥 {h.capacity} seats
                          </span>
                          <span className="badge badge-success">
                            🕐 {h.start} – {h.end}
                          </span>
                        </div>
                      </div>
                      <button className="btn-delete" onClick={() => deleteHall(h.id)} title="Remove">✕</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Bottom Generate Button ── */}
          <div style={{
            marginTop: 32,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            paddingBottom: 16,
          }}>
            <button
              id="generate-bottom-btn"
              onClick={handleGenerate}
              disabled={generating}
              style={{
                background: generating
                  ? "linear-gradient(135deg, var(--primary-400), var(--primary-600))"
                  : generateDone
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "linear-gradient(135deg, var(--primary-500), var(--primary-800))",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "16px 64px",
                fontSize: 17,
                fontWeight: 700,
                fontFamily: "var(--font-family)",
                cursor: generating ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 6px 24px rgba(0,150,136,0.35)",
                transition: "all var(--transition-base)",
                letterSpacing: "0.01em",
                opacity: generating ? 0.85 : 1,
              }}
              onMouseEnter={e => { if (!generating) e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(0,150,136,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,150,136,0.35)"; }}
            >
              {generating ? (
                <><Spinner /> Optimizing Timetable…</>
              ) : generateDone ? (
                <><span style={{ fontSize: 20 }}>✅</span> Regenerate Timetable</>
              ) : (
                <><span style={{ fontSize: 20 }}>⚡</span> Generate Timetable</>
              )}
            </button>

            {generateDone && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: "var(--radius-full)",
                background: "#ecfdf5",
                border: "1px solid #6ee7b7",
                color: "#065f46",
                fontSize: 14,
                fontWeight: 500,
                animation: "slideUp 300ms ease",
              }}>
                <span>✓</span>
                Timetable for <strong>{BATCHES.find(b => b.id === selectedBatch)?.label}</strong> generated successfully!
              </div>
            )}
          </div>
        </main>

      </div>

      {/* ══════════ LECTURER MODAL ══════════ */}
      {showLecturerModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLecturerModal(false)}>
          <div className="modal" id="lecturer-modal">
            <div className="modal-header">
              <div className="modal-title">👨‍🏫 Add Lecturer</div>
              <button className="modal-close" onClick={() => setShowLecturerModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" htmlFor="lecturer-name">
                  Name <span className="required">*</span>
                </label>
                <input
                  id="lecturer-name"
                  className="form-input"
                  placeholder="e.g. Dr. Fernando"
                  value={lecturerForm.name}
                  onChange={e => setLecturerForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Modules</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    id="lecturer-module-select"
                    className="form-select"
                    value={selectedModule}
                    onChange={e => setSelectedModule(e.target.value)}
                  >
                    <option value="">— Select module —</option>
                    {MODULE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <button
                    id="add-module-to-lecturer"
                    className="btn btn-primary btn-sm"
                    onClick={addModuleToLecturer}
                    style={{ flexShrink: 0 }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {lecturerForm.modules.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {lecturerForm.modules.map(mod => (
                    <span key={mod} className="chip">
                      {mod.split(" - ")[0]}
                      <button className="chip-remove" onClick={() => removeModuleFromLecturer(mod)}>✕</button>
                    </span>
                  ))}
                </div>
              )}

              {lecturerForm.modules.length === 0 && (
                <div style={{
                  padding: "14px", borderRadius: "var(--radius-sm)",
                  background: "var(--neutral-50)", border: "1px dashed var(--neutral-300)",
                  textAlign: "center", fontSize: 13, color: "var(--neutral-400)"
                }}>
                  No modules assigned yet
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLecturerModal(false)}>Cancel</button>
              <button id="save-lecturer-btn" className="btn btn-primary" onClick={saveLecturer}>
                Save Lecturer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ HALL MODAL ══════════ */}
      {showHallModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowHallModal(false)}>
          <div className="modal" id="hall-modal">
            <div className="modal-header">
              <div className="modal-title">🏛️ Add Hall</div>
              <button className="modal-close" onClick={() => setShowHallModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="hall-select">
                  Hall <span className="required">*</span>
                </label>
                <select
                  id="hall-select"
                  className="form-select"
                  value={hallForm.hall}
                  onChange={e => setHallForm(f => ({ ...f, hall: e.target.value }))}
                >
                  <option value="">— Select hall —</option>
                  {HALL_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="hall-capacity">
                  Capacity <span className="required">*</span>
                </label>
                <input
                  id="hall-capacity"
                  className="form-input"
                  placeholder="e.g. 60"
                  type="number"
                  min="1"
                  value={hallForm.capacity}
                  onChange={e => setHallForm(f => ({ ...f, capacity: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Available Times</label>
                <div className="hall-card" style={{ margin: 0 }}>
                  <div className="time-range">
                    <input
                      id="hall-start"
                      className="form-input"
                      type="time"
                      value={hallForm.start}
                      onChange={e => setHallForm(f => ({ ...f, start: e.target.value }))}
                    />
                    <span className="time-separator">→</span>
                    <input
                      id="hall-end"
                      className="form-input"
                      type="time"
                      value={hallForm.end}
                      onChange={e => setHallForm(f => ({ ...f, end: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowHallModal(false)}>Cancel</button>
              <button id="save-hall-btn" className="btn btn-primary" onClick={saveHall}>
                Save Hall
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Spinner helper ─────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg
      width="16" height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
