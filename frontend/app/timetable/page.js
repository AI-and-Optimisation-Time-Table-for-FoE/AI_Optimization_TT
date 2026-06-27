"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { fetchBatches, fetchTimetable } from "../lib/api";
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

function buildTimeSlots(entries) {
  const slotMap = new Map();

  for (const entry of entries) {
    const key = `${entry.startTime}|${entry.endTime}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, {
        start: entry.startTime,
        end: entry.endTime,
        label: `${entry.startTime} – ${entry.endTime}`,
      });
    }
  }

  return Array.from(slotMap.values()).sort((a, b) => a.start.localeCompare(b.start));
}

function TimetableViewPage() {
  const searchParams = useSearchParams();
  const initialBatchId = searchParams.get("batchId");

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId || "");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBatches()
      .then((data) => {
        setBatches(data);
        if (!initialBatchId && data.length > 0) {
          setSelectedBatchId(String(data[0].batchId));
        }
      })
      .catch(() => setError("Could not load batches from the database."));
  }, [initialBatchId]);

  const loadTimetable = useCallback(async () => {
    if (!selectedBatchId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchTimetable(Number(selectedBatchId));
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Could not load timetable from the database. Make sure the backend is running on port 8080.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBatchId]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const timeSlots = useMemo(() => buildTimeSlots(entries), [entries]);
  const visibleDays = useMemo(() => {
    const usedDays = new Set(entries.map((entry) => entry.dayOfWeek));
    return DAYS.filter((day) => usedDays.has(day));
  }, [entries]);

  const entryMap = useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      const key = `${entry.dayOfWeek}|${entry.startTime}|${entry.endTime}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(entry);
    }
    return map;
  }, [entries]);

  const selectedBatch = batches.find((b) => String(b.batchId) === String(selectedBatchId));
  const batchLabel = selectedBatch?.batchName || (selectedBatchId ? `Batch ${selectedBatchId}` : "No batch");

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              Home <span style={{ color: "var(--neutral-400)" }}>/</span> <span>Timetable View</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          <div className="timetable-hero">
            <h1>📅 Timetable View</h1>
            <p>
              {entries.length > 0
                ? `Showing database schedule for ${batchLabel}.`
                : "Generate a timetable from the Optimizer page to see database entries here."}
            </p>
          </div>

          <div className="timetable-actions">
            <select
              className="form-select"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              style={{ minWidth: 220 }}
            >
              {batches.map((batch) => (
                <option key={batch.batchId} value={batch.batchId}>
                  {batch.batchName}
                </option>
              ))}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={loadTimetable} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <Link href="/" className="btn btn-primary btn-sm">
              Go to Optimizer
            </Link>
          </div>

          {error && (
            <div className="card" style={{ marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2" }}>
              <div className="card-body" style={{ color: "#991b1b" }}>{error}</div>
            </div>
          )}

          {!loading && entries.length === 0 && !error && (
            <div className="card">
              <div className="timetable-empty">
                <div className="timetable-empty-icon">📭</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No timetable in database yet</div>
                <div style={{ marginBottom: 16 }}>
                  Use the Optimizer page and click <strong>Generate Timetable</strong> for this batch.
                </div>
                <Link href="/" className="btn btn-primary btn-sm">Open Optimizer</Link>
              </div>
            </div>
          )}

          {entries.length > 0 && (
            <div className="timetable-grid-wrap">
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
                  {timeSlots.map((slot) => (
                    <tr key={slot.label}>
                      <td className="time-col">{slot.label}</td>
                      {visibleDays.map((day) => {
                        const key = `${day}|${slot.start}|${slot.end}`;
                        const cellEntries = entryMap.get(key) || [];

                        return (
                          <td key={`${day}-${slot.label}`}>
                            <div className="timetable-cell">
                              {cellEntries.map((entry) => (
                                <div key={entry.entryId} className="timetable-session">
                                  <div className="timetable-session-code">{entry.moduleCode}</div>
                                  <div className="timetable-session-name">{entry.moduleName}</div>
                                  <div className="timetable-session-meta">
                                    <span>🏛️ {entry.hallName}</span>
                                    <span>👨‍🏫 {entry.lecturerName}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
