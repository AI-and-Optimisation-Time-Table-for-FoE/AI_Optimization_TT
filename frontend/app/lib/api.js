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
    throw new Error(`Request failed: ${path}`);
  }

  if (response.status === 204) {
    return [];
  }

  return response.json();
}

export function fetchBatches() {
  return request("/api/batches");
}

export function fetchBatchModules(batchId) {
  return request(`/api/batches/${batchId}/modules`);
}

export function fetchLecturers() {
  return request("/api/lecturers");
}

export function fetchHalls() {
  return request("/api/halls");
}

export function fetchTimeSlots() {
  return request("/api/timeslots");
}

export function generateTimetable(batchId) {
  return request("/api/timetable/generate", {
    method: "POST",
    body: JSON.stringify({ batchId }),
  });
}

export function fetchTimetable(batchId) {
  const query = batchId ? `?batchId=${batchId}` : "";
  return request(`/api/timetable${query}`);
}
