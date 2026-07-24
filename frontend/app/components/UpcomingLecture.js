"use client";

import { useEffect, useState, useMemo } from "react";
import { Clock, MapPin, Calendar, BellRing } from "lucide-react";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Helper to get minutes from "HH:mm" or "HH:mm:ss"
function getMinutesFromTime(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export default function UpcomingLecture({ entries = [] }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update current time every 30 seconds
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const upcomingInfo = useMemo(() => {
    if (!entries || entries.length === 0) return null;

    const currentDayIdx = currentTime.getDay();
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    // Reorder days starting from today
    const orderedDays = [];
    for (let i = 0; i < 7; i++) {
      orderedDays.push((currentDayIdx + i) % 7);
    }

    // Group entries by day
    const entriesByDay = {};
    entries.forEach((e) => {
      const dayStr = e.dayOfWeek;
      const dayIdx = DAYS_OF_WEEK.indexOf(dayStr);
      if (dayIdx !== -1) {
        if (!entriesByDay[dayIdx]) entriesByDay[dayIdx] = [];
        entriesByDay[dayIdx].push(e);
      }
    });

    // Find the next lecture
    for (const dayIdx of orderedDays) {
      if (!entriesByDay[dayIdx]) continue;

      // Sort by start time
      const dayEntries = entriesByDay[dayIdx].sort(
        (a, b) => getMinutesFromTime(a.startTime) - getMinutesFromTime(b.startTime)
      );

      for (const entry of dayEntries) {
        const startMins = getMinutesFromTime(entry.startTime);
        const endMins = getMinutesFromTime(entry.endTime);

        if (dayIdx === currentDayIdx) {
          if (currentMinutes < startMins) {
            // It's upcoming today
            return { type: "upcoming", entry, dayOffset: 0 };
          } else if (currentMinutes >= startMins && currentMinutes < endMins) {
            // It's currently ongoing
            return { type: "ongoing", entry, dayOffset: 0 };
          }
        } else {
          // It's on a future day
          const offset = (dayIdx - currentDayIdx + 7) % 7;
          return { type: "upcoming", entry, dayOffset: offset };
        }
      }
    }

    return null;
  }, [entries, currentTime]);

  if (!upcomingInfo) {
    return (
      <div className="card" style={{ padding: "20px", textAlign: "center", color: "var(--neutral-500)", border: "1px dashed var(--neutral-300)" }}>
        No upcoming lectures scheduled.
      </div>
    );
  }

  const { type, entry, dayOffset } = upcomingInfo;

  let dayLabel = "Today";
  if (dayOffset === 1) dayLabel = "Tomorrow";
  else if (dayOffset > 1) dayLabel = entry.dayOfWeek;

  // Format time (e.g. "08:30" or "08:30:00" -> "08:30 AM")
  const formatTime = (timeStr) => {
    const parts = timeStr.split(":");
    let h = parseInt(parts[0], 10);
    let m = parts[1];
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  };

  const startTimeStr = formatTime(entry.startTime);
  const endTimeStr = formatTime(entry.endTime);

  const isOngoing = type === "ongoing";

  return (
    <div className="card" style={{ 
      background: isOngoing ? "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)" : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", 
      color: "#fff",
      boxShadow: isOngoing ? "0 8px 24px rgba(59, 130, 246, 0.4)" : "0 8px 24px rgba(99, 102, 241, 0.4)",
      border: "none",
      marginBottom: "24px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Decorative circle */}
      <div style={{
        position: "absolute",
        top: "-20px",
        right: "-20px",
        width: "120px",
        height: "120px",
        borderRadius: "50%",
        background: "rgba(255, 255, 255, 0.1)",
        pointerEvents: "none"
      }} />

      <div className="card-body" style={{ padding: "24px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
          
          <div style={{ 
            background: "rgba(255, 255, 255, 0.2)", 
            padding: "16px", 
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <BellRing size={32} color="#fff" />
          </div>
          
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9, marginBottom: "4px" }}>
              {isOngoing ? "Ongoing Lecture Now" : "Your Upcoming Lecture"}
            </h3>
            <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px", textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              {entry.moduleCode}: {entry.moduleName}
            </h2>
            
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginTop: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: "500" }}>
                <Calendar size={18} opacity={0.8} />
                {dayLabel}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: "500" }}>
                <Clock size={18} opacity={0.8} />
                {startTimeStr} - {endTimeStr}
              </div>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                fontSize: "15px", 
                fontWeight: "700",
                background: "#fff",
                color: isOngoing ? "#1d4ed8" : "#6366f1",
                padding: "4px 12px",
                borderRadius: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <MapPin size={18} />
                {entry.hallName}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
