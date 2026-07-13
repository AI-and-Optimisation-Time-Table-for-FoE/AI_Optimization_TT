export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errMsg = `Request failed: ${path}`;
    try {
      const errData = await response.json();
      if (errData && errData.message) {
        errMsg = errData.message;
      }
    } catch (e) {
      // Body is not JSON
    }
    throw new Error(errMsg);
  }

  if (response.status === 204) {
    return [];
  }

  return response.json();
}

// === AUTH ===
export function login(username, password) {
  const payload = typeof username === "object" ? username : { username, password };
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(data) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// === BATCHES ===
export function fetchBatches() {
  return request("/api/batches");
}

export function createBatch(data) {
  return request("/api/batches", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateBatch(batchId, data) {
  return request(`/api/batches/${batchId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteBatch(batchId) {
  return request(`/api/batches/${batchId}`, {
    method: "DELETE",
  });
}

// === HALLS ===
export function fetchHalls() {
  return request("/api/halls");
}

export function createHall(data) {
  return request("/api/halls", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateHall(hallId, data) {
  return request(`/api/halls/${hallId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteHall(hallId) {
  return request(`/api/halls/${hallId}`, {
    method: "DELETE",
  });
}

// === MODULES ===
export function fetchModules() {
  return request("/api/modules");
}

export function createModule(data) {
  return request("/api/modules", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateModule(moduleId, data) {
  return request(`/api/modules/${moduleId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteModule(moduleId) {
  return request(`/api/modules/${moduleId}`, {
    method: "DELETE",
  });
}

// === TIMESLOTS ===
export function fetchTimeSlots() {
  return request("/api/timeslots");
}

export function createTimeSlot(data) {
  return request("/api/timeslots", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTimeSlot(slotId, data) {
  return request(`/api/timeslots/${slotId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteTimeSlot(slotId) {
  return request(`/api/timeslots/${slotId}`, {
    method: "DELETE",
  });
}

// === USERS ===
export function fetchUsers() {
  return request("/api/users");
}

export function createUser(data) {
  return request("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateUser(userId, data) {
  return request(`/api/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteUser(userId) {
  return request(`/api/users/${userId}`, {
    method: "DELETE",
  });
}

// === DEPARTMENTS ===
export function fetchDepartments() {
  return request("/api/departments");
}

// === LECTURERS ===
export function fetchLecturers() {
  return request("/api/lecturers");
}

export function updateLecturer(lecturerId, data) {
  return request(`/api/lecturers/${lecturerId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteLecturer(lecturerId) {
  return request(`/api/lecturers/${lecturerId}`, {
    method: "DELETE",
  });
}

export function fetchLecturerModules(lecturerId) {
  return request(`/api/lecturers/${lecturerId}/modules`);
}

// === BATCH MODULE ASSIGNMENT ===
export function fetchBatchModules(batchId, departmentId) {
  const query = departmentId ? `?departmentId=${departmentId}` : "";
  return request(`/api/batches/${batchId}/modules${query}`);
}

export function updateBatchModule(batchModuleId, data) {
  return request(`/api/batches/modules/${batchModuleId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function addModuleToBatch(batchId, moduleId, departmentId) {
  return request(`/api/batches/${batchId}/modules`, {
    method: "POST",
    body: JSON.stringify({ moduleId, departmentId })
  });
}

export function removeModuleFromBatch(batchId, batchModuleId, departmentId) {
  let query = "";
  if (departmentId) query = `?departmentId=${departmentId}`;
  return request(`/api/batches/${batchId}/modules/${batchModuleId}${query}`, {
    method: "DELETE"
  });
}

// === LAB SCHEDULES ===
export function fetchLabSchedules(batchId, departmentId) {
  let query = "";
  if (batchId) query += `?batchId=${batchId}`;
  if (departmentId) query += (query ? `&` : `?`) + `departmentId=${departmentId}`;
  return request(`/api/lab-schedules${query}`);
}

export function createLabSchedule(data) {
  return request("/api/lab-schedules", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteLabSchedule(id) {
  return request(`/api/lab-schedules/${id}`, {
    method: "DELETE",
  });
}

// === TIMETABLE GENERATION & ACCESS ===
export function generateTimetable(batchId, departmentId) {
  let query = `?batchId=${batchId}`;
  if (departmentId) {
    query += `&departmentId=${departmentId}`;
  }
  return request(`/api/timetable/generate${query}`, {
    method: "POST",
  });
}

export function fetchTimetable(batchId, departmentId, isAdmin, timetableId) {
  let query = "";
  if (batchId) query += `?batchId=${batchId}`;
  if (departmentId) query += (query ? `&` : `?`) + `departmentId=${departmentId}`;
  if (isAdmin) query += (query ? `&` : `?`) + `isAdmin=true`;
  if (timetableId) query += (query ? `&` : `?`) + `timetableId=${timetableId}`;
  return request(`/api/timetable${query}`);
}

export function fetchLecturerTimetable(lecturerId) {
  return request(`/api/timetable?lecturerId=${lecturerId}`);
}

export function fetchTimetableStatus(batchId, departmentId) {
  let query = "";
  if (batchId) query += `?batchId=${batchId}`;
  if (departmentId) {
    query += (query ? `&` : `?`) + `departmentId=${departmentId}`;
  }
  return request(`/api/timetable/status${query}`);
}

export function publishTimetable(batchId, departmentId) {
  let query = `?batchId=${batchId}`;
  if (departmentId) {
    query += `&departmentId=${departmentId}`;
  }
  return request(`/api/timetable/publish${query}`, {
    method: "POST",
  });
}

// === TIMETABLE VERSIONS ===
export function fetchTimetableVersions(batchId, departmentId) {
  if (!batchId) return Promise.resolve([]);
  let query = `?batchId=${batchId}`;
  if (departmentId) {
    query += `&departmentId=${departmentId}`;
  }
  return request(`/api/timetable/versions${query}`);
}

export function publishTimetableVersion(versionId) {
  return request("/api/timetable/versions/publish", {
    method: "POST",
    body: JSON.stringify({ timetableId: versionId }),
  });
}

export function deleteTimetableVersion(versionId) {
  return request(`/api/timetable/versions/${versionId}`, {
    method: "DELETE",
  });
}

// === USER PROFILE ===
export function fetchUserProfile(userId) {
  return request(`/api/auth/profile/${userId}`);
}

export function updateUserProfile(userId, data) {
  return request(`/api/auth/profile/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
