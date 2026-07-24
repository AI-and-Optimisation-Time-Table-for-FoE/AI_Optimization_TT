"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, GraduationCap, Users, Calendar, LogOut, ClipboardList } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = () => {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch (e) {
          localStorage.removeItem("user");
        }
      }
    };
    loadUser();
    window.addEventListener("userUpdate", loadUser);
    return () => window.removeEventListener("userUpdate", loadUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  // Build navigation items dynamically
  const getNavItems = () => {
    if (!user) return [];

    const items = [];

    if (user.role === "admin") {
      items.push({ label: "Admin Panel", href: "/admin", icon: <Shield size={18} /> });
      items.push({ label: "Lecture Schedule", href: "/timetable", icon: <Calendar size={18} /> });
      items.push({ label: "Exam Timetable", href: "/admin/exam-timetable", icon: <ClipboardList size={18} /> });
    } else if (user.role === "student") {
      items.push({ label: "Student Panel", href: "/student", icon: <GraduationCap size={18} /> });
      items.push({ label: "Lecture Schedule", href: "/timetable", icon: <Calendar size={18} /> });
      items.push({ label: "Exam Schedule", href: "/student/exam-timetable", icon: <ClipboardList size={18} /> });
    } else if (user.role === "lecturer") {
      items.push({ label: "Lecturer Panel", href: "/lecturer", icon: <Users size={18} /> });
      items.push({ label: "Lecture Schedule", href: "/timetable", icon: <Calendar size={18} /> });
    }

    return [
      {
        section: "Navigation",
        items
      }
    ];
  };

  const navSections = getNavItems();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href={user ? `/${user.role}` : "/"} className="sidebar-logo" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img 
            src="/logo.jpg" 
            alt="Faculty of Engineering Logo" 
            style={{ 
              width: "36px", 
              height: "36px", 
              objectFit: "contain", 
              background: "#ffffff", 
              padding: "2px", 
              borderRadius: "4px",
              flexShrink: 0
            }} 
          />
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div className="sidebar-logo-text" style={{ fontSize: "14px", fontWeight: "700", whiteSpace: "normal", lineHeight: "1.2", letterSpacing: "-0.2px" }}>Faculty of Engineering</div>
            <div className="sidebar-logo-subtitle" style={{ fontSize: "9px", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.2px", marginTop: "4px" }}>Timetable Scheduler</div>
          </div>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.section}>
            <div className="nav-section-title">{section.section}</div>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? "active" : ""}`}
              >
                <span className="nav-icon" style={{ display: "flex", alignItems: "center" }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {user && (
        <div style={{ padding: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <Link href="/profile" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "white", padding: "8px", borderRadius: "var(--radius-sm)", background: "rgba(255, 255, 255, 0.05)", transition: "background 0.2s", minWidth: 0 }}>
            {user.profilePicture ? (
              <img 
                src={user.profilePicture} 
                alt="Profile" 
                style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255, 255, 255, 0.2)", flexShrink: 0 }} 
              />
            ) : (
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary-600)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "14px", border: "1px solid rgba(255, 255, 255, 0.2)", flexShrink: 0 }}>
                {user.firstName ? user.firstName.charAt(0).toUpperCase() : (user.lecturerName ? user.lecturerName.charAt(0) : user.username.charAt(0).toUpperCase())}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.firstName ? `${user.firstName} ${user.lastName || ""}` : (user.lecturerName || user.username)}
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", textTransform: "capitalize" }}>
                {user.role}
              </div>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}
