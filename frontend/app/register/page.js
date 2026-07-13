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
          // If default batch isn't sem 1/2, set default department
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

  const selectedBatchObj = useMemo(() => {
    return batches.find(b => String(b.batchId) === String(batchId));
  }, [batches, batchId]);

  const isSem1Or2 = useMemo(() => {
    return selectedBatchObj ? (selectedBatchObj.semester === 1 || selectedBatchObj.semester === 2) : true;
  }, [selectedBatchObj]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }
    if (!firstName || !lastName || !universityEmail) {
      setError("First name, last name, and university email are required.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      username,
      password,
      role: role.toUpperCase(),
      firstName,
      lastName,
      universityEmail,
    };

    if (role === "student") {
      if (!batchId) {
        setError("Please select a batch.");
        setLoading(false);
        return;
      }
      payload.batchId = Number(batchId);
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
      payload.email = universityEmail;
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
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "radial-gradient(circle at 50% 50%, var(--primary-900) 0%, var(--neutral-900) 100%)",
      fontFamily: "var(--font-family)",
      padding: "40px 20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "500px",
        background: "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(16px)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        padding: "40px",
        boxShadow: "var(--shadow-xl)",
        color: "#fff"
      }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <img 
            src="/logo.jpg" 
            alt="Faculty of Engineering Logo" 
            style={{ 
              width: "80px", 
              height: "80px", 
              objectFit: "contain", 
              borderRadius: "8px", 
              background: "#ffffff", 
              padding: "6px", 
              marginBottom: "12px", 
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)", 
              display: "inline-block" 
            }} 
          />
          <h1 style={{
            fontSize: "22px",
            fontWeight: "800",
            letterSpacing: "-0.5px",
            background: "linear-gradient(135deg, #ffffff 0%, var(--primary-200) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 0
          }}>Faculty of Engineering</h1>
          <h2 style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "rgba(255, 255, 255, 0.85)",
            marginTop: "4px",
            marginBottom: "2px"
          }}>Account Registration</h2>
          <p style={{
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.55)",
            margin: 0
          }}>University of Ruhuna</p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid var(--error)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px",
            fontSize: "14px",
            color: "#fca5a5",
            marginBottom: "24px"
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid var(--success)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px",
            fontSize: "14px",
            color: "#a7f3d0",
            marginBottom: "24px"
          }}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "rgba(255, 255, 255, 0.8)",
              marginBottom: "8px"
            }}>I am registering as a:</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setRole("student")}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: role === "student" ? "var(--primary-600)" : "rgba(255,255,255,0.05)",
                  color: "#fff",
                  border: "1px solid " + (role === "student" ? "var(--primary-400)" : "rgba(255,255,255,0.12)"),
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all var(--transition-base)"
                }}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => setRole("lecturer")}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: role === "lecturer" ? "var(--primary-600)" : "rgba(255,255,255,0.05)",
                  color: "#fff",
                  border: "1px solid " + (role === "lecturer" ? "var(--primary-400)" : "rgba(255,255,255,0.12)"),
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all var(--transition-base)"
                }}
              >
                👨‍🏫 Lecturer
              </button>
            </div>
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "rgba(255, 255, 255, 0.8)",
              marginBottom: "8px"
            }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}

              required
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "rgba(0, 0, 0, 0.2)",
                color: "#fff",
                fontSize: "15px",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "rgba(255, 255, 255, 0.8)",
              marginBottom: "8px"
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "rgba(0, 0, 0, 0.2)",
                color: "#fff",
                fontSize: "15px",
                outline: "none"
              }}
            />
          </div>

          {/* First Name & Last Name — shown for both roles */}
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "rgba(255, 255, 255, 0.8)",
                marginBottom: "8px"
              }}>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(0, 0, 0, 0.2)",
                  color: "#fff",
                  fontSize: "15px",
                  outline: "none"
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "rgba(255, 255, 255, 0.8)",
                marginBottom: "8px"
              }}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(0, 0, 0, 0.2)",
                  color: "#fff",
                  fontSize: "15px",
                  outline: "none"
                }}
              />
            </div>
          </div>

          {/* University Email — shown for both roles */}
          <div>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "rgba(255, 255, 255, 0.8)",
              marginBottom: "8px"
            }}>University Email</label>
            <input
              type="email"
              value={universityEmail}
              onChange={(e) => setUniversityEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "rgba(0, 0, 0, 0.2)",
                color: "#fff",
                fontSize: "15px",
                outline: "none"
              }}
            />
          </div>

          {/* Conditional Student Fields */}
          {role === "student" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "rgba(255, 255, 255, 0.8)",
                  marginBottom: "8px"
                }}>Academic Batch</label>
                <select
                  value={batchId}
                  onChange={(e) => handleBatchChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    background: "rgba(30, 41, 59, 1)",
                    color: "#fff",
                    fontSize: "15px",
                    outline: "none"
                  }}
                >
                  {batches.map((batch) => (
                    <option key={batch.batchId} value={batch.batchId} style={{ background: "var(--neutral-800)" }}>
                      {batch.batchName} (Semester {batch.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "rgba(255, 255, 255, 0.8)",
                  marginBottom: "8px"
                }}>Academic Department</label>
                {isSem1Or2 ? (
                  <select
                    disabled
                    value="none"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      background: "rgba(30, 41, 59, 0.5)",
                      color: "rgba(255, 255, 255, 0.5)",
                      fontSize: "15px",
                      outline: "none",
                      cursor: "not-allowed"
                    }}
                  >
                    <option value="none" style={{ background: "var(--neutral-800)" }}>None</option>
                  </select>
                ) : (
                  <select
                    value={departmentId === "none" ? (departments[0]?.departmentId?.toString() || "") : departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      background: "rgba(30, 41, 59, 1)",
                      color: "#fff",
                      fontSize: "15px",
                      outline: "none"
                    }}
                  >
                    {departments.map((dept) => (
                      <option key={dept.departmentId} value={dept.departmentId} style={{ background: "var(--neutral-800)" }}>
                        {dept.departmentName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Conditional Lecturer Fields */}
          {role === "lecturer" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Title dropdown */}
              <div>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "rgba(255, 255, 255, 0.8)",
                  marginBottom: "8px"
                }}>Title</label>
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    background: "rgba(30, 41, 59, 1)",
                    color: "#fff",
                    fontSize: "15px",
                    outline: "none"
                  }}
                >
                  {["Dr.", "Prof.", "Eng.", "Mr.", "Ms.", "Mrs."].map((t) => (
                    <option key={t} value={t} style={{ background: "var(--neutral-800)" }}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Department dropdown */}
              <div>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "rgba(255, 255, 255, 0.8)",
                  marginBottom: "8px"
                }}>Academic Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    background: "rgba(30, 41, 59, 1)",
                    color: "#fff",
                    fontSize: "15px",
                    outline: "none"
                  }}
                >
                  {departments.filter(d => d.departmentId !== 6).map((dept) => (
                    <option key={dept.departmentId} value={dept.departmentId} style={{ background: "var(--neutral-800)" }}>
                      {dept.departmentName}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0, 150, 136, 0.3)",
              transition: "all var(--transition-base)",
              marginTop: "10px"
            }}
          >
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <div style={{
          textAlign: "center",
          marginTop: "24px",
          fontSize: "14px",
          color: "rgba(255, 255, 255, 0.6)"
        }}>
          Already have an account?{" "}
          <Link href="/" style={{
            color: "var(--primary-300)",
            textDecoration: "none",
            fontWeight: "600"
          }}>
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
