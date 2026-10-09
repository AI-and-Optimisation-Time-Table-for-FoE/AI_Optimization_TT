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
  deleteExamHallUnavailability,
  fetchStudentEnrollments,
  syncMISStudentEnrollments,
  clearBatchEnrollments
} from "../../lib/api";
import { Calendar, CheckCircle, EyeOff, Plus, Trash2, AlertTriangle, Save, Zap, ChevronDown, ChevronUp, Building2, Tag, Download, UploadCloud, Users, RefreshCw, FileSpreadsheet } from "lucide-react";

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

const FACULTY_REPEATER_REGISTRY = {
  // Semester 2 (27th Batch)
  "IS2401": { count: 2 },
  "IS1003": { count: 1 },
  "CE2302": { count: 3 },
  "EE2201": { count: 1 },

  // Semester 4 (25th Batch)
  "IS4307": { count: 119 },
  "IS4227": { count: 119 },
  "IS4304": { count: 11 },
  "IS4305": { count: 4 },
  "EE4351": { count: 9 },
  "EE4304": { count: 4 },
  "EE4350": { count: 2 },
  "CE4302": { count: 9 },
  "CE4305": { count: 6 },
  "CE4301": { count: 4 },
  "CE4304": { count: 3 },
  "CE4204": { count: 3 },
  "CE4303": { count: 2 },
  "CE4251": { count: 2 },
  "ME4210": { count: 4 },
  "ME4301": { count: 2 },
  "MN4304": { count: 1 },
  "MN4205": { count: 3 },

  // Semester 6 (24th Batch)
  "CE6305": { count: 29 },
  "CE6304": { count: 27 },
  "CE6301": { count: 16 },
  "CE6302": { count: 12 },
  "CE6303": { count: 18 },
  "CE6252": { count: 2 },
  "CE6253": { count: 2 },
  "EE6301": { count: 2 },
  "EE6304": { count: 1 },
  "EE6303": { count: 1 },
  "EE6302": { count: 1 },
  "ME6303": { count: 3 },
  "ME6302": { count: 3 },
  "ME6206": { count: 3 },
  "ME6304": { count: 1 },
  "ME6214": { count: 2 },
  "ME6213": { count: 1 },
  "IS6303": { count: 1 },
  "IS6201": { count: 1 },
  "MN4210": { count: 1 },

  // Semester 8 (23rd Batch)
  "EE8217": { count: 2 }
};

function getModuleRepeaterDetails(moduleCode, rows = [], enrollmentsList = []) {
  const rawCode = (moduleCode || "").toUpperCase().trim();
  const cleanCode = rawCode.replace(/\s+/g, "");

  // 1. Check positive repeater counts already saved on entry rows
  const rowRepSum = (rows || []).reduce((sum, r) => sum + (Number(r.repeaterCount) || 0), 0);
  if (rowRepSum > 0) {
    const firstInfo = rows.find(r => r.repeaterInfo)?.repeaterInfo;
    return { count: rowRepSum, info: firstInfo || `${rowRepSum} ${rowRepSum === 1 ? 'Repeater' : 'Repeaters'}` };
  }

  // 2. Check student enrollments for repeats
  const enCount = (enrollmentsList || []).filter(en => {
    const enCode = (en.module?.moduleCode || "").replace(/\s+/g, "").toUpperCase().trim();
    return (enCode === cleanCode || enCode === rawCode) && 
           (en.enrollmentType === 'repeat' || en.enrollmentType === 'resit');
  }).length;
  if (enCount > 0) {
    return { count: enCount, info: `${enCount} ${enCount === 1 ? 'Repeater' : 'Repeaters'}` };
  }

  // 3. Match against official faculty PDF registry
  if (FACULTY_REPEATER_REGISTRY[cleanCode]) {
    const reg = FACULTY_REPEATER_REGISTRY[cleanCode];
    return { count: reg.count, info: `${reg.count} ${reg.count === 1 ? 'Repeater' : 'Repeaters'}` };
  }
  if (FACULTY_REPEATER_REGISTRY[rawCode]) {
    const reg = FACULTY_REPEATER_REGISTRY[rawCode];
    return { count: reg.count, info: `${reg.count} ${reg.count === 1 ? 'Repeater' : 'Repeaters'}` };
  }

  // 4. Default: 0 repeaters for non-repeater modules
  return { count: 0, info: null };
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
  const [selectedTargetKey, setSelectedTargetKey] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [examTimetable, setExamTimetable] = useState(null);
  const [entries, setEntries] = useState([]);
  const [collapsedModules, setCollapsedModules] = useState({});
  const [showOnlyRepeaters, setShowOnlyRepeaters] = useState(false);

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

  // MIS Sync State
  const [enrollments, setEnrollments] = useState([]);
  const [showMISPanel, setShowMISPanel] = useState(false);
  const [misJsonInput, setMisJsonInput] = useState("");
  const [misSyncing, setMisSyncing] = useState(false);
  const [misSyncResult, setMisSyncResult] = useState("");

  const parseTargetKey = (key) => {
    if (!key) return { batchId: null, streamScope: "ALL" };
    const parts = key.split("_");
    const bId = parseInt(parts[0], 10);
    const sScope = parts.slice(1).join("_") || "ALL";
    return { batchId: bId, streamScope: sScope };
  };

  const getBatchOptions = () => {
    const options = [];
    batches.forEach(b => {
      const is3rdYear = (b.semester === 5 || b.semester === 6);
      if (is3rdYear) {
        options.push({
          key: `${b.batchId}_MAIN`,
          batchId: b.batchId,
          streamScope: "MAIN",
          label: `${b.batchName} Batch (Sem ${b.semester}) — General Stream (CE, EE, ME)`,
          shortLabel: `${b.batchName} (General Stream)`
        });
        options.push({
          key: `${b.batchId}_EC_MN`,
          batchId: b.batchId,
          streamScope: "EC_MN",
          label: `${b.batchName} Batch (Sem ${b.semester}) — Computer & Marine Depts (EC, MN)`,
          shortLabel: `${b.batchName} (EC & MN Depts)`
        });
        options.push({
          key: `${b.batchId}_EC`,
          batchId: b.batchId,
          streamScope: "EC",
          label: `${b.batchName} Batch (Sem ${b.semester}) — Computer Engineering (EC)`,
          shortLabel: `${b.batchName} (Computer Dept)`
        });
        options.push({
          key: `${b.batchId}_MN`,
          batchId: b.batchId,
          streamScope: "MN",
          label: `${b.batchName} Batch (Sem ${b.semester}) — Marine Engineering (MN)`,
          shortLabel: `${b.batchName} (Marine Dept)`
        });
      } else {
        options.push({
          key: `${b.batchId}_ALL`,
          batchId: b.batchId,
          streamScope: "ALL",
          label: `${b.batchName} Batch (Semester ${b.semester})`,
          shortLabel: `${b.batchName} Batch`
        });
      }
    });
    return options;
  };

  useEffect(() => {
    fetchBatches().then(data => {
      setBatches(data);
      if (data.length > 0) {
        const first = data[0];
        const is3rd = (first.semester === 5 || first.semester === 6);
        const defaultKey = is3rd ? `${first.batchId}_MAIN` : `${first.batchId}_ALL`;
        setSelectedTargetKey(defaultKey);
      }
    }).catch(console.error);
    fetchHalls().then(setHalls).catch(console.error);
    loadUnavailabilities();
  }, []);

  const loadUnavailabilities = () => {
    fetchExamHallUnavailabilities().then(setUnavailabilities).catch(console.error);
  };

  const loadBatchEnrollments = (batchId) => {
    if (!batchId) return;
    fetchStudentEnrollments(batchId).then(setEnrollments).catch(console.error);
  };

  useEffect(() => {
    if (selectedTargetKey) {
      const { batchId, streamScope } = parseTargetKey(selectedTargetKey);
      if (batchId) {
        loadBatchExamTimetable(batchId, streamScope);
        loadBatchEnrollments(batchId);
      }
    }
  }, [selectedTargetKey]);

  const loadBatchExamTimetable = async (batchId, streamScope = "ALL") => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchExamTimetables(batchId, streamScope);
      if (list && list.length > 0) {
        const latest = list[0];
        const details = await fetchExamTimetableDetails(latest.examTimetableId);
        setExamTimetable(details.examTimetable);

        const activeBatch = batches.find(b => String(b.batchId) === String(batchId));
        const cfg = getBatchConfig(activeBatch || latest.batch);

        // Group by module to guarantee single-hall repeater assignment and continuous reg ranges
        const byMod = {};
        (details.entries || []).forEach(e => {
          const mId = e.module ? String(e.module.moduleId) : ("nomod_" + (e.examEntryId || ""));
          if (!byMod[mId]) byMod[mId] = [];
          byMod[mId].push(e);
        });

        const loaded = [];
        for (const mId in byMod) {
          const modEntries = byMod[mId];
          const mCode = modEntries[0]?.module?.moduleCode;
          const repDetails = getModuleRepeaterDetails(mCode, modEntries, []);
          const existingRepSum = modEntries.reduce((sum, e) => sum + (Number(e.repeaterCount) || 0), 0);

          let currentStart = cfg.start;
          let deptCode = modEntries[0]?.module?.department?.departmentCode;
          let deptPrefix = (deptCode && deptCode.toUpperCase() !== "IS" && !mCode?.toUpperCase().startsWith("IS") && !mCode?.toUpperCase().startsWith("COM")) ? `${deptCode}: ` : "";

          modEntries.forEach((e, idx) => {
            const isLast = (idx === modEntries.length - 1);
            let repCount = (e.repeaterCount !== null && e.repeaterCount !== undefined) ? Number(e.repeaterCount) : 0;

            // If module has repeaters in registry but no entry has repeaters assigned yet, assign all to the single last hall
            if (existingRepSum === 0 && repDetails.count > 0 && isLast) {
              repCount = repDetails.count;
            }

            let rangeStr = e.studentIdRange;
            const count = (e.allocatedCount && Number(e.allocatedCount) > 0) ? Number(e.allocatedCount) : 80;
            const endNum = Math.min(currentStart + count - 1, cfg.end);

            if (!rangeStr || !rangeStr.includes("EG/") || rangeStr.includes("All ") || rangeStr.includes("Department Students")) {
              rangeStr = `${deptPrefix}EG/${cfg.year}/${String(currentStart).padStart(4, "0")} - EG/${cfg.year}/${String(endNum).padStart(4, "0")}`;
            }

            if (repCount > 0 && !rangeStr.toLowerCase().includes("repeat")) {
              rangeStr = `${rangeStr} + Repeaters`;
            } else if (repCount === 0 && rangeStr.toLowerCase().includes("repeat")) {
              rangeStr = rangeStr.replace(/\s*\+\s*Repeaters?/i, "").trim();
            }

            currentStart = endNum + 1;

            loaded.push({
              ...e,
              _localId: localIdCounter++,
              studentIdRange: rangeStr,
              repeaterCount: repCount,
              repeaterInfo: repCount > 0 ? (e.repeaterInfo || `${repCount} ${repCount === 1 ? 'Repeater' : 'Repeaters'}`) : null
            });
          });
        }

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

  const getBatchConfig = (batchObj) => {
    let bNum = 27;
    if (batchObj && batchObj.batchName) {
      const match = batchObj.batchName.match(/\d+/);
      if (match) bNum = parseInt(match[0], 10);
    }
    if (bNum === 23) return { year: 2021, start: 4376, end: 4894 };
    if (bNum === 24) return { year: 2022, start: 4904, end: 5453 };
    if (bNum === 25) return { year: 2023, start: 5456, end: 5998 };
    return { year: 2025, start: 6560, end: 7112 };
  };

  const handleAddVenue = (key, templateEntry) => {
    const { batchId } = parseTargetKey(selectedTargetKey);
    const activeBatch = batches.find(b => String(b.batchId) === String(batchId));
    const cfg = getBatchConfig(activeBatch);
    const existingForMod = entries.filter(e => moduleKey(e) === key);
    let nextStart = cfg.start;
    let deptPrefix = "";
    if (templateEntry.module && templateEntry.module.department && templateEntry.module.department.departmentCode && templateEntry.module.department.departmentCode.toUpperCase() !== "IS") {
      deptPrefix = templateEntry.module.department.departmentCode + ": ";
    }
    if (existingForMod.length > 0) {
      const last = existingForMod[existingForMod.length - 1];
      if (last.studentIdRange) {
        const m = last.studentIdRange.match(/(\d{4})\s*(\+.*)?$/);
        if (m && m[1]) {
          const parsedEnd = parseInt(m[1], 10);
          if (!isNaN(parsedEnd)) nextStart = parsedEnd + 1;
        }
      }
    }
    const defaultCount = 80;
    const nextEnd = Math.min(nextStart + defaultCount - 1, cfg.end);
    const computedRange = `${deptPrefix}EG/${cfg.year}/${String(nextStart).padStart(4, "0")} - EG/${cfg.year}/${String(nextEnd).padStart(4, "0")}`;

    const newEntry = {
      _localId: localIdCounter++,
      _isNew: true,
      module: templateEntry.module,
      examDate: templateEntry.examDate,
      startTime: templateEntry.startTime,
      endTime: templateEntry.endTime,
      sessionName: templateEntry.sessionName,
      hall: null,
      studentIdRange: computedRange,
      allocatedCount: defaultCount
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
    const { batchId, streamScope } = parseTargetKey(selectedTargetKey);
    if (!batchId || !startDate) { alert("Please select a batch and start date."); return; }
    setLoading(true);
    try {
      await createExamTimetable({
        batchId: Number(batchId),
        startDate,
        durationWeeks: Number(durationWeeks),
        streamScope: streamScope || "ALL"
      });
      alert("Exam timetable auto-optimized and created!");
      await loadBatchExamTimetable(Number(batchId), streamScope);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReoptimize = async () => {
    if (!examTimetable) return;
    const { batchId, streamScope } = parseTargetKey(selectedTargetKey);
    if (confirm("Re-run optimization? This will recalculate all dates, sessions, and venues.")) {
      setLoading(true);
      try {
        await reoptimizeExamTimetable(examTimetable.examTimetableId);
        alert("Exam schedule re-optimized!");
        await loadBatchExamTimetable(Number(batchId), streamScope);
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveEntries = async () => {
    if (!examTimetable) return;
    const { batchId, streamScope } = parseTargetKey(selectedTargetKey);
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
        allocatedCount: e.allocatedCount,
        repeaterCount: e.repeaterCount || 0,
        repeaterInfo: e.repeaterInfo || null
      }));
      await saveExamEntries(examTimetable.examTimetableId, payload);
      alert("Exam schedule saved successfully!");
      await loadBatchExamTimetable(Number(batchId), streamScope);
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!examTimetable) return;
    const { batchId, streamScope } = parseTargetKey(selectedTargetKey);
    try {
      if (examTimetable.status === "published") {
        if (confirm("Unpublish this timetable? Students will no longer see it.")) {
          await unpublishExamTimetable(examTimetable.examTimetableId);
          alert("Unpublished!");
          await loadBatchExamTimetable(Number(batchId), streamScope);
        }
      } else {
        await publishExamTimetable(examTimetable.examTimetableId);
        alert("Published to students!");
        await loadBatchExamTimetable(Number(batchId), streamScope);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteTimetable = async () => {
    if (!examTimetable) return;
    const { batchId, streamScope } = parseTargetKey(selectedTargetKey);
    if (confirm("Delete this exam timetable draft?")) {
      try {
        await deleteExamTimetable(examTimetable.examTimetableId);
        alert("Deleted!");
        await loadBatchExamTimetable(Number(batchId), streamScope);
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

  const handleSyncMIS = async () => {
    const { batchId } = parseTargetKey(selectedTargetKey);
    if (!batchId) { alert("Please select a batch."); return; }
    if (!misJsonInput.trim()) { alert("Please enter MIS registration records in JSON or CSV format."); return; }

    setMisSyncing(true);
    setMisSyncResult("");
    try {
      let parsedRecords = [];
      const trimmed = misJsonInput.trim();

      // Check if CSV format
      if (trimmed.includes(",") && !trimmed.startsWith("[")) {
        const lines = trimmed.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        // Header detection
        let startIdx = 0;
        if (lines[0].toLowerCase().includes("reg") || lines[0].toLowerCase().includes("student")) {
          startIdx = 1;
        }
        for (let i = startIdx; i < lines.length; i++) {
          const parts = lines[i].split(",").map(p => p.trim());
          if (parts.length >= 2) {
            parsedRecords.push({
              studentRegNo: parts[0],
              moduleCode: parts[1],
              enrollmentType: parts[2] || "regular",
              studentEmail: parts[3] || null
            });
          }
        }
      } else {
        // JSON format
        parsedRecords = JSON.parse(trimmed);
      }

      if (!Array.isArray(parsedRecords) || parsedRecords.length === 0) {
        throw new Error("No valid enrollment records found.");
      }

      const res = await syncMISStudentEnrollments(Number(batchId), parsedRecords);
      setMisSyncResult(`Successfully imported ${res.importedCount} student course registrations from MIS!`);
      setMisJsonInput("");
      loadBatchEnrollments(Number(batchId));
    } catch (err) {
      alert("MIS Import Error: " + err.message);
    } finally {
      setMisSyncing(false);
    }
  };

  const handleClearMIS = async () => {
    const { batchId } = parseTargetKey(selectedTargetKey);
    if (!batchId) return;
    if (confirm("Clear all student course registrations for this batch?")) {
      try {
        await clearBatchEnrollments(Number(batchId));
        setEnrollments([]);
        setMisSyncResult("Batch enrollments cleared.");
      } catch (err) {
        alert("Error: " + err.message);
      }
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
    <>
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
                <div style={{ flex: "1 1 300px" }}>
                  <label className="form-label" style={{ fontWeight: "700", color: "#334155" }}>Batch / Exam Stream</label>
                  <select className="form-select" value={selectedTargetKey} onChange={e => setSelectedTargetKey(e.target.value)} style={{ borderRadius: "10px", border: "1.5px solid #cbd5e1", fontWeight: "600", fontSize: "13px", padding: "8px 12px", background: "#f8fafc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                    {getBatchOptions().map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
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
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm(`Remove unavailability for ${u.hall?.hallName || 'this hall'}?`)) {
                              try {
                                await deleteExamHallUnavailability(u.unavailabilityId);
                                loadUnavailabilities();
                              } catch (err) {
                                alert("Failed to delete hall unavailability: " + err.message);
                              }
                            }
                          }}
                          title="Delete unavailability"
                          style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── MIS Student Course Registrations (Electives, IS, Repeats) ─── */}
          <div className="card" style={{ marginBottom: "20px" }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={16} style={{ color: "var(--primary-600)" }} /> MIS Student Course Registrations (TE, IS, Repeats)
                {enrollments.length > 0 && (
                  <span style={{ background: "#dcfce7", color: "#166534", fontSize: "11px", padding: "1px 7px", borderRadius: "10px", fontWeight: "700" }}>
                    {enrollments.length} Records
                  </span>
                )}
              </h3>
              <div style={{ display: "flex", gap: "8px" }}>
                {enrollments.length > 0 && (
                  <button onClick={handleClearMIS} style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                    Clear
                  </button>
                )}
                <button onClick={() => setShowMISPanel(!showMISPanel)} style={{ background: "var(--primary-600)", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                  <UploadCloud size={14} /> {showMISPanel ? "Hide MIS Sync" : "Import / Sync from MIS"}
                </button>
              </div>
            </div>

            {showMISPanel && (
              <div className="card-body" style={{ borderTop: "1px solid var(--neutral-200)", background: "#f8fafc" }}>
                {misSyncResult && (
                  <div style={{ background: "#dcfce7", border: "1px solid #bbf7d0", color: "#166534", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "14px", fontWeight: "600" }}>
                    ✓ {misSyncResult}
                  </div>
                )}

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                    Paste MIS Course Registration Data (CSV or JSON format):
                  </label>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 8px 0" }}>
                    <strong>CSV Format:</strong> <code>StudentRegNo, ModuleCode, EnrollmentType (regular / technical_elective / is_module / repeat), StudentEmail</code>
                  </p>
                  <textarea
                    rows={4}
                    value={misJsonInput}
                    onChange={e => setMisJsonInput(e.target.value)}
                    placeholder={`EG/2021/4001, EC5010, technical_elective, student1@eng.ruh.ac.lk\nEG/2021/4002, IS3020, is_module, student2@eng.ruh.ac.lk\nEG/2020/3805, CE4010, repeat, student3@eng.ruh.ac.lk`}
                    style={{
                      width: "100%",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMisJsonInput(`EG/2021/4001, EC5010, technical_elective, student1@eng.ruh.ac.lk\nEG/2021/4002, IS3020, is_module, student2@eng.ruh.ac.lk\nEG/2020/3850, EE3010, repeat, repeat_std@eng.ruh.ac.lk`);
                    }}
                    style={{ background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                  >
                    Load Sample MIS Data
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncMIS}
                    disabled={misSyncing}
                    style={{ background: "var(--primary-600)", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "12px", fontWeight: "600", cursor: misSyncing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <RefreshCw size={14} className={misSyncing ? "animate-spin" : ""} />
                    {misSyncing ? "Syncing with Database..." : "Sync MIS Registrations"}
                  </button>
                </div>
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
                    Exam Schedule — Multi-Venue & Repeater Manager
                    <span style={{ fontSize: "12px", background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "12px", fontWeight: "600" }}>
                      {groups.length} modules
                    </span>
                  </h3>
                  <p style={{ margin: "4px 0 0 26px", fontSize: "12px", color: "var(--neutral-500)" }}>
                    Multi-venue hall allocations with explicit <strong>Regular Candidates</strong> and <strong>Repeat Candidates</strong> tracking.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Department:</span>
                    <select
                      className="form-select form-select-sm"
                      value={selectedDeptFilter}
                      onChange={e => setSelectedDeptFilter(e.target.value)}
                      style={{
                        borderRadius: "8px",
                        border: "1.5px solid #cbd5e1",
                        fontWeight: "600",
                        fontSize: "12px",
                        padding: "6px 10px",
                        background: "#ffffff",
                        color: "#1e293b",
                        cursor: "pointer"
                      }}
                    >
                      <option value="ALL">All Departments</option>
                      <option value="CE">Civil Engineering (CE)</option>
                      <option value="EE">Electrical &amp; Information (EE)</option>
                      <option value="ME">Mechanical Engineering (ME)</option>
                      <option value="EC">Computer Engineering (EC)</option>
                      <option value="MN">Marine Engineering (MN)</option>
                      <option value="IS">Interdisciplinary (IS)</option>
                    </select>
                  </div>
                  <button
                    onClick={() => setShowOnlyRepeaters(!showOnlyRepeaters)}
                    style={{
                      background: showOnlyRepeaters ? "#fef3c7" : "#f1f5f9",
                      color: showOnlyRepeaters ? "#92400e" : "#475569",
                      border: showOnlyRepeaters ? "1.5px solid #f59e0b" : "1.5px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    {showOnlyRepeaters ? "Showing: Repeaters Only" : "Filter: Repeaters Only"}
                  </button>
                  <button onClick={handleSaveEntries} disabled={saving} style={{ background: "var(--primary-600)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Save size={15} /> {saving ? "Saving..." : "Save All Changes"}
                  </button>
                </div>
              </div>

              {/* ─── Batch Candidates Summary Bar ─── */}
              {(() => {
                const { batchId } = parseTargetKey(selectedTargetKey);
                const activeBatch = batches.find(b => String(b.batchId) === String(batchId));
                // Authoritative batch headcount (e.g., 530 students for 25th batch)
                const batchRegularStudents = activeBatch?.studentCount || (groups.length > 0 ? Math.max(...groups.map(g => g.rows.reduce((sum, r) => sum + (Number(r.allocatedCount) || 0), 0))) : 530);
                let totalRepeaters = 0;
                let modsWithRepeaters = 0;

                groups.forEach(g => {
                  const mCode = g.rows[0]?.module?.moduleCode;
                  const rep = getModuleRepeaterDetails(mCode, g.rows, enrollments);
                  if (rep.count > 0) {
                    totalRepeaters += rep.count;
                    modsWithRepeaters++;
                  }
                });

                return (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                    padding: "14px 20px",
                    background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                    borderBottom: "1.5px solid var(--neutral-200)"
                  }}>
                    <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Total Scheduled Modules</div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>{groups.length} <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>modules</span></div>
                    </div>
                    <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #bfdbfe", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#1e40af", textTransform: "uppercase" }}>Batch Regular Students</div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: "#1d4ed8", marginTop: "2px" }}>{batchRegularStudents} <span style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "500" }}>students</span></div>
                    </div>
                    <div style={{ background: "#fffbeb", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #fde68a", boxShadow: "0 1px 2px rgba(245, 158, 11, 0.06)" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#92400e", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                        Repeat Candidates Registered
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: "#b45309", marginTop: "2px" }}>
                        {totalRepeaters} <span style={{ fontSize: "12px", color: "#92400e", fontWeight: "600" }}>repeaters across {modsWithRepeaters} modules</span>
                      </div>
                    </div>
                    <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #86efac", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#15803d", textTransform: "uppercase" }}>Total Batch Examinees</div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: "#16a34a", marginTop: "2px" }}>{batchRegularStudents + totalRepeaters} <span style={{ fontSize: "12px", color: "#15803d", fontWeight: "500" }}>examinees</span></div>
                    </div>
                  </div>
                );
              })()}

              <div className="card-body" style={{ padding: 0 }}>
                {groups.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "var(--neutral-500)" }}>No modules found for this batch.</div>
                ) : (
                  <div>
                    {groups
                      .filter(group => {
                        const firstRow = group.rows[0];
                        const mCode = (firstRow?.module?.moduleCode || "").toUpperCase().trim();
                        const dCode = (firstRow?.module?.department?.departmentCode || "").toUpperCase().trim();

                        if (selectedDeptFilter !== "ALL") {
                          let modDept = dCode;
                          if (!modDept) {
                            if (mCode.startsWith("CE")) modDept = "CE";
                            else if (mCode.startsWith("EE")) modDept = "EE";
                            else if (mCode.startsWith("ME")) modDept = "ME";
                            else if (mCode.startsWith("EC") || mCode.startsWith("CO")) modDept = "EC";
                            else if (mCode.startsWith("MN")) modDept = "MN";
                            else if (mCode.startsWith("IS")) modDept = "IS";
                          }
                          const isMatch = (modDept === selectedDeptFilter) ||
                                          (selectedDeptFilter === "EC" && (mCode.startsWith("EC") || mCode.startsWith("CO"))) ||
                                          (mCode.startsWith(selectedDeptFilter));
                          if (!isMatch) return false;
                        }

                        if (showOnlyRepeaters) {
                          const rep = getModuleRepeaterDetails(mCode, group.rows, enrollments);
                          if (rep.count === 0) return false;
                        }
                        return true;
                      })
                      .map((group, gIdx) => {
                      const firstRow = group.rows[0];
                      const totalAllocated = group.rows.reduce((sum, r) => sum + (Number(r.allocatedCount) || 0), 0);
                      const hasUnavail = group.rows.some(r => isHallUnavailable(r.hall?.hallId, r.examDate));
                      const isCollapsed = collapsedModules[group.key];
                      const rowBg = gIdx % 2 === 0 ? "#f8fafc" : "#ffffff";

                      // Authoritative repeater resolution
                      const mCode = firstRow?.module?.moduleCode;
                      const repDetails = getModuleRepeaterDetails(mCode, group.rows, enrollments);
                      const moduleRepeaters = repDetails.count;

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
                            <div style={{ flex: "0 0 240px", minWidth: "180px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <strong style={{ fontSize: "14px", color: "var(--neutral-900)" }}>{firstRow?.module?.moduleCode}</strong>
                                {hasUnavail && <span style={{ fontSize: "10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", padding: "1px 5px", borderRadius: "5px", fontWeight: "700" }}>Conflict</span>}
                                {moduleRepeaters > 0 && (
                                  <span style={{
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    background: "#fef3c7",
                                    color: "#92400e",
                                    border: "1.5px solid #f59e0b",
                                    padding: "2px 8px",
                                    borderRadius: "8px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    boxShadow: "0 1px 2px rgba(245, 158, 11, 0.15)"
                                  }}>
                                    Repeat: {moduleRepeaters}
                                  </span>
                                )}
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
                            <div style={{ flex: "0 0 auto", marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }} onClick={e => e.stopPropagation()}>
                              <span style={{ fontSize: "12px", background: "#eff6ff", color: "#1d4ed8", padding: "4px 10px", borderRadius: "10px", fontWeight: "700", whiteSpace: "nowrap" }}>
                                {totalAllocated} regular {moduleRepeaters > 0 ? `+ ${moduleRepeaters} repeat = ${totalAllocated + moduleRepeaters} total` : ""} / {group.rows.length} {group.rows.length === 1 ? "venue" : "venues"}
                              </span>
                            </div>
                          </div>

                          {/* Venue sub-rows */}
                          {!isCollapsed && (
                            <div style={{ background: gIdx % 2 === 0 ? "#f1f5f9" : "#f8fafc", paddingBottom: "10px" }}>
                              {(() => {
                                const activeBatch = batches.find(b => String(b.batchId) === String(selectedBatchId));
                                const showRegRange = true; // Enabled for all batches (Sem 2, 4, 6, 8)
                                return (
                                  <>
                                    {/* Column headers */}
                                    <div style={{
                                      display: "grid",
                                      gridTemplateColumns: "minmax(180px,1.2fr) minmax(240px,2fr) 68px 90px 36px",
                                      gap: "8px",
                                      padding: "6px 20px 6px 52px",
                                      fontSize: "10px",
                                      fontWeight: "800",
                                      color: "var(--neutral-400)",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.06em",
                                      borderBottom: "1px solid var(--neutral-200)"
                                    }}>
                                      <span>Venue / Hall</span>
                                      <span>Student Registration Range</span>
                                      <span style={{ textAlign: "center" }}>Regular</span>
                                      <span style={{ textAlign: "center", color: "#b45309" }}>Repeaters</span>
                                      <span></span>
                                    </div>

                                    {group.rows.map((entry) => {
                                      const hallUnavail = isHallUnavailable(entry.hall?.hallId, entry.examDate);
                                      const entryRepCount = (entry.repeaterCount !== undefined && entry.repeaterCount !== null) ? Number(entry.repeaterCount) : 0;
                                      const isEntryRepeater = entryRepCount > 0 || (entry.studentIdRange && entry.studentIdRange.toLowerCase().includes("repeat"));

                                      return (
                                        <div key={entry._localId} style={{
                                          display: "grid",
                                          gridTemplateColumns: "minmax(180px,1.2fr) minmax(240px,2fr) 68px 90px 36px",
                                          gap: "8px",
                                          padding: "8px 20px 8px 52px",
                                          alignItems: "center",
                                          borderBottom: "1px solid var(--neutral-100)",
                                          background: hallUnavail ? "#fff5f5" : (isEntryRepeater ? "rgba(254, 243, 199, 0.25)" : "transparent")
                                        }}>

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

                                          {/* Student range and repeater allocation indicator */}
                                          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
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
                                                placeholder="Registration range..."
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
                                              />
                                            </div>
                                            {isEntryRepeater && (
                                              <span style={{
                                                background: "#fef3c7",
                                                color: "#92400e",
                                                border: "1px solid #fde68a",
                                                padding: "3px 8px",
                                                borderRadius: "6px",
                                                fontSize: "11px",
                                                fontWeight: "800",
                                                whiteSpace: "nowrap"
                                              }}>
                                                + Repeaters
                                              </span>
                                            )}
                                          </div>

                                          {/* Regular Allocated Seats */}
                                          <div>
                                            <input
                                              type="number"
                                              placeholder="0"
                                              min={0}
                                              value={entry.allocatedCount !== undefined && entry.allocatedCount !== null ? entry.allocatedCount : ""}
                                              onChange={e => {
                                                const newCount = e.target.value ? Number(e.target.value) : 0;
                                                updateEntry(entry._localId, "allocatedCount", newCount);
                                                if (showRegRange && newCount > 0 && entry.studentIdRange) {
                                                  const newRange = calcRangeFromCount(entry.studentIdRange, newCount);
                                                  if (newRange !== entry.studentIdRange) {
                                                    updateEntry(entry._localId, "studentIdRange", newRange);
                                                  }
                                                }
                                              }}
                                              title="Regular Students Count"
                                              style={{
                                                width: "56px",
                                                padding: "8px 6px",
                                                fontSize: "13px",
                                                fontWeight: "800",
                                                fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                                                color: "#1d4ed8",
                                                background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
                                                border: "1.5px solid #93c5fd",
                                                borderRadius: "8px",
                                                textAlign: "center",
                                                outline: "none"
                                              }}
                                            />
                                          </div>

                                          {/* Repeater Students Allocated */}
                                          <div>
                                            <input
                                              type="number"
                                              placeholder="0"
                                              min={0}
                                              value={entry.repeaterCount !== undefined && entry.repeaterCount !== null ? entry.repeaterCount : 0}
                                              onChange={e => {
                                                const newCount = e.target.value ? Number(e.target.value) : 0;
                                                updateEntry(entry._localId, "repeaterCount", newCount);
                                                if (newCount > 0) {
                                                  updateEntry(entry._localId, "repeaterInfo", `${newCount} ${newCount === 1 ? 'Repeater' : 'Repeaters'}`);
                                                  if (entry.studentIdRange && !entry.studentIdRange.includes("Repeat")) {
                                                    updateEntry(entry._localId, "studentIdRange", `${entry.studentIdRange} + Repeaters`);
                                                  }
                                                } else {
                                                  updateEntry(entry._localId, "repeaterInfo", null);
                                                  if (entry.studentIdRange && entry.studentIdRange.includes("Repeat")) {
                                                    const cleanRange = entry.studentIdRange.replace(/\s*\+\s*Repeaters?/i, "").trim();
                                                    updateEntry(entry._localId, "studentIdRange", cleanRange);
                                                  }
                                                }
                                              }}
                                              title="Repeater Students Count Allocated to this Hall"
                                              style={{
                                                width: "76px",
                                                padding: "8px 6px",
                                                fontSize: "13px",
                                                fontWeight: "800",
                                                fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                                                color: entryRepCount > 0 ? "#b45309" : "#64748b",
                                                background: entryRepCount > 0 ? "#fef3c7" : "#f8fafc",
                                                border: entryRepCount > 0 ? "1.5px solid #f59e0b" : "1.5px solid #cbd5e1",
                                                borderRadius: "8px",
                                                textAlign: "center",
                                                outline: "none"
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

                                    {/* Add extra venue button */}
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
                                  </>
                                );
                              })()}
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
    <style>{`
      @media print {
        .sidebar, .topbar, .no-print, header, button, .card:first-child {
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
      }
    `}</style>
    </>
  );
}
