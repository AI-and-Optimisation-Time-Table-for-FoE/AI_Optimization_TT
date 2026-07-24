"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchBatches, fetchDepartments, register } from "../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  
  // Shared name & email fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [universityEmail, setUniversityEmail] = useState("");

  // Student fields
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [batchId, setBatchId] = useState("");
  const [batches, setBatches] = useState([]);

  // Lecturer fields
  const [title, setTitle] = useState("Dr.");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch batches and departments for forms
    fetchBatches()
      .then((data) => {
        setBatches(data);
        if (data.length > 0) {
          const firstBatch = data[0];
          setBatchId(firstBatch.batchId.toString());
          if (firstBatch.semester === 1 || firstBatch.semester === 2) {
            setDepartmentId("none");
          }
        }
      })
      .catch((err) => console.error("Could not fetch batches:", err));

    fetchDepartments()
      .then((data) => {
        setDepartments(data);
        if (data.length > 0) {
          const firstBatch = batches[0];
          const isS12 = firstBatch ? (firstBatch.semester === 1 || firstBatch.semester === 2) : true;
          if (!isS12) {
            setDepartmentId(data[0].departmentId.toString());
          }
        }
      })
      .catch((err) => console.error("Could not fetch departments:", err));
  }, [batches.length]);

  const handleBatchChange = (val) => {
    setBatchId(val);
    const selected = batches.find((b) => String(b.batchId) === String(val));
    if (selected && (selected.semester === 1 || selected.semester === 2)) {
      setDepartmentId("none");
    } else {
      if (departmentId === "none") {
        setDepartmentId(departments[0]?.departmentId?.toString() || "");
      }
    }
  };

  const studentDepartments = useMemo(() => {
    return departments.filter(d => 
      d.departmentCode !== "IS" && 
      !d.departmentName?.toLowerCase().includes("information system") && 
      !d.departmentName?.toLowerCase().includes("interdisciplinary")
    );
  }, [departments]);

  const selectedBatchObj = useMemo(() => {
    return batches.find(b => String(b.batchId) === String(batchId));
  }, [batches, batchId]);

  const isSem1Or2 = useMemo(() => {
    return selectedBatchObj ? (selectedBatchObj.semester === 1 || selectedBatchObj.semester === 2) : true;
  }, [selectedBatchObj]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !universityEmail || !password) {
      setError("First name, last name, university email, and password are required.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    // Username is automatically set to the University Email Address!
    const username = universityEmail.trim();

    const payload = {
      username,
      password,
      role: role.toUpperCase(),
      firstName,
      lastName,
      universityEmail: universityEmail.trim(),
    };

    if (role === "student") {
      if (!batchId) {
        setError("Please select a batch.");
        setLoading(false);
        return;
      }
      payload.batchId = Number(batchId);
      payload.studentIdNumber = studentIdNumber ? studentIdNumber.trim() : null;
      if (!isSem1Or2 && (!departmentId || departmentId === "none")) {
        setError("Please select your department.");
        setLoading(false);
        return;
      }
      payload.departmentId = isSem1Or2 ? null : Number(departmentId);
    } else if (role === "lecturer") {
      if (!departmentId) {
        setError("Please select your department.");
        setLoading(false);
        return;
      }
      payload.title = title;
      payload.email = universityEmail.trim();
      payload.departmentId = Number(departmentId);
    }

    try {
      await register(payload);
      setSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      fontFamily: "'Inter', sans-serif",
      padding: '40px 20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(22, 163, 74, 0.15)',
        width: '100%',
        maxWidth: '540px',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative top border */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'var(--primary-600)' }}></div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <img src="/logo.jpg" alt="University Logo" style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '16px', borderRadius: '12px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#171717', margin: '0 0 8px 0', textAlign: 'center' }}>
            Create an Account
          </h1>
          <p style={{ fontSize: '14px', color: '#737373', margin: 0, textAlign: 'center' }}>
            Join the Timetable Management System
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '24px', textAlign: 'center', fontWeight: '500' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '24px', textAlign: 'center', fontWeight: '500' }}>
            {success}
          </div>
        )}

        {/* Role Toggle */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '6px', marginBottom: '32px' }}>
          <button 
            onClick={() => setRole("student")}
            type="button"
            style={{
              flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
              background: role === "student" ? '#ffffff' : 'transparent',
              color: role === "student" ? 'var(--primary-600)' : '#64748b',
              boxShadow: role === "student" ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            I am a Student
          </button>
          <button 
            onClick={() => setRole("lecturer")}
            type="button"
            style={{
              flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
              background: role === "lecturer" ? '#ffffff' : 'transparent',
              color: role === "lecturer" ? 'var(--primary-600)' : '#64748b',
              boxShadow: role === "lecturer" ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            I am a Lecturer
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Shared Fields */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#404040', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#404040', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#404040', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>University Email</label>
            <input type="email" value={universityEmail} onChange={(e) => setUniversityEmail(e.target.value)} disabled={loading} placeholder={role === "student" ? "student@eie.ruh.ac.lk" : "lecture@eie.ruh.ac.lk"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#404040', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} placeholder="••••••••" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          {/* Role Specific Fields */}
          {role === "student" && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#404040', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student Registration ID Number</label>
                <input type="text" value={studentIdNumber} onChange={(e) => setStudentIdNumber(e.target.value)} disabled={loading} placeholder="e.g. EG/2021/4015" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#404040', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Batch</label>
                  <select value={batchId} onChange={(e) => handleBatchChange(e.target.value)} disabled={loading} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
                    {batches.map(b => (
                      <option key={b.batchId} value={b.batchId}>{b.batchName} (Sem {b.semester})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, opacity: isSem1Or2 ? 0.5 : 1, pointerEvents: isSem1Or2 ? 'none' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#404040', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</label>
                  <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} disabled={loading || isSem1Or2} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
                    <option value="none" disabled={!isSem1Or2}>Common Core</option>
                    {!isSem1Or2 && studentDepartments.map(d => (
                      <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {role === "lecturer" && (
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '100px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#404040', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title</label>
                <select value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#404040', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</label>
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} disabled={loading} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--primary-600)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '12px',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              transition: 'transform 0.1s, background 0.2s',
              opacity: loading ? 0.8 : 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = 'var(--primary-700)')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.background = 'var(--primary-600)')}
            onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
          >
            {loading ? (
              <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            ) : "Create Account"}
          </button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: '#737373' }}>
          Already have an account?{' '}
          <Link href="/" style={{ color: 'var(--primary-600)', fontWeight: '600', textDecoration: 'none' }}>
            Sign In here
          </Link>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '10px',
  border: '2px solid #e2e8f0',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff'
};

const focusStyle = (e) => e.target.style.borderColor = 'var(--primary-600)';
const blurStyle = (e) => e.target.style.borderColor = '#e2e8f0';
