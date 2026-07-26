"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import {
  fetchBatches, createBatch, updateBatch, deleteBatch,
  fetchHalls, createHall, updateHall, deleteHall,
  fetchModules, createModule, updateModule, deleteModule,
  fetchTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot,
  fetchUsers, createUser, updateUser, deleteUser,
  fetchDepartments,
  generateTimetable,
  fetchLabSchedules, createLabSchedule, deleteLabSchedule,
  fetchLecturers, fetchBatchModules, updateBatchModule, updateLecturer, deleteLecturer,
  addModuleToBatch, removeModuleFromBatch, autoLinkSharedModules
} from "../lib/api";
import "../optimizer.css";
import { Shield, GraduationCap, Building, BookOpen, Calendar, User, Zap, Plus, FlaskConical } from "lucide-react";

const SEMESTERS = [
  { id: "1", label: "1st Semester" },
  { id: "2", label: "2nd Semester" },
  { id: "3", label: "3rd Semester" },
  { id: "4", label: "4th Semester" },
  { id: "5", label: "5th Semester" },
  { id: "6", label: "6th Semester" },
  { id: "7", label: "7th Semester" },
  { id: "8", label: "8th Semester" },
];

export default function AdminDashboard() {
  const router = useRouter();
  // Persistent Tab & Selection States
  const [activeTab, setActiveTabState] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin_activeTab") || "batches";
    }
    return "batches";
  });
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") sessionStorage.setItem("admin_activeTab", tab);
  };

  // Data lists
  const [batches, setBatches] = useState([]);
  const [halls, setHalls] = useState([]);
  const [modules, setModules] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [batchModules, setBatchModules] = useState([]);
  const [allBatchModules, setAllBatchModules] = useState([]);
  
  const [assignBatchId, setAssignBatchIdState] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin_assignBatchId") || "";
    }
    return "";
  });
  const setAssignBatchId = (val) => {
    setAssignBatchIdState(val);
    if (typeof window !== "undefined") sessionStorage.setItem("admin_assignBatchId", String(val));
  };

  const [assignDeptId, setAssignDeptIdState] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin_assignDeptId") || "";
    }
    return "";
  });
  const setAssignDeptId = (val) => {
    setAssignDeptIdState(val);
    if (typeof window !== "undefined") sessionStorage.setItem("admin_assignDeptId", String(val));
  };

  const [assignLoading, setAssignLoading] = useState(false);
  const [changedAssignments, setChangedAssignments] = useState({});
  const [filterDeptId, setFilterDeptId] = useState("all");
  
  const [moduleBatchFilterId, setModuleBatchFilterIdState] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin_moduleBatchFilterId") || "all";
    }
    return "all";
  });
  const setModuleBatchFilterId = (val) => {
    setModuleBatchFilterIdState(val);
    if (typeof window !== "undefined") sessionStorage.setItem("admin_moduleBatchFilterId", String(val));
  };

  const [moduleDeptFilterId, setModuleDeptFilterId] = useState("");
  const [moduleBatchModules, setModuleBatchModules] = useState([]);
  const [assignableModuleId, setAssignableModuleId] = useState("");
  const [moduleBatchLoading, setModuleBatchLoading] = useState(false);

  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  
  const [selectedBatchId, setSelectedBatchIdState] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin_selectedBatchId") || "";
    }
    return "";
  });
  const setSelectedBatchId = (val) => {
    setSelectedBatchIdState(val);
    if (typeof window !== "undefined") sessionStorage.setItem("admin_selectedBatchId", String(val));
  };

  const [optDeptId, setOptDeptId] = useState("");
  const [labs, setLabs] = useState([]);
  const [labForm, setLabForm] = useState({ batchId: "", dayOfWeek: "Monday", startTime: "08:30", endTime: "10:30", departmentId: "" });

  // Form states
  const [batchForm, setBatchForm] = useState({
    batchName: "",
    academicYear: 2026,
    semester: 1,
    studentCount: 40,
    status: "active",
    lunchStartTime: "12:30",
    lunchEndTime: "13:30",

  });
  const [hallForm, setHallForm] = useState({ hallName: "", capacity: 60, hallType: "lecture", isActive: true });
  const [moduleForm, setModuleForm] = useState({ moduleCode: "", moduleName: "", creditHours: 3, lectureHoursPerWeek: 3, labHoursPerWeek: 0, semester: 1, sessionType: "lecture", departmentId: "" });
  const [timeslotForm, setTimeslotForm] = useState({ dayOfWeek: "Monday", startTime: "08:30", endTime: "10:30" });
  const [userForm, setUserForm] = useState({ username: "", password: "", role: "student", batchId: "", name: "", email: "", departmentId: "", specialization: "", maxHoursPerWeek: 20, universityAddress: "", phoneNumber: "", title: "Dr." });
  const [lecturerForm, setLecturerForm] = useState({ username: "", password: "", name: "", email: "", departmentId: "", specialization: "", maxHoursPerWeek: 20, universityAddress: "", phoneNumber: "", title: "Dr." });

  // Editing state (for modals/inline editing)
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    // Verify admin session
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/");
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== "admin") {
      router.push(`/${user.role}`);
      return;
    }

    loadAllData();
  }, []);

  const loadBatchModules = async (batchId, deptId) => {
    if (!batchId) return;
    setAssignLoading(true);
    try {
      const selectedBatch = batches.find(b => String(b.batchId) === String(batchId));
      const isDeptRequired = selectedBatch ? selectedBatch.semester >= 3 : false;
      const validDeptId = (isDeptRequired && deptId && deptId !== "all" && !isNaN(Number(deptId))) ? Number(deptId) : null;
      const data = await fetchBatchModules(Number(batchId), validDeptId);
      setBatchModules(Array.isArray(data) ? data : []);
      setChangedAssignments({});
      
      const allData = await fetchBatchModules(Number(batchId), null);
      setAllBatchModules(allData || []);
    } catch (err) {
      alert("Error loading batch modules: " + err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "assign modules") {
      loadBatchModules(assignBatchId, assignDeptId);
    }
  }, [activeTab, assignBatchId, assignDeptId]);

  const handleSaveAllAssignments = async () => {
    if (Object.keys(changedAssignments).length === 0) {
      alert("No changes to save.");
      return;
    }
    try {
      const promises = Object.keys(changedAssignments).map(batchModuleId => {
        const changes = changedAssignments[batchModuleId];
        const bm = batchModules.find(b => String(b.batchModuleId) === String(batchModuleId));
        
        const isShared = changes.isShared !== undefined ? changes.isShared : (bm.isShared || false);
        const linkedId = changes.linkedBatchModuleId !== undefined ? changes.linkedBatchModuleId : bm.linkedBatchModuleId;
        const currentLecIds = changes.lecturerIds !== undefined ? changes.lecturerIds : (bm.allLecturerIds || []);
        const currentHallId = changes.preferredHallId !== undefined ? changes.preferredHallId : (bm.preferredHall ? bm.preferredHall.hallId : null);
        
        const payload = {
          lecturerIds: Array.isArray(currentLecIds) ? currentLecIds.map(Number) : [],
          preferredHallId: currentHallId ? Number(currentHallId) : null,
          isShared: Boolean(isShared),
          linkedBatchModuleId: linkedId ? Number(linkedId) : null
        };
        return updateBatchModule(batchModuleId, payload);
      });
      
      await Promise.all(promises);
      alert("All assignments saved successfully!");
      setChangedAssignments({});
      loadBatchModules(assignBatchId, assignDeptId);
    } catch (err) {
      alert("Failed to save assignments: " + err.message);
    }
  };

  const loadModuleBatchModules = async () => {
    if (moduleBatchFilterId === "all") return;
    setModuleBatchLoading(true);
    try {
      const data = await fetchBatchModules(Number(moduleBatchFilterId), moduleDeptFilterId ? Number(moduleDeptFilterId) : null);
      setModuleBatchModules(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setModuleBatchLoading(false);
    }
  };

  useEffect(() => {
    loadModuleBatchModules();
  }, [moduleBatchFilterId, moduleDeptFilterId]);
 
  const handleAssignModuleToBatch = async (e) => {
    e.preventDefault();
    if (!assignableModuleId) return;
    setSubmitting(true);
    try {
      await addModuleToBatch(
        Number(moduleBatchFilterId), 
        Number(assignableModuleId),
        moduleDeptFilterId ? Number(moduleDeptFilterId) : null
      );
      alert("Module assigned to batch successfully!");
      setAssignableModuleId("");
      loadModuleBatchModules();
    } catch (err) {
      alert("Failed to assign module: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };
 
  const handleRemoveModuleFromBatch = async (batchModuleId) => {
    if (!confirm("Are you sure you want to remove this module assignment from this batch?")) return;
    try {
      await removeModuleFromBatch(
        Number(moduleBatchFilterId), 
        batchModuleId,
        moduleDeptFilterId ? Number(moduleDeptFilterId) : null
      );
      alert("Module removed successfully!");
      loadModuleBatchModules();
    } catch (err) {
      alert("Failed to remove module: " + err.message);
    }
  };
 
  // Prefill semester when batch filter changes
  useEffect(() => {
    setModuleDeptFilterId("");
    if (moduleBatchFilterId !== "all") {
      const selBatch = batches.find(b => String(b.batchId) === String(moduleBatchFilterId));
      if (selBatch) {
        setModuleForm(prev => ({
          ...prev,
          semester: selBatch.semester
        }));
      }
    }
  }, [moduleBatchFilterId, batches]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [bData, hData, mData, tData, uData, dData, lData, lecData] = await Promise.all([
        fetchBatches(),
        fetchHalls(),
        fetchModules(),
        fetchTimeSlots(),
        fetchUsers(),
        fetchDepartments(),
        fetchLabSchedules(),
        fetchLecturers()
      ]);
      setBatches(bData);
      setHalls(hData);
      setModules(mData);
      setTimeslots(tData);
      setUsers(uData);
      setDepartments(dData);
      setLabs(lData);
      setLecturers(lecData);
      
      // Set defaults for IDs in forms
      if (dData.length > 0) {
        const nonCompDepts = dData.filter(d => d.departmentCode !== "EC" && !d.departmentName?.toLowerCase().includes("computer"));
        const defaultLecturerDeptId = nonCompDepts[0]?.departmentId || dData[0].departmentId;
        setModuleForm(prev => ({ ...prev, departmentId: dData[0].departmentId }));
        setUserForm(prev => ({ ...prev, departmentId: dData[0].departmentId }));
        setLecturerForm(prev => ({ ...prev, departmentId: defaultLecturerDeptId }));
        setOptDeptId(prev => prev || dData[0].departmentId.toString());
        setAssignDeptId(prev => prev || dData[0].departmentId.toString());
      }
      if (bData.length > 0) {
        setUserForm(prev => ({ ...prev, batchId: prev.batchId || bData[0].batchId }));
        setLabForm(prev => ({ ...prev, batchId: prev.batchId || bData[0].batchId, departmentId: prev.departmentId || (dData[0]?.departmentId?.toString() || "") }));
        setSelectedBatchId(prev => prev || String(bData[0].batchId));
        setAssignBatchId(prev => prev || String(bData[0].batchId));
      }
    } catch (err) {
      alert("Error loading dashboard data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // CRUD Handlers
  const handleCreate = async (type, e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (type === "batch") {
        const payload = {
          batchName: batchForm.batchName,
          academicYear: Number(batchForm.academicYear),
          semester: Number(batchForm.semester),
          studentCount: Number(batchForm.studentCount),
          status: batchForm.status,
          lunchStartTime: batchForm.lunchStartTime || "12:30",
          lunchEndTime: batchForm.lunchEndTime || "13:30"
        };
        const newBatch = await createBatch(payload);



        setBatchForm({
          batchName: "",
          academicYear: 2026,
          semester: 1,
          studentCount: 40,
          status: "active",
          lunchStartTime: "12:30",
          lunchEndTime: "13:30",

        });
      } else if (type === "hall") {
        await createHall(hallForm);
        setHallForm({ hallName: "", capacity: 60, hallType: "lecture", isActive: true });
      } else if (type === "module") {
        const deptId = Number(moduleForm.departmentId);
        if (!deptId) {
          alert("Please select a department before adding the module.");
          setSubmitting(false);
          return;
        }

        // Check if module already exists globally by moduleCode
        const existingGlobal = modules.find(m => m.moduleCode.toLowerCase() === moduleForm.moduleCode.toLowerCase());
        
        let targetModuleId = null;
        if (existingGlobal) {
          targetModuleId = existingGlobal.moduleId;
        } else {
          // Strip the flat 'departmentId' field and send a proper nested department object
          const { departmentId: _ignored, ...moduleRest } = moduleForm;
          const payload = {
            ...moduleRest,
            department: { departmentId: deptId }
          };
          try {
            const newModule = await createModule(payload);
            if (newModule && newModule.moduleId) {
              targetModuleId = newModule.moduleId;
              setModules(prev => [...prev, newModule]);
            }
          } catch (err) {
            alert("Failed to create module: " + err.message);
            setSubmitting(false);
            return;
          }
        }

        if (moduleBatchFilterId !== "all" && targetModuleId) {
          try {
            const alreadyAssigned = moduleBatchModules.some(bm => bm.moduleId === targetModuleId);
            if (alreadyAssigned) {
              alert("This module is already assigned to this batch!");
            } else {
              await addModuleToBatch(Number(moduleBatchFilterId), targetModuleId);
              alert("Module assigned to batch successfully!");
              await loadModuleBatchModules();
            }
          } catch (err) {
            alert("Failed to assign module to batch: " + err.message);
          }
        } else if (moduleBatchFilterId === "all") {
          alert("Module created globally successfully!");
        }
        
        setModuleForm({ moduleCode: "", moduleName: "", creditHours: 3, lectureHoursPerWeek: 3, labHoursPerWeek: 0, semester: moduleBatchFilterId !== "all" ? moduleForm.semester : 1, sessionType: "lecture", departmentId: deptId });
      } else if (type === "timeslot") {
        await createTimeSlot(timeslotForm);
        setTimeslotForm({ dayOfWeek: "Monday", startTime: "08:30", endTime: "10:30" });
      } else if (type === "user") {
        const payload = {
          username: userForm.username,
          password: userForm.password,
          role: userForm.role
        };
        if (userForm.role === "student") {
          payload.batchId = Number(userForm.batchId);
        } else if (userForm.role === "lecturer") {
          payload.name = userForm.title ? `${userForm.title} ${userForm.name}` : userForm.name;
          payload.email = userForm.email;
          payload.departmentId = Number(userForm.departmentId);
          payload.specialization = userForm.specialization;
          payload.maxHoursPerWeek = Number(userForm.maxHoursPerWeek);
          payload.universityAddress = userForm.universityAddress;
          payload.phoneNumber = userForm.phoneNumber;
        }
        await createUser(payload);
        setUserForm({ username: "", password: "", role: "student", batchId: batches[0]?.batchId || "", name: "", email: "", departmentId: departments[0]?.departmentId || "", specialization: "", maxHoursPerWeek: 20, universityAddress: "", phoneNumber: "", title: "Dr." });
      } else if (type === "lecturer") {
        const payload = {
          username: lecturerForm.username,
          password: lecturerForm.password,
          role: "lecturer",
          name: lecturerForm.title ? `${lecturerForm.title} ${lecturerForm.name}` : lecturerForm.name,
          email: lecturerForm.email,
          departmentId: Number(lecturerForm.departmentId),
          specialization: lecturerForm.specialization,
          maxHoursPerWeek: Number(lecturerForm.maxHoursPerWeek),
          universityAddress: lecturerForm.universityAddress,
          phoneNumber: lecturerForm.phoneNumber
        };
        await createUser(payload);
        const nonCompDepts = departments.filter(d => d.departmentCode !== "EC" && !d.departmentName?.toLowerCase().includes("computer"));
        setLecturerForm({ username: "", password: "", name: "", email: "", departmentId: nonCompDepts[0]?.departmentId || departments[0]?.departmentId || "", specialization: "", maxHoursPerWeek: 20, universityAddress: "", phoneNumber: "", title: "Dr." });
      } else if (type === "labschedule") {
        const selectedBatch = batches.find(b => String(b.batchId) === String(labForm.batchId));
        const isS12 = selectedBatch ? (selectedBatch.semester === 1 || selectedBatch.semester === 2) : true;
        const payload = {
          batchId: Number(labForm.batchId),
          dayOfWeek: labForm.dayOfWeek,
          startTime: labForm.startTime,
          endTime: labForm.endTime,
          departmentId: isS12 ? null : (labForm.departmentId ? Number(labForm.departmentId) : (departments[0]?.departmentId || null))
        };
        await createLabSchedule(payload);
        setLabForm({ batchId: batches[0]?.batchId || "", dayOfWeek: "Monday", startTime: "08:30", endTime: "10:30", departmentId: departments[0]?.departmentId?.toString() || "" });
      }
      await loadAllData();
      alert(`New ${type} created successfully!`);
    } catch (err) {
      alert("Failed to create: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      if (type === "batch") await deleteBatch(id);
      else if (type === "hall") await deleteHall(id);
      else if (type === "module") await deleteModule(id);
      else if (type === "timeslot") await deleteTimeSlot(id);
      else if (type === "user") await deleteUser(id);
      else if (type === "lecturer") await deleteLecturer(id);
      else if (type === "labschedule") await deleteLabSchedule(id);
      await loadAllData();
      alert(`${type} deleted successfully.`);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const startEdit = (id, currentData) => {
    setEditingId(id);
    setEditData({ ...currentData });
  };

  const handleUpdate = async (type, e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (type === "batch") {
        await updateBatch(editingId, editData);
      } else if (type === "hall") {
        await updateHall(editingId, editData);
      } else if (type === "module") {
        const { departmentId: _unused, ...editRest } = editData;
        const payload = { ...editRest };
        if (editData.departmentId) {
          payload.department = { departmentId: Number(editData.departmentId) };
        }
        await updateModule(editingId, payload);
      } else if (type === "timeslot") {
        await updateTimeSlot(editingId, editData);
      } else if (type === "user") {
        await updateUser(editingId, editData);
      } else if (type === "lecturer") {
        const payload = {
          name: editData.title ? `${editData.title} ${editData.name}` : editData.name,
          email: editData.email,
          maxHoursPerWeek: Number(editData.maxHoursPerWeek),
          specialization: editData.specialization,
          universityAddress: editData.universityAddress,
          phoneNumber: editData.phoneNumber,
          department: editData.departmentId ? { departmentId: Number(editData.departmentId) } : null
        };
        await updateLecturer(editingId, payload);
      }
      setEditingId(null);
      await loadAllData();
      alert(`${type} updated successfully!`);
    } catch (err) {
      alert("Update failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptimize = async () => {
    if (!selectedBatchId) {
      alert("Please select a batch first.");
      return;
    }
    const selectedBatch = batches.find(b => String(b.batchId) === String(selectedBatchId));
    const isDeptRequired = selectedBatch ? selectedBatch.semester >= 3 : false;
    
    if (isDeptRequired && !optDeptId) {
      alert("Please select a department for this batch.");
      return;
    }

    setOptimizing(true);
    try {
      await generateTimetable(Number(selectedBatchId), isDeptRequired ? Number(optDeptId) : null);
      const selectedBatchName = selectedBatch?.batchName || `Batch ${selectedBatchId}`;
      alert(`Timetable generated successfully for ${selectedBatchName}!`);
      router.push(`/timetable?batchId=${selectedBatchId}${isDeptRequired ? `&departmentId=${optDeptId}` : ""}`);
    } catch (err) {
      alert("Generation failed: " + err.message);
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <main className="page-content">
            <div className="empty-state" style={{ marginTop: 80 }}>
              <div className="empty-state-text">Loading Admin Panel...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              Home <span style={{ color: "var(--neutral-400)" }}>/</span> <span>Admin Dashboard</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          <div className="optimizer-hero" style={{ marginBottom: "24px" }}>
            <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Shield size={28} style={{ color: "#ffffff" }} />
              <span>Administrator Panel</span>
            </h1>
            <p>Manage system data and trigger AI timetable optimizer runs.</p>
          </div>
 
          {/* Metrics Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "20px",
            marginBottom: "32px"
          }}>
            <div className="card" style={{ padding: "20px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "linear-gradient(135deg, #0d9488, #0f766e)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", boxShadow: "0 4px 12px rgba(13,148,136,0.35)" }}>
                  <GraduationCap size={26} color="#ffffff" />
                </div>
              </div>
              <div style={{ fontSize: "24px", fontWeight: "700", margin: "8px 0" }}>{batches.length}</div>
              <div style={{ fontSize: "12px", color: "var(--neutral-500)", textTransform: "uppercase" }}>Batches</div>
            </div>
            <div className="card" style={{ padding: "20px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", boxShadow: "0 4px 12px rgba(37,99,235,0.35)" }}>
                  <Building size={26} color="#ffffff" />
                </div>
              </div>
              <div style={{ fontSize: "24px", fontWeight: "700", margin: "8px 0" }}>{halls.length}</div>
              <div style={{ fontSize: "12px", color: "var(--neutral-500)", textTransform: "uppercase" }}>Halls</div>
            </div>
            <div className="card" style={{ padding: "20px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", boxShadow: "0 4px 12px rgba(124,58,237,0.35)" }}>
                  <BookOpen size={26} color="#ffffff" />
                </div>
              </div>
              <div style={{ fontSize: "24px", fontWeight: "700", margin: "8px 0" }}>{modules.length}</div>
              <div style={{ fontSize: "12px", color: "var(--neutral-500)", textTransform: "uppercase" }}>Modules</div>
            </div>
            <div className="card" style={{ padding: "20px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "linear-gradient(135deg, #ea580c, #c2410c)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", boxShadow: "0 4px 12px rgba(234,88,12,0.35)" }}>
                  <User size={26} color="#ffffff" />
                </div>
              </div>
              <div style={{ fontSize: "24px", fontWeight: "700", margin: "8px 0" }}>{users.length}</div>
              <div style={{ fontSize: "12px", color: "var(--neutral-500)", textTransform: "uppercase" }}>Users</div>
            </div>
          </div>
 
          {/* Quick AI Optimizer Run */}
          <div className="card" style={{ marginBottom: "32px", background: "linear-gradient(135deg, var(--primary-900) 0%, var(--primary-700) 100%)", color: "#fff" }}>
            <div className="card-body" style={{ padding: "24px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "20px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Zap size={20} style={{ color: "var(--warning-400)" }} />
                  <span>AI Timetable Optimizer Run</span>
                </h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#fff",
                    outline: "none"
                  }}
                >
                  {batches.map(b => (
                    <option key={b.batchId} value={b.batchId} style={{ color: "#000" }}>
                      {b.batchName} (Semester {b.semester})
                    </option>
                  ))}
                </select>

                {(() => {
                  const selBatch = batches.find(b => String(b.batchId) === String(selectedBatchId));
                  if (selBatch && selBatch.semester >= 3) {
                    return (
                      <select
                        value={optDeptId}
                        onChange={(e) => setOptDeptId(e.target.value)}
                        style={{
                          padding: "10px 16px",
                          borderRadius: "var(--radius-sm)",
                          background: "rgba(255,255,255,0.15)",
                          border: "1px solid rgba(255,255,255,0.25)",
                          color: "#fff",
                          outline: "none"
                        }}
                      >
                        <option value="" style={{ color: "#000" }}>Select Department</option>
                        {departments.filter(d => d.departmentId !== 4).map(d => (
                          <option key={d.departmentId} value={d.departmentId} style={{ color: "#000" }}>
                            {d.departmentCode}
                          </option>
                        ))}
                      </select>
                    );
                  }
                  return null;
                })()}

                <button
                  onClick={handleOptimize}
                  disabled={optimizing}
                  className="btn"
                  style={{
                    background: "#fff",
                    color: "var(--primary-800)",
                    fontWeight: "700",
                    padding: "10px 24px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  {optimizing ? "Optimizing..." : "Generate Schedule"}
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: "flex", flexWrap: "wrap", borderBottom: "2px solid var(--neutral-200)", marginBottom: "24px", gap: "8px" }}>
            {["batches", "halls", "modules", "lecturers", "timeslots", "users", "lab schedules", "assign modules"].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setEditingId(null); }}
                style={{
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: "600",
                  textTransform: "capitalize",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: activeTab === tab ? "var(--primary-600)" : "var(--neutral-500)",
                  borderBottom: activeTab === tab ? "3px solid var(--primary-600)" : "3px solid transparent",
                  transition: "all var(--transition-base)",
                  marginBottom: "-2px"
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div className="card">
            <div className="card-body">

              {/* 1. BATCHES TAB */}
              {activeTab === "batches" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "32px", alignItems: "start" }}>
                    {/* List */}
                    <div>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>ID</th><th>Name</th><th>Year</th><th>Semester</th><th>Students</th><th>Status</th><th>Lunch Break</th><th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batches.slice().sort((a, b) => {
                            if (a.semester !== b.semester) {
                              return a.semester - b.semester;
                            }
                            return a.batchName.localeCompare(b.batchName);
                          }).map((b) => (
                            <tr key={b.batchId}>
                              <td>{b.batchId}</td>
                              <td>{editingId === b.batchId ? <input style={{ width: "80px" }} type="text" value={editData.batchName} onChange={e => setEditData({...editData, batchName: e.target.value})} /> : b.batchName}</td>
                              <td>{editingId === b.batchId ? <input style={{ width: "60px" }} type="number" value={editData.academicYear} onChange={e => setEditData({...editData, academicYear: Number(e.target.value)})} /> : b.academicYear}</td>
                              <td>{editingId === b.batchId ? <input style={{ width: "50px" }} type="number" value={editData.semester} onChange={e => setEditData({...editData, semester: Number(e.target.value)})} /> : b.semester}</td>
                              <td>{editingId === b.batchId ? <input style={{ width: "60px" }} type="number" value={editData.studentCount} onChange={e => setEditData({...editData, studentCount: Number(e.target.value)})} /> : b.studentCount}</td>
                              <td>{editingId === b.batchId ? (
                                <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>
                                  <option value="active">Active</option>
                                  <option value="inactive">Inactive</option>
                                  <option value="graduated">Graduated</option>
                                </select>
                              ) : <span className={`badge badge-${b.status === "active" ? "success" : "danger"}`}>{b.status}</span>}</td>
                              <td>
                                {editingId === b.batchId ? (
                                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                    <input style={{ width: "50px", padding: "4px" }} type="text" value={editData.lunchStartTime || ""} onChange={e => setEditData({...editData, lunchStartTime: e.target.value})} />
                                    <span>-</span>
                                    <input style={{ width: "50px", padding: "4px" }} type="text" value={editData.lunchEndTime || ""} onChange={e => setEditData({...editData, lunchEndTime: e.target.value})} />
                                  </div>
                                ) : (
                                  <span>{(b.lunchStartTime || "12:30") + " - " + (b.lunchEndTime || "13:30")}</span>
                                )}
                              </td>
                              <td>
                                {editingId === b.batchId ? (
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button onClick={(e) => handleUpdate("batch", e)} className="btn btn-sm btn-save">Save</button>
                                    <button onClick={() => setEditingId(null)} className="btn btn-sm btn-secondary">Cancel</button>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button onClick={() => startEdit(b.batchId, b)} className="btn btn-sm btn-edit">Edit</button>
                                    <button onClick={() => handleDelete("batch", b.batchId)} className="btn btn-sm btn-danger">Delete</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Add Form */}
                    <div style={{ background: "var(--neutral-50)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center" }}>
                        <Plus size={16} style={{ marginRight: "8px" }} />
                        <span>Add Academic Batch</span>
                      </h3>
                      <form onSubmit={(e) => handleCreate("batch", e)} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Batch Name</label>
                          <input type="text" placeholder="" value={batchForm.batchName} onChange={e => setBatchForm({...batchForm, batchName: e.target.value})} required style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Academic Year</label>
                          <input type="number" value={batchForm.academicYear} onChange={e => setBatchForm({...batchForm, academicYear: Number(e.target.value)})} required style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Semester (1-8)</label>
                          <input type="number" min="1" max="8" value={batchForm.semester} onChange={e => setBatchForm({...batchForm, semester: Number(e.target.value)})} required style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Student Count</label>
                          <input type="number" value={batchForm.studentCount} onChange={e => setBatchForm({...batchForm, studentCount: Number(e.target.value)})} required style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: "600" }}>Lunch Start</label>
                            <input type="text" placeholder="e.g. 12:30" value={batchForm.lunchStartTime} onChange={e => setBatchForm({...batchForm, lunchStartTime: e.target.value})} required style={{ width: "100%", padding: "8px" }} />
                          </div>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: "600" }}>Lunch End</label>
                            <input type="text" placeholder="e.g. 13:30" value={batchForm.lunchEndTime} onChange={e => setBatchForm({...batchForm, lunchEndTime: e.target.value})} required style={{ width: "100%", padding: "8px" }} />
                          </div>
                        </div>
                        

                        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", marginTop: "16px" }}>Add Batch</button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. HALLS TAB */}
              {activeTab === "halls" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "32px", alignItems: "start" }}>
                    {/* List */}
                    <div>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>ID</th><th>Hall Name</th><th>Capacity</th><th>Type</th><th>Active</th><th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {halls.map((h) => (
                            <tr key={h.hallId}>
                              <td>{h.hallId}</td>
                              <td>{editingId === h.hallId ? <input style={{ width: "80px" }} type="text" value={editData.hallName} onChange={e => setEditData({...editData, hallName: e.target.value})} /> : h.hallName}</td>
                              <td>{editingId === h.hallId ? <input style={{ width: "60px" }} type="number" value={editData.capacity} onChange={e => setEditData({...editData, capacity: Number(e.target.value)})} /> : h.capacity}</td>
                              <td>{editingId === h.hallId ? (
                                <select value={editData.hallType} onChange={e => setEditData({...editData, hallType: e.target.value})}>
                                  <option value="lecture">Lecture Hall</option>
                                  <option value="lab">Computer Lab</option>
                                  <option value="drawing">Drawing Office</option>
                                </select>
                              ) : h.hallType}</td>
                              <td>{editingId === h.hallId ? (
                                <input type="checkbox" checked={editData.isActive} onChange={e => setEditData({...editData, isActive: e.target.checked})} />
                              ) : <span className={`badge badge-${h.isActive ? "success" : "danger"}`}>{h.isActive ? "Yes" : "No"}</span>}</td>
                              <td>
                                {editingId === h.hallId ? (
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button onClick={(e) => handleUpdate("hall", e)} className="btn btn-sm btn-save">Save</button>
                                    <button onClick={() => setEditingId(null)} className="btn btn-sm btn-secondary">Cancel</button>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button onClick={() => startEdit(h.hallId, h)} className="btn btn-sm btn-edit">Edit</button>
                                    <button onClick={() => handleDelete("hall", h.hallId)} className="btn btn-sm btn-danger">Delete</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Add Form */}
                    <div style={{ background: "var(--neutral-50)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center" }}>
                        <Plus size={16} style={{ marginRight: "8px" }} />
                        <span>Add Lecture Hall</span>
                      </h3>
                      <form onSubmit={(e) => handleCreate("hall", e)} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Hall Name</label>
                          <input type="text" placeholder="e.g. Civil Theater" value={hallForm.hallName} onChange={e => setHallForm({...hallForm, hallName: e.target.value})} required style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Seating Capacity</label>
                          <input type="number" value={hallForm.capacity} onChange={e => setHallForm({...hallForm, capacity: Number(e.target.value)})} required style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Hall Type</label>
                          <select value={hallForm.hallType} onChange={e => setHallForm({...hallForm, hallType: e.target.value})} style={{ width: "100%", padding: "8px" }}>
                            <option value="lecture">Lecture Hall</option>
                            <option value="lab">Computer Lab</option>
                            <option value="drawing">Drawing Office</option>
                          </select>
                        </div>
                        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", marginTop: "8px" }}>Add Hall</button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. MODULES TAB */}
              {activeTab === "modules" && (
                <div>
                  {/* Batch & Department Selector Dropdowns */}
                  <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "20px", background: "var(--neutral-50)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--neutral-600)" }}>Filter by Academic Batch</label>
                      <select
                        value={moduleBatchFilterId}
                        onChange={(e) => {
                          setModuleBatchFilterId(e.target.value);
                          setAssignableModuleId("");
                        }}
                        style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)", outline: "none", minWidth: "220px" }}
                      >
                        <option value="all">All General Modules</option>
                        {batches.map(b => (
                          <option key={b.batchId} value={b.batchId}>
                            {b.batchName} (Semester {b.semester})
                          </option>
                        ))}
                      </select>
                    </div>
 
                    {(() => {
                      const selBatch = batches.find(b => String(b.batchId) === String(moduleBatchFilterId));
                      const isS12 = selBatch ? (selBatch.semester === 1 || selBatch.semester === 2) : false;
                      if (moduleBatchFilterId === "all" || !isS12) {
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--neutral-600)" }}>Filter by Department</label>
                            <select
                              value={moduleDeptFilterId}
                              onChange={(e) => setModuleDeptFilterId(e.target.value)}
                              style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)", outline: "none", minWidth: "200px" }}
                            >
                              <option value="">All Departments</option>
                              {departments.map(d => (
                                <option key={d.departmentId} value={d.departmentId}>
                                  {d.departmentName} ({d.departmentCode})
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
 
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "32px", alignItems: "start" }}>
                    {/* List */}
                    <div>
                      {moduleBatchFilterId === "all" ? (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Code</th><th>Name</th><th>Credits</th><th>Lec Hrs</th><th>Lab Hrs</th><th>Sem</th><th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modules.filter(m => {
                              if (!moduleDeptFilterId) return true;
                              return m.department && String(m.department.departmentId) === String(moduleDeptFilterId);
                            }).map((m) => (
                              <tr key={m.moduleId}>
                                <td>{editingId === m.moduleId ? <input style={{ width: "60px" }} type="text" value={editData.moduleCode} onChange={e => setEditData({...editData, moduleCode: e.target.value})} /> : m.moduleCode}</td>
                                <td>{editingId === m.moduleId ? <input style={{ width: "120px" }} type="text" value={editData.moduleName} onChange={e => setEditData({...editData, moduleName: e.target.value})} /> : m.moduleName}</td>
                                <td>{editingId === m.moduleId ? <input style={{ width: "40px" }} type="number" value={editData.creditHours} onChange={e => setEditData({...editData, creditHours: Number(e.target.value)})} /> : m.creditHours}</td>
                                <td>{editingId === m.moduleId ? <input style={{ width: "40px" }} type="number" value={editData.lectureHoursPerWeek} onChange={e => setEditData({...editData, lectureHoursPerWeek: Number(e.target.value)})} /> : m.lectureHoursPerWeek}</td>
                                <td>{editingId === m.moduleId ? <input style={{ width: "40px" }} type="number" value={editData.labHoursPerWeek} onChange={e => setEditData({...editData, labHoursPerWeek: Number(e.target.value)})} /> : m.labHoursPerWeek}</td>
                                <td>{editingId === m.moduleId ? <input style={{ width: "40px" }} type="number" value={editData.semester} onChange={e => setEditData({...editData, semester: Number(e.target.value)})} /> : m.semester}</td>
                                <td>
                                  {editingId === m.moduleId ? (
                                    <div style={{ display: "flex", gap: "6px" }}>
                                      <button onClick={(e) => handleUpdate("module", e)} className="btn btn-sm btn-save">Save</button>
                                      <button onClick={() => setEditingId(null)} className="btn btn-sm btn-secondary">Cancel</button>
                                    </div>
                                  ) : (
                                    <div style={{ display: "flex", gap: "6px" }}>
                                      <button onClick={() => startEdit(m.moduleId, m)} className="btn btn-sm btn-edit">Edit</button>
                                      <button onClick={() => handleDelete("module", m.moduleId)} className="btn btn-sm btn-danger">Delete</button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div>
                          {moduleBatchLoading ? (
                            <div style={{ padding: "40px", textAlign: "center", color: "var(--neutral-50)" }}>Loading batch modules...</div>
                          ) : moduleBatchModules.length === 0 ? (
                            <div style={{ padding: "40px", textAlign: "center", color: "var(--neutral-500)", border: "1px dashed var(--neutral-200)", borderRadius: "var(--radius-md)" }}>
                              No modules assigned to this batch yet. Use the sidebar to assign or create a module.
                            </div>
                          ) : (
                            <table className="data-table">
                               <thead>
                                <tr>
                                  <th>Code</th><th>Name</th><th>Credits</th><th>Lec Hrs</th><th>Lab Hrs</th><th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {moduleBatchModules.map((bm) => (
                                  <tr key={bm.batchModuleId}>
                                    <td><strong>{editingId === bm.moduleId ? <input style={{ width: "60px" }} type="text" value={editData.moduleCode} onChange={e => setEditData({...editData, moduleCode: e.target.value})} /> : bm.moduleCode}</strong></td>
                                    <td>{editingId === bm.moduleId ? <input style={{ width: "130px" }} type="text" value={editData.moduleName} onChange={e => setEditData({...editData, moduleName: e.target.value})} /> : bm.moduleName}</td>
                                    <td style={{ textAlign: "center" }}>{editingId === bm.moduleId ? <input style={{ width: "40px" }} type="number" value={editData.creditHours} onChange={e => setEditData({...editData, creditHours: Number(e.target.value)})} /> : bm.creditHours}</td>
                                    <td style={{ textAlign: "center" }}>{editingId === bm.moduleId ? <input style={{ width: "40px" }} type="number" value={editData.lectureHoursPerWeek} onChange={e => setEditData({...editData, lectureHoursPerWeek: Number(e.target.value)})} /> : bm.lectureHoursPerWeek}</td>
                                    <td style={{ textAlign: "center" }}>{editingId === bm.moduleId ? <input style={{ width: "40px" }} type="number" value={editData.labHoursPerWeek} onChange={e => setEditData({...editData, labHoursPerWeek: Number(e.target.value)})} /> : bm.labHoursPerWeek}</td>
                                    <td>
                                      {editingId === bm.moduleId ? (
                                        <div style={{ display: "flex", gap: "6px" }}>
                                          <button onClick={(e) => handleUpdate("module", e)} className="btn btn-sm btn-save">Save</button>
                                          <button onClick={() => setEditingId(null)} className="btn btn-sm btn-secondary">Cancel</button>
                                        </div>
                                      ) : (
                                        <div style={{ display: "flex", gap: "6px" }}>
                                          <button onClick={() => startEdit(bm.moduleId, { moduleCode: bm.moduleCode, moduleName: bm.moduleName, creditHours: bm.creditHours, lectureHoursPerWeek: bm.lectureHoursPerWeek, labHoursPerWeek: bm.labHoursPerWeek, semester: bm.semester })} className="btn btn-sm btn-edit">Edit</button>
                                          <button onClick={() => handleRemoveModuleFromBatch(bm.batchModuleId)} className="btn btn-sm btn-danger">Remove</button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
 
                    {/* Forms Column */}
                    <div>
                      {moduleBatchFilterId !== "all" && (
                        <div style={{ background: "var(--neutral-50)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", marginBottom: "20px" }}>
                          <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center" }}>
                            <Plus size={16} style={{ marginRight: "8px" }} />
                            <span>Assign Existing Module</span>
                          </h3>
                          <form onSubmit={handleAssignModuleToBatch} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div>
                              <label style={{ fontSize: "12px", fontWeight: "600" }}>Select Module</label>
                              <select 
                                value={assignableModuleId} 
                                onChange={e => setAssignableModuleId(e.target.value)} 
                                required 
                                style={{ width: "100%", padding: "8px" }}
                              >
                                <option value="">-- Choose Module --</option>
                                {(() => {
                                  const assignedModuleIds = new Set(moduleBatchModules.map(bm => bm.moduleId));
                                  return modules
                                    .filter(m => !assignedModuleIds.has(m.moduleId))
                                    .map(m => (
                                      <option key={m.moduleId} value={m.moduleId}>
                                        {m.moduleCode} - {m.moduleName}
                                      </option>
                                    ));
                                })()}
                              </select>
                            </div>
                            <button type="submit" disabled={submitting || !assignableModuleId} className="btn btn-primary" style={{ width: "100%", marginTop: "8px" }}>
                              Assign to Batch
                            </button>
                          </form>
                        </div>
                      )}
                      
                      <div style={{ background: "var(--neutral-50)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center" }}>
                          <Plus size={16} style={{ marginRight: "8px" }} />
                          <span>Add Module</span>
                        </h3>
                        <form onSubmit={(e) => handleCreate("module", e)} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div>
                            <label style={{ fontSize: "12px", fontWeight: "600" }}>Module Code</label>
                            <input type="text" placeholder="e.g. IS1003" value={moduleForm.moduleCode} onChange={e => setModuleForm({...moduleForm, moduleCode: e.target.value})} required style={{ width: "100%", padding: "8px" }} />
                          </div>
                          <div>
                            <label style={{ fontSize: "12px", fontWeight: "600" }}>Module Name</label>
                            <input type="text" placeholder="e.g. Signals & Systems" value={moduleForm.moduleName} onChange={e => setModuleForm({...moduleForm, moduleName: e.target.value})} required style={{ width: "100%", padding: "8px" }} />
                          </div>
                          <div>
                            <label style={{ fontSize: "12px", fontWeight: "600" }}>Credit Hours</label>
                            <input type="number" min="1" max="6" value={moduleForm.creditHours} onChange={e => setModuleForm({...moduleForm, creditHours: Number(e.target.value)})} required style={{ width: "100%", padding: "8px" }} />
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <div>
                              <label style={{ fontSize: "11px", fontWeight: "600" }}>Lec Hrs/Wk</label>
                              <input type="number" min="0" value={moduleForm.lectureHoursPerWeek} onChange={e => setModuleForm({...moduleForm, lectureHoursPerWeek: Number(e.target.value)})} required style={{ width: "100%", padding: "8px" }} />
                            </div>
                            <div>
                              <label style={{ fontSize: "11px", fontWeight: "600" }}>Lab Hrs/Wk</label>
                              <input type="number" min="0" value={moduleForm.labHoursPerWeek} onChange={e => setModuleForm({...moduleForm, labHoursPerWeek: Number(e.target.value)})} required style={{ width: "100%", padding: "8px" }} />
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: "12px", fontWeight: "600" }}>Semester (1-8)</label>
                            <input type="number" min="1" max="8" value={moduleForm.semester} onChange={e => setModuleForm({...moduleForm, semester: Number(e.target.value)})} required style={{ width: "100%", padding: "8px" }} />
                          </div>
                          <div>
                            <label style={{ fontSize: "12px", fontWeight: "600" }}>Department</label>
                            <select value={moduleForm.departmentId} onChange={e => setModuleForm({...moduleForm, departmentId: e.target.value})} style={{ width: "100%", padding: "8px" }}>
                              {departments.map(d => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
                            </select>
                          </div>
                          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", marginTop: "8px" }}>
                            Add Module
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3.5 LECTURERS TAB */}
              {activeTab === "lecturers" && (
                <div>
                  {/* Department Filter Selector */}
                  <div className="card" style={{ marginBottom: "20px", background: "var(--neutral-50)", border: "1px solid var(--neutral-200)" }}>
                    <div className="card-body" style={{ padding: "16px", display: "flex", gap: "16px", alignItems: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--neutral-600)" }}>Filter by Department</label>
                        <select
                          value={filterDeptId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFilterDeptId(val);
                            if (val !== "all") {
                              setLecturerForm(prev => ({ ...prev, departmentId: val }));
                            }
                          }}
                          style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)", outline: "none", minWidth: "250px" }}
                        >
                          <option value="all">All Departments</option>
                          {departments.filter(d => d.departmentCode !== "EC" && !d.departmentName?.toLowerCase().includes("computer")).map(d => (
                            <option key={d.departmentId} value={d.departmentId}>
                              {d.departmentName} ({d.departmentCode})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "32px", alignItems: "start" }}>
                    {/* List */}
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>University Email</th>
                            <th>Department</th>
                            <th>Max Hours</th>
                            <th>Phone Number</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lecturers
                            .filter(lec => filterDeptId === "all" || String(lec.department?.departmentId) === String(filterDeptId))
                            .map((lec) => (
                            <tr key={lec.lecturerId}>
                              <td>
                                {editingId === lec.lecturerId ? (
                                  <div style={{ display: "flex", gap: "4px" }}>
                                    <select value={editData.title || ""} onChange={e => setEditData({...editData, title: e.target.value})} style={{ padding: "4px" }}>
                                      <option value="">None</option>
                                      <option value="Dr.">Dr.</option>
                                      <option value="Prof.">Prof.</option>
                                      <option value="Mr.">Mr.</option>
                                      <option value="Mrs.">Mrs.</option>
                                      <option value="Ms.">Ms.</option>
                                    </select>
                                    <input style={{ width: "90px", padding: "4px" }} type="text" value={editData.name || ""} onChange={e => setEditData({...editData, name: e.target.value})} />
                                  </div>
                                ) : lec.name}
                              </td>
                              <td>
                                {editingId === lec.lecturerId ? (
                                  <input style={{ width: "130px" }} type="email" value={editData.email || ""} onChange={e => setEditData({...editData, email: e.target.value})} />
                                ) : lec.email}
                              </td>
                              <td>
                                {editingId === lec.lecturerId ? (
                                  <select value={editData.departmentId || (lec.department?.departmentId || "")} onChange={e => setEditData({...editData, departmentId: e.target.value})}>
                                    {departments.filter(d => d.departmentCode !== "EC" && !d.departmentName?.toLowerCase().includes("computer")).map(d => <option key={d.departmentId} value={d.departmentId}>{d.departmentCode}</option>)}
                                  </select>
                                ) : (lec.department?.departmentCode || "—")}
                              </td>
                              <td>
                                {editingId === lec.lecturerId ? (
                                  <input style={{ width: "60px" }} type="number" value={editData.maxHoursPerWeek || 20} onChange={e => setEditData({...editData, maxHoursPerWeek: Number(e.target.value)})} />
                                ) : lec.maxHoursPerWeek}
                              </td>
                              <td>
                                {editingId === lec.lecturerId ? (
                                  <input style={{ width: "110px" }} type="text" value={editData.phoneNumber || ""} onChange={e => setEditData({...editData, phoneNumber: e.target.value})} />
                                ) : (lec.phoneNumber || "—")}
                              </td>
                              <td>
                                {editingId === lec.lecturerId ? (
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button onClick={(e) => handleUpdate("lecturer", e)} className="btn btn-sm btn-save">Save</button>
                                    <button onClick={() => setEditingId(null)} className="btn btn-sm btn-secondary">Cancel</button>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button onClick={() => {
                                      let title = "Dr.";
                                      let restName = lec.name;
                                      const titles = ["Dr.", "Prof.", "Mr.", "Mrs.", "Ms."];
                                      for (const t of titles) {
                                        if (lec.name.startsWith(t + " ")) {
                                          title = t;
                                          restName = lec.name.substring(t.length + 1);
                                          break;
                                        }
                                      }
                                      startEdit(lec.lecturerId, {
                                        ...lec,
                                        title: title,
                                        name: restName,
                                        departmentId: lec.department?.departmentId || ""
                                      });
                                    }} className="btn btn-sm btn-edit">Edit</button>
                                    <button onClick={() => handleDelete("lecturer", lec.lecturerId)} className="btn btn-sm btn-danger">Delete</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Add Form */}
                    <div style={{ background: "var(--neutral-50)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center" }}>
                        <Plus size={16} style={{ marginRight: "8px" }} />
                        <span>Add Lecturer</span>
                      </h3>
                      <form onSubmit={(e) => handleCreate("lecturer", e)} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Username (for login)</label>
                          <input type="text" value={lecturerForm.username} onChange={e => setLecturerForm({...lecturerForm, username: e.target.value})} required style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Password</label>
                          <input type="password" placeholder="Password" value={lecturerForm.password} onChange={e => setLecturerForm({...lecturerForm, password: e.target.value})} required style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Title & Name</label>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <select value={lecturerForm.title || ""} onChange={e => setLecturerForm({...lecturerForm, title: e.target.value})} style={{ width: "90px", padding: "8px" }}>
                              <option value="">None</option>
                              <option value="Dr.">Dr.</option>
                              <option value="Prof.">Prof.</option>
                              <option value="Mr.">Mr.</option>
                              <option value="Mrs.">Mrs.</option>
                              <option value="Ms.">Ms.</option>
                            </select>
                            <input type="text" placeholder="Full Name" value={lecturerForm.name} onChange={e => setLecturerForm({...lecturerForm, name: e.target.value})} required style={{ flex: 1, padding: "8px" }} />
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>University Email</label>
                          <input type="email" value={lecturerForm.email} onChange={e => setLecturerForm({...lecturerForm, email: e.target.value})} required style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Department</label>
                          <select value={lecturerForm.departmentId} onChange={e => setLecturerForm({...lecturerForm, departmentId: e.target.value})} style={{ width: "100%", padding: "8px" }} required>
                            {departments.filter(d => d.departmentCode !== "EC" && !d.departmentName?.toLowerCase().includes("computer")).map(d => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Max Hours Per Week</label>
                          <input type="number" min="1" max="40" value={lecturerForm.maxHoursPerWeek} onChange={e => setLecturerForm({...lecturerForm, maxHoursPerWeek: Number(e.target.value)})} required style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Phone Number</label>
                          <input type="text" placeholder="+94 77 123 4567" value={lecturerForm.phoneNumber} onChange={e => setLecturerForm({...lecturerForm, phoneNumber: e.target.value})} style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", marginTop: "8px" }}>Add Lecturer</button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. TIME SLOTS TAB */}
              {activeTab === "timeslots" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "32px", alignItems: "start" }}>
                    {/* List */}
                    <div>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>ID</th><th>Day</th><th>Start Time</th><th>End Time</th><th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timeslots.map((ts) => (
                            <tr key={ts.slotId}>
                              <td>{ts.slotId}</td>
                              <td>{editingId === ts.slotId ? (
                                <select value={editData.dayOfWeek} onChange={e => setEditData({...editData, dayOfWeek: e.target.value})}>
                                  <option value="Monday">Monday</option>
                                  <option value="Tuesday">Tuesday</option>
                                  <option value="Wednesday">Wednesday</option>
                                  <option value="Thursday">Thursday</option>
                                  <option value="Friday">Friday</option>
                                </select>
                              ) : ts.dayOfWeek}</td>
                              <td>{editingId === ts.slotId ? <input style={{ width: "85px" }} type="text" value={editData.startTime} onChange={e => setEditData({...editData, startTime: e.target.value})} /> : ts.startTime}</td>
                              <td>{editingId === ts.slotId ? <input style={{ width: "85px" }} type="text" value={editData.endTime} onChange={e => setEditData({...editData, endTime: e.target.value})} /> : ts.endTime}</td>
                              <td>
                                {editingId === ts.slotId ? (
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button onClick={(e) => handleUpdate("timeslot", e)} className="btn btn-sm btn-save">Save</button>
                                    <button onClick={() => setEditingId(null)} className="btn btn-sm btn-secondary">Cancel</button>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button onClick={() => startEdit(ts.slotId, ts)} className="btn btn-sm btn-edit">Edit</button>
                                    <button onClick={() => handleDelete("timeslot", ts.slotId)} className="btn btn-sm btn-danger">Delete</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Add Form */}
                    <div style={{ background: "var(--neutral-50)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center" }}>
                        <Plus size={16} style={{ marginRight: "8px" }} />
                        <span>Add Time Slot</span>
                      </h3>
                      <form onSubmit={(e) => handleCreate("timeslot", e)} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Day of Week</label>
                          <select value={timeslotForm.dayOfWeek} onChange={e => setTimeslotForm({...timeslotForm, dayOfWeek: e.target.value})} style={{ width: "100%", padding: "8px" }}>
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>Start Time</label>
                          <input type="text" placeholder="e.g. 08:30" value={timeslotForm.startTime} onChange={e => setTimeslotForm({...timeslotForm, startTime: e.target.value})} required style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", fontWeight: "600" }}>End Time</label>
                          <input type="text" placeholder="e.g. 10:30" value={timeslotForm.endTime} onChange={e => setTimeslotForm({...timeslotForm, endTime: e.target.value})} required style={{ width: "100%", padding: "8px" }} />
                        </div>
                        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", marginTop: "8px" }}>Add Slot</button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. USERS TAB */}
              {activeTab === "users" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "32px", alignItems: "start" }}>
                    {/* List */}
                    <div>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>ID</th><th>Username</th><th>Role</th><th>Active</th><th>Batch ID</th><th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.userId}>
                              <td>{u.userId}</td>
                              <td>{editingId === u.userId ? <input style={{ width: "90px" }} type="text" value={editData.username} onChange={e => setEditData({...editData, username: e.target.value})} /> : u.username}</td>
                              <td>{editingId === u.userId ? (
                                <select value={editData.role} onChange={e => setEditData({...editData, role: e.target.value})}>
                                  <option value="admin">Admin</option>
                                  <option value="student">Student</option>
                                  <option value="lecturer">Lecturer</option>
                                </select>
                              ) : <span className={`badge badge-${u.role === "admin" ? "secondary" : u.role === "lecturer" ? "info" : "success"}`}>{u.role}</span>}</td>
                              <td>{editingId === u.userId ? (
                                <input type="checkbox" checked={editData.isActive} onChange={e => setEditData({...editData, isActive: e.target.checked})} />
                              ) : <span className={`badge badge-${u.isActive ? "success" : "danger"}`}>{u.isActive ? "Active" : "Disabled"}</span>}</td>
                              <td>{u.role === "student" ? (editingId === u.userId ? <input style={{ width: "50px" }} type="number" value={editData.batchId || ""} onChange={e => setEditData({...editData, batchId: Number(e.target.value)})} /> : (u.batchId || "—")) : "—"}</td>
                              <td>
                                {editingId === u.userId ? (
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button onClick={(e) => handleUpdate("user", e)} className="btn btn-sm btn-save">Save</button>
                                    <button onClick={() => setEditingId(null)} className="btn btn-sm btn-secondary">Cancel</button>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button onClick={() => startEdit(u.userId, u)} className="btn btn-sm btn-edit">Edit</button>
                                    <button onClick={() => handleDelete("user", u.userId)} className="btn btn-sm btn-danger">Delete</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Add Form */}
                    <div style={{ background: "var(--neutral-50)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center" }}>
                        <Plus size={16} style={{ marginRight: "8px" }} />
                        <span>Create User Account</span>
                      </h3>
                      <form onSubmit={(e) => handleCreate("user", e)} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "600" }}>Username</label>
                          <input type="text" placeholder="Username" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} required style={{ width: "100%", padding: "6px" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "600" }}>Password</label>
                          <input type="password" placeholder="Password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} required style={{ width: "100%", padding: "6px" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "600" }}>Role</label>
                          <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} style={{ width: "100%", padding: "6px" }}>
                            <option value="student">Student</option>
                            <option value="lecturer">Lecturer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        
                        {/* Student field */}
                        {userForm.role === "student" && (
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: "600" }}>Batch</label>
                            <select value={userForm.batchId} onChange={e => setUserForm({...userForm, batchId: e.target.value})} style={{ width: "100%", padding: "6px" }}>
                              {batches.map(b => <option key={b.batchId} value={b.batchId}>{b.batchName}</option>)}
                            </select>
                          </div>
                        )}

                        {/* Lecturer fields */}
                        {userForm.role === "lecturer" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div>
                              <label style={{ fontSize: "11px", fontWeight: "600" }}>Title & Name</label>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <select value={userForm.title || ""} onChange={e => setUserForm({...userForm, title: e.target.value})} style={{ width: "85px", padding: "6px" }}>
                                  <option value="">None</option>
                                  <option value="Dr.">Dr.</option>
                                  <option value="Prof.">Prof.</option>
                                  <option value="Mr.">Mr.</option>
                                  <option value="Mrs.">Mrs.</option>
                                  <option value="Ms.">Ms.</option>
                                </select>
                                <input type="text" placeholder="Full Name" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} required style={{ flex: 1, padding: "6px" }} />
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: "11px", fontWeight: "600" }}>Email</label>
                              <input type="email" placeholder="john@uni.com" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} required style={{ width: "100%", padding: "6px" }} />
                            </div>
                            <div>
                              <label style={{ fontSize: "11px", fontWeight: "600" }}>Department</label>
                              <select value={userForm.departmentId} onChange={e => setUserForm({...userForm, departmentId: e.target.value})} style={{ width: "100%", padding: "6px" }}>
                                {departments.map(d => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: "11px", fontWeight: "600" }}>Specialization</label>
                              <input type="text" placeholder="Algorithms" value={userForm.specialization} onChange={e => setUserForm({...userForm, specialization: e.target.value})} style={{ width: "100%", padding: "6px" }} />
                            </div>
                            <div>
                              <label style={{ fontSize: "11px", fontWeight: "600" }}>University Address</label>
                              <input type="text" placeholder="Faculty of Engineering" value={userForm.universityAddress} onChange={e => setUserForm({...userForm, universityAddress: e.target.value})} style={{ width: "100%", padding: "6px" }} />
                            </div>
                            <div>
                              <label style={{ fontSize: "11px", fontWeight: "600" }}>Phone Number</label>
                              <input type="text" placeholder="+94 71 234 5678" value={userForm.phoneNumber} onChange={e => setUserForm({...userForm, phoneNumber: e.target.value})} style={{ width: "100%", padding: "6px" }} />
                            </div>
                          </div>
                        )}
                        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", marginTop: "8px" }}>Create User</button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
              {/* 6. LAB SCHEDULES TAB */}
              {activeTab === "lab schedules" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
                  
                  {/* Collapsible/Neat Actions Header */}
                  <div className="card" style={{ background: "var(--neutral-50)", border: "1px solid var(--neutral-200)" }}>
                    <div className="card-body" style={{ padding: "20px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center" }}>
                        <FlaskConical size={16} style={{ marginRight: "8px" }} />
                        <span>Add Lab</span>
                      </h3>
                      <form onSubmit={(e) => handleCreate("labschedule", e)} style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "end" }}>
                        <div style={{ flex: "1 1 200px" }}>
                          <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Batch</label>
                          <select value={labForm.batchId} onChange={e => {
                            const val = e.target.value;
                            const sel = batches.find(b => String(b.batchId) === String(val));
                            const isS12 = sel ? (sel.semester === 1 || sel.semester === 2) : true;
                            setLabForm({
                              ...labForm,
                              batchId: val,
                              departmentId: isS12 ? "" : (labForm.departmentId && labForm.departmentId !== "" ? labForm.departmentId : (departments[0]?.departmentId?.toString() || ""))
                            });
                          }} style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)" }} required>
                            {batches.map(b => <option key={b.batchId} value={b.batchId}>{b.batchName} (Semester {b.semester})</option>)}
                          </select>
                        </div>
                        <div style={{ flex: "1 1 200px" }}>
                          <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Department</label>
                          {(() => {
                            const selBatch = batches.find(b => String(b.batchId) === String(labForm.batchId));
                            const isS12 = selBatch ? (selBatch.semester === 1 || selBatch.semester === 2) : true;
                            return isS12 ? (
                              <select disabled value="" style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-200)", background: "rgba(255, 255, 255, 0.05)", cursor: "not-allowed" }}>
                                <option value="">None (All Departments)</option>
                              </select>
                            ) : (
                              <select value={labForm.departmentId || (departments[0]?.departmentId || "")} onChange={e => setLabForm({...labForm, departmentId: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)" }} required>
                                {departments.map(d => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
                              </select>
                            );
                          })()}
                        </div>
                        <div style={{ flex: "1 1 150px" }}>
                          <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Day of Week</label>
                          <select value={labForm.dayOfWeek} onChange={e => setLabForm({...labForm, dayOfWeek: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)" }} required>
                            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(day => <option key={day} value={day}>{day}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: "1 1 180px" }}>
                          <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Quick Time Range</label>
                          <select 
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                const [s, endT] = val.split("-");
                                setLabForm(prev => ({ ...prev, startTime: s, endTime: endT }));
                              }
                            }} 
                            style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)" }}
                          >
                            <option value="">Select Preset Range...</option>
                            <option value="08:30-10:30">Morning 1 (08:30 - 10:30)</option>
                            <option value="10:30-12:30">Morning 2 (10:30 - 12:30)</option>
                            <option value="08:30-12:30">Full Morning Lab (08:30 - 12:30)</option>
                            <option value="13:30-15:30">Afternoon 1 (13:30 - 15:30)</option>
                            <option value="15:30-17:30">Afternoon 2 (15:30 - 17:30)</option>
                            <option value="13:30-17:30">Full Afternoon Lab (13:30 - 17:30)</option>
                            <option value="08:30-16:30">Full Day Lab (08:30 - 16:30)</option>
                          </select>
                        </div>
                        <div style={{ flex: "1 1 130px" }}>
                          <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Start Time</label>
                          <select 
                            value={labForm.startTime} 
                            onChange={e => setLabForm({...labForm, startTime: e.target.value})} 
                            required 
                            style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)" }}
                          >
                            {["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: "1 1 130px" }}>
                          <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>End Time</label>
                          <select 
                            value={labForm.endTime} 
                            onChange={e => setLabForm({...labForm, endTime: e.target.value})} 
                            required 
                            style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)" }}
                          >
                            {["09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: "1 1 150px" }}>
                          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "9px" }}>Add Lab</button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Batch Grouped Cards Grid */}
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", color: "var(--neutral-800)", display: "flex", alignItems: "center" }}>
                      <FlaskConical size={18} style={{ marginRight: "8px" }} />
                      <span>Fixed Lab Slots per Batch</span>
                    </h3>
                    {labs.length === 0 ? (
                      <div className="empty-state" style={{ padding: "40px" }}>
                        <div className="empty-state-text">No fixed lab schedules configured yet.</div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                        {batches.map((batch) => {
                          const batchLabs = labs.filter(lab => String(lab.batch?.batchId) === String(batch.batchId));
                          if (batchLabs.length === 0) return null;
                          return (
                            <div className="card" key={batch.batchId} style={{ border: "1px solid var(--neutral-200)" }}>
                              <div className="card-body" style={{ padding: "20px" }}>
                                <h4 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px", color: "var(--primary-700)", borderBottom: "1px solid var(--neutral-200)", paddingBottom: "8px" }}>
                                  🎓 {batch.batchName} (Semester {batch.semester})
                                </h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                  {batchLabs.map((lab) => (
                                    <div key={lab.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--neutral-50)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-100)" }}>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                          <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", padding: "2px 6px", borderRadius: "var(--radius-sm)", color: lab.department ? "var(--primary-800)" : "var(--neutral-800)", background: lab.department ? "var(--primary-100)" : "var(--neutral-200)" }}>
                                            {lab.department ? lab.department.departmentCode : "All Depts"}
                                          </span>
                                          <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--neutral-800)" }}>{lab.dayOfWeek}</span>
                                        </div>
                                        <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontWeight: "500" }}>⏰ {lab.startTime.substring(0, 5)} - {lab.endTime.substring(0, 5)}</span>
                                      </div>
                                      <button onClick={() => handleDelete("labschedule", lab.id)} className="btn btn-danger btn-xs" style={{ minWidth: "auto", padding: "6px 10px" }}>Delete</button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* 7. ASSIGN MODULES TAB */}
              {activeTab === "assign modules" && (
                <div>
                  <div className="card" style={{ marginBottom: "20px", background: "var(--neutral-50)", border: "1px solid var(--neutral-200)" }}>
                    <div className="card-body" style={{ padding: "16px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--neutral-600)" }}>Select Batch</label>
                        <select
                          value={assignBatchId}
                          onChange={(e) => setAssignBatchId(e.target.value)}
                          style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)", outline: "none", minWidth: "200px" }}
                        >
                          {batches.map(b => (
                            <option key={b.batchId} value={b.batchId}>
                              {b.batchName} (Semester {b.semester})
                            </option>
                          ))}
                        </select>
                      </div>

                      {(() => {
                        const selBatch = batches.find(b => String(b.batchId) === String(assignBatchId));
                        if (selBatch && selBatch.semester >= 3) {
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--neutral-600)" }}>Select Department</label>
                              <select
                                value={assignDeptId}
                                onChange={(e) => setAssignDeptId(e.target.value)}
                                style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)", outline: "none", minWidth: "200px" }}
                              >
                                <option value="all">All Departments</option>
                                {departments.map(d => (
                                  <option key={d.departmentId} value={d.departmentId}>
                                    {d.departmentName} ({d.departmentCode})
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-body">
                      <h3 className="card-title" style={{ display: "flex", alignItems: "center" }}>
                        <BookOpen size={18} style={{ marginRight: "8px", color: "var(--primary-600)" }} />
                        <span>Module Assignments</span>
                      </h3>
                      <p style={{ fontSize: "13px", color: "var(--neutral-500)", marginBottom: "16px" }}>
                        Assign a lecturer and preferred venue/hall for each course module. The AI Optimizer will strictly satisfy these options.
                      </p>

                      {assignLoading ? (
                        <div style={{ padding: "32px", textAlign: "center", color: "var(--neutral-500)" }}>
                          Loading module assignments...
                        </div>
                      ) : batchModules.length === 0 ? (
                        <div className="empty-state" style={{ padding: "40px" }}>
                          <div className="empty-state-text">No modules found for this batch/department.</div>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginBottom: "16px" }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ display: "flex", alignItems: "center", gap: "6px" }}
                              onClick={async () => {
                                if (!assignBatchId) return;
                                try {
                                  await autoLinkSharedModules(assignBatchId);
                                  alert("Shared modules have been automatically detected and linked across departments!");
                                  await loadBatchModules(assignBatchId, assignDeptId);
                                } catch (err) {
                                  alert("Error auto-linking shared modules: " + err.message);
                                }
                              }}
                            >
                              <Zap size={14} />
                              <span>Auto-Link Shared Modules</span>
                            </button>
                            <button 
                              className="btn btn-primary" 
                              onClick={handleSaveAllAssignments}
                              disabled={Object.keys(changedAssignments).length === 0}
                            >
                              Save All Changes
                            </button>
                          </div>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Code</th>
                                <th>Module Name</th>
                                <th>Credit Hours</th>
                                <th>Weekly Lec Hours</th>
                                <th>Lecturer</th>
                                <th>Preferred Venue (Hall)</th>
                                <th>Shared / Linked Module</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {batchModules.map((bm) => {
                                const currentLecIds = changedAssignments[bm.batchModuleId]?.lecturerIds !== undefined
                                  ? changedAssignments[bm.batchModuleId].lecturerIds
                                  : (bm.lecturerIds || (bm.lecturerId ? [bm.lecturerId] : []));
                                const currentHallId = changedAssignments[bm.batchModuleId]?.preferredHallId !== undefined
                                  ? changedAssignments[bm.batchModuleId].preferredHallId
                                  : bm.preferredHallId;

                                return (
                                  <tr key={bm.batchModuleId}>
                                    <td><strong>{bm.moduleCode}</strong></td>
                                    <td>{bm.moduleName}</td>
                                    <td>{bm.creditHours}</td>
                                    <td>{bm.lectureHoursPerWeek}</td>
                                    <td>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                                        {currentLecIds.map(lecId => {
                                          const lec = lecturers.find(l => l.lecturerId === lecId);
                                          if (!lec) return null;
                                          return (
                                            <span key={lecId} style={{ 
                                              display: "inline-flex", 
                                              alignItems: "center", 
                                              gap: "6px", 
                                              background: "var(--primary-50)", 
                                              color: "var(--primary-700)", 
                                              padding: "4px 10px", 
                                              borderRadius: "16px", 
                                              fontSize: "12px",
                                              fontWeight: "600",
                                              border: "1px solid var(--primary-100)"
                                            }}>
                                              {lec.name}
                                              <span 
                                                onClick={() => {
                                                  const updated = currentLecIds.filter(id => id !== lecId);
                                                  setChangedAssignments(prev => ({
                                                    ...prev,
                                                    [bm.batchModuleId]: {
                                                      ...prev[bm.batchModuleId],
                                                      lecturerIds: updated
                                                    }
                                                  }));
                                                }}
                                                style={{ cursor: "pointer", marginLeft: "4px", fontSize: "14px", fontWeight: "bold", color: "var(--primary-500)" }}
                                                title="Remove lecturer"
                                              >
                                                &times;
                                              </span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                      <select
                                        value=""
                                        onChange={(e) => {
                                          if (!e.target.value) return;
                                          const val = Number(e.target.value);
                                          if (!currentLecIds.includes(val)) {
                                            const updated = [...currentLecIds, val];
                                            setChangedAssignments(prev => ({
                                              ...prev,
                                              [bm.batchModuleId]: {
                                                ...prev[bm.batchModuleId],
                                                lecturerIds: updated
                                              }
                                            }));
                                          }
                                        }}
                                        style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)", width: "100%", maxWidth: "200px", fontSize: "13px" }}
                                      >
                                        <option value="">+ Add Lecturer...</option>
                                        {(() => {
                                          // Filter to selected department and IS department (or EE + IS for Computer Dept)
                                          const selectedDept = departments.find(d => String(d.departmentId) === String(assignDeptId));
                                          const isComputerDept = selectedDept?.departmentCode === "EC" || String(assignDeptId) === "6";

                                          const deptFiltered = lecturers.filter(lec => {
                                            if (currentLecIds.includes(lec.lecturerId)) return false;
                                            if (!assignDeptId) return true; // Show all for semesters 1-2
                                            const lecDeptId = lec.department?.departmentId;
                                            const lecDeptCode = lec.department?.departmentCode;

                                            if (isComputerDept) {
                                              return lecDeptCode === "EE" || lecDeptId === 2 || lecDeptCode === "IS" || lecDeptId === 4;
                                            }

                                            return lecDeptId === Number(assignDeptId) || String(lecDeptId) === String(assignDeptId) || lecDeptId === 4 || lecDeptCode === "IS";
                                          });
                                          return deptFiltered.map(lec => (
                                             <option key={lec.lecturerId} value={lec.lecturerId}>
                                               {lec.name} ({lec.department?.departmentCode || "N/A"})
                                             </option>
                                           ));
                                        })()}
                                      </select>
                                    </td>
                                    <td>
                                      <select
                                        value={currentHallId || ""}
                                        onChange={(e) => {
                                          const val = e.target.value ? Number(e.target.value) : null;
                                          setChangedAssignments(prev => ({
                                            ...prev,
                                            [bm.batchModuleId]: {
                                              ...prev[bm.batchModuleId],
                                              preferredHallId: val
                                            }
                                          }));
                                        }}
                                        style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)", width: "100%", maxWidth: "200px" }}
                                      >
                                        <option value="">Any Hall / No Preference</option>
                                        {halls.map(hall => (
                                          <option key={hall.hallId} value={hall.hallId}>
                                            {hall.hallName} (Cap: {hall.capacity})
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                                          <input 
                                            type="checkbox" 
                                            checked={
                                              changedAssignments[bm.batchModuleId]?.isShared !== undefined 
                                                ? changedAssignments[bm.batchModuleId].isShared 
                                                : (bm.isShared || false)
                                            }
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              setChangedAssignments(prev => ({
                                                ...prev,
                                                [bm.batchModuleId]: {
                                                  ...prev[bm.batchModuleId],
                                                  isShared: checked
                                                }
                                              }));
                                            }}
                                          />
                                          Shared Module
                                        </label>
                                        {(changedAssignments[bm.batchModuleId]?.isShared !== undefined ? changedAssignments[bm.batchModuleId].isShared : bm.isShared) && (
                                           <select 
                                             value={
                                               changedAssignments[bm.batchModuleId]?.linkedBatchModuleId !== undefined 
                                                 ? (changedAssignments[bm.batchModuleId].linkedBatchModuleId || "") 
                                                 : (bm.linkedBatchModuleId || "")
                                             }
                                             onChange={(e) => {
                                               const val = e.target.value ? Number(e.target.value) : null;
                                               setChangedAssignments(prev => ({
                                                 ...prev,
                                                 [bm.batchModuleId]: {
                                                   ...prev[bm.batchModuleId],
                                                   linkedBatchModuleId: val
                                                 }
                                               }));
                                             }}
                                             style={{ padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral-300)", width: "100%", maxWidth: "220px", fontSize: "12px", outline: "none" }}
                                           >
                                             <option value="">-- Select Module to Link --</option>
                                             {allBatchModules
                                               .filter(item => item.batchModuleId !== bm.batchModuleId)
                                               .map(item => (
                                                 <option key={item.batchModuleId} value={item.batchModuleId}>
                                                   {item.moduleCode} - {item.moduleName}
                                                 </option>
                                               ))
                                             }
                                           </select>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <div style={{ display: "flex", gap: "6px" }}>
                                        <button
                                          onClick={async () => {
                                            if (confirm(`Are you sure you want to remove ${bm.moduleCode} assignment from this batch?`)) {
                                              try {
                                                await removeModuleFromBatch(Number(assignBatchId), bm.batchModuleId);
                                                alert("Assignment deleted successfully!");
                                                loadBatchModules(assignBatchId, assignDeptId);
                                              } catch (err) {
                                                alert("Failed to delete assignment: " + err.message);
                                              }
                                            }
                                          }}
                                          className="btn btn-danger btn-sm"
                                        >
                                          Delete
                                        </button>
                                      </div>
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
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
