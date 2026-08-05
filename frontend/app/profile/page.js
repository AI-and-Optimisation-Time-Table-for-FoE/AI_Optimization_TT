"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { fetchUserProfile, updateUserProfile } from "../lib/api";
import { User, Mail, Briefcase, MapPin, Phone, Camera, ArrowLeft, Loader2, Award, BookOpen, LogOut, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Details state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    universityEmail: "",
    profilePicture: "",
    specialization: "",
    universityAddress: "",
    phoneNumber: "",
    username: "",
    role: "",
    batchName: "",
    departmentName: "",
    maxHoursPerWeek: "",
    studentIdNumber: ""
  });

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/");
      return;
    }
    const parsed = JSON.parse(userStr);
    setCurrentUser(parsed);
    loadProfile(parsed.userId);
  }, [router]);

  const loadProfile = async (userId) => {
    try {
      setLoading(true);
      const data = await fetchUserProfile(userId);
      setFormData({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        universityEmail: data.universityEmail || "",
        profilePicture: data.profilePicture || "",
        specialization: data.specialization || "",
        universityAddress: data.universityAddress || "",
        phoneNumber: data.phoneNumber || "",
        username: data.username || "",
        role: data.role || "",
        batchName: data.batchName || "N/A",
        departmentName: data.departmentName || data.departmentCode || "Common (General)",
        maxHoursPerWeek: data.maxHoursPerWeek || "",
        studentIdNumber: data.studentIdNumber || ""
      });
    } catch (err) {
      console.error(err);
      setError("Failed to load profile details.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = () => {
    if (saving) return;
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setError("Image size should be less than 2MB.");
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result;
      
      // Instantly preview
      setFormData(prev => ({ ...prev, profilePicture: base64Image }));

      // Auto-save to database
      try {
        setSaving(true);
        setError("");
        setSuccessMsg("");
        
        const result = await updateUserProfile(currentUser.userId, {
          profilePicture: base64Image
        });

        // Update local storage so sidebar reflects the new image immediately
        const updatedUser = {
          ...currentUser,
          profilePicture: result.profilePicture
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        
        // Notify sidebar to refresh
        window.dispatchEvent(new Event("userUpdate"));
        
        setSuccessMsg("Profile picture updated successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (err) {
        console.error(err);
        setError("Failed to save profile picture: " + err.message);
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content" style={{ background: "var(--neutral-50)", minHeight: "100vh" }}>
        
        {/* TOP NAVBAR */}
        <header className="content-header" style={{ borderBottom: "1px solid var(--neutral-200)", background: "white", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button 
              onClick={() => router.push(currentUser ? `/${currentUser.role}` : "/")} 
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--neutral-600)" }}
            >
              <ArrowLeft size={20} />
            </button>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>Account Profile</h2>
          </div>
          
          {/* HEADER LOGOUT BUTTON */}
          {!loading && (
            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              style={{ display: "flex", alignItems: "center", gap: "8px", color: "#b91c1c", borderColor: "#fca5a5", background: "#fef2f2" }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          )}
        </header>

        {/* CONTAINER */}
        <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
          
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", padding: "100px 0" }}>
              <Loader2 className="animate-spin" size={32} style={{ color: "var(--primary-600)" }} />
              <span style={{ color: "var(--neutral-500)", fontSize: "14px" }}>Loading profile...</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* ALERTS */}
              {error && (
                <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#b91c1c", padding: "12px 16px", borderRadius: "var(--radius-md)", fontSize: "14px" }}>
                  {error}
                </div>
              )}
              {successMsg && (
                <div style={{ background: "#dcfce7", border: "1px solid #bbf7d0", color: "#15803d", padding: "12px 16px", borderRadius: "var(--radius-md)", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle size={16} />
                  {successMsg}
                </div>
              )}

              {/* PROFILE HERO HEADER */}
              <div className="card" style={{ background: "linear-gradient(135deg, var(--primary-800) 0%, var(--primary-600) 100%)", color: "white", padding: "32px", border: "none", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "24px", position: "relative", zIndex: 1, flexWrap: "wrap" }}>
                  
                  {/* AVATAR UPLOAD */}
                  <div 
                    style={{ position: "relative", cursor: saving ? "not-allowed" : "pointer" }} 
                    onClick={handleImageClick}
                    title="Click to change profile photo"
                  >
                    <div style={{ width: "110px", height: "110px", borderRadius: "50%", overflow: "hidden", border: "4px solid rgba(255, 255, 255, 0.3)", background: "var(--primary-700)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {formData.profilePicture ? (
                        <img 
                          src={formData.profilePicture} 
                          alt="Profile photo" 
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        />
                      ) : (
                        <span style={{ fontSize: "36px", fontWeight: "700", color: "white" }}>
                          {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : formData.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* CAMERA ICON OVERLAY */}
                    <div style={{ position: "absolute", bottom: "4px", right: "4px", background: "white", color: "var(--neutral-700)", borderRadius: "50%", padding: "6px", border: "1px solid var(--neutral-200)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                      {saving ? <Loader2 className="animate-spin" size={14} /> : <Camera size={14} />}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      style={{ display: "none" }} 
                    />
                  </div>

                  {/* USER META */}
                  <div>
                    <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700", textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                      {formData.firstName ? `${formData.firstName} ${formData.lastName}` : formData.username}
                    </h1>
                    <p style={{ margin: "4px 0 0 0", color: "rgba(255, 255, 255, 0.8)", fontSize: "14px", textTransform: "capitalize", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ background: "rgba(255, 255, 255, 0.2)", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" }}>{formData.role}</span>
                      <span>@{formData.username}</span>
                    </p>
                  </div>
                </div>
                {/* DECORATIVE LIGHT CIRCLE */}
                <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(255, 255, 255, 0.05)", pointerEvents: "none" }} />
              </div>

              {/* READ-ONLY INFO CARDS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* PERSONAL INFORMATION CARD */}
                <div className="card" style={{ background: "white", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-md)" }}>
                  <div className="card-body" style={{ padding: "24px" }}>
                    <h3 style={{ margin: "0 0 24px 0", fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "var(--neutral-800)" }}>
                      <User size={18} style={{ color: "var(--primary-600)" }} />
                      <span>Personal Information</span>
                    </h3>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>First Name</span>
                        <span style={{ fontSize: "15px", color: "var(--neutral-800)", fontWeight: "600" }}>{formData.firstName || "—"}</span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Name</span>
                        <span style={{ fontSize: "15px", color: "var(--neutral-800)", fontWeight: "600" }}>{formData.lastName || "—"}</span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>University Email Address</span>
                        <span style={{ fontSize: "15px", color: "var(--neutral-800)", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Mail size={14} style={{ color: "var(--neutral-400)" }} />
                          {formData.universityEmail || "—"}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Username</span>
                        <span style={{ fontSize: "15px", color: "var(--neutral-800)", fontWeight: "600" }}>{formData.username}</span>
                      </div>

                    </div>
                  </div>
                </div>

                {/* STUDENT ACADEMIC INFO CARD */}
                {formData.role === "student" && (
                  <div className="card" style={{ background: "white", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-md)" }}>
                    <div className="card-body" style={{ padding: "24px" }}>
                      <h3 style={{ margin: "0 0 24px 0", fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "var(--neutral-800)" }}>
                        <BookOpen size={18} style={{ color: "var(--primary-600)" }} />
                        <span>Academic Details</span>
                      </h3>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Department</span>
                          <span style={{ fontSize: "15px", color: "var(--neutral-800)", fontWeight: "600" }}>{formData.departmentName}</span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Batch Year</span>
                          <span style={{ fontSize: "15px", color: "var(--neutral-800)", fontWeight: "600" }}>{formData.batchName}</span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Registration ID</span>
                          <span style={{ fontSize: "15px", color: "var(--neutral-800)", fontWeight: "600" }}>{formData.studentIdNumber || "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* LECTURER PROFESSIONAL INFO CARD */}
                {formData.role === "lecturer" && (
                  <div className="card" style={{ background: "white", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-md)" }}>
                    <div className="card-body" style={{ padding: "24px" }}>
                      <h3 style={{ margin: "0 0 24px 0", fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "var(--neutral-800)" }}>
                        <Award size={18} style={{ color: "var(--primary-600)" }} />
                        <span>Lecturer Professional Profile</span>
                      </h3>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Department</span>
                          <span style={{ fontSize: "15px", color: "var(--neutral-800)", fontWeight: "600" }}>{formData.departmentName}</span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Specialization / Research Fields</span>
                          <span style={{ fontSize: "15px", color: "var(--neutral-800)", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Briefcase size={14} style={{ color: "var(--neutral-400)" }} />
                            {formData.specialization || "—"}
                          </span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Contact Number</span>
                          <span style={{ fontSize: "15px", color: "var(--neutral-800)", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Phone size={14} style={{ color: "var(--neutral-400)" }} />
                            {formData.phoneNumber || "—"}
                          </span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Max Weekly Hours</span>
                          <span style={{ fontSize: "15px", color: "var(--neutral-800)", fontWeight: "600" }}>{formData.maxHoursPerWeek ? `${formData.maxHoursPerWeek} Hours/Week` : "—"}</span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", gridColumn: "1 / -1" }}>
                          <span style={{ fontSize: "12px", color: "var(--neutral-500)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Office Location / Address</span>
                          <span style={{ fontSize: "15px", color: "var(--neutral-800)", fontWeight: "600", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                            <MapPin size={14} style={{ color: "var(--neutral-400)", marginTop: "3px" }} />
                            {formData.universityAddress || "—"}
                          </span>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
