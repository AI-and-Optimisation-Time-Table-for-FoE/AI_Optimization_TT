# Frontend API Reference

## Base URL

All requests are prefixed with `API_BASE`. The client uses `NEXT_PUBLIC_API_URL` when it is set. Otherwise, in development, it uses `http://localhost:5000`. In production, the fallback is an empty string, so requests use the current origin.

## Shared Request Helper

The exported API functions call the shared `request()` helper. It uses `fetch()` with `cache: "no-store"`, adds the `Content-Type: application/json` header (while preserving any headers supplied by the caller), and serializes request bodies as JSON where applicable. For a non-success response, it throws an `Error` using the server's `message` field when one is returned; otherwise it uses `Request failed: <path>`. A `204 No Content` response returns an empty array. Other successful responses are parsed as JSON.

| Helper | Method | Endpoint path | Purpose |
| --- | --- | --- | --- |
| `request(path, options)` | Varies | Varies | Shared fetch helper used by the exported API functions; applies request defaults and parses or reports the response. |

## Authentication and Profile

| Function | Method | Endpoint path | Purpose |
| --- | --- | --- | --- |
| `login(username, password)` | `POST` | `/api/auth/login` | Authenticates a user with a username and password, or with an object payload, and returns the logged-in user details. |
| `register(data)` | `POST` | `/api/auth/register` | Registers a new user with the supplied data. |
| `fetchUserProfile(userId)` | `GET` | `/api/auth/profile/{userId}` | Retrieves a user's profile. |
| `updateUserProfile(userId, data)` | `PATCH` | `/api/auth/profile/{userId}` | Updates a user's profile with the supplied data. |
| `changePassword(userId, currentPassword, newPassword)` | `POST` | `/api/auth/change-password` | Changes a user's password using the current and new passwords. |
| `requestPasswordReset(identifier)` | `POST` | `/api/auth/forgot-password` | Requests a password reset for an identifier. |
| `verifyResetCode(email, verificationCode)` | `POST` | `/api/auth/verify-reset-code` | Verifies a password-reset code for an email address. |
| `resetPasswordDirect(identifier, newPassword)` | `POST` | `/api/auth/reset-password` | Resets a password directly using an identifier and new password. |
| `resetPasswordWithKey(identifier, verificationCode, newPassword)` | `POST` | `/api/auth/reset-password` | Resets a password through the key-based wrapper; the implementation sends the identifier and new password. |

## Batches, Halls, Modules, Time Slots, Users, Departments, and Lecturers

| Function | Method | Endpoint path | Purpose |
| --- | --- | --- | --- |
| `fetchBatches()` | `GET` | `/api/batches` | Retrieves all batches. |
| `createBatch(data)` | `POST` | `/api/batches` | Creates a batch from the supplied data. |
| `updateBatch(batchId, data)` | `PUT` | `/api/batches/{batchId}` | Updates a batch. |
| `deleteBatch(batchId)` | `DELETE` | `/api/batches/{batchId}` | Deletes a batch. |
| `fetchHalls()` | `GET` | `/api/halls` | Retrieves all halls. |
| `createHall(data)` | `POST` | `/api/halls` | Creates a hall from the supplied data. |
| `updateHall(hallId, data)` | `PUT` | `/api/halls/{hallId}` | Updates a hall. |
| `deleteHall(hallId)` | `DELETE` | `/api/halls/{hallId}` | Deletes a hall. |
| `fetchModules()` | `GET` | `/api/modules` | Retrieves all modules. |
| `createModule(data)` | `POST` | `/api/modules` | Creates a module from the supplied data. |
| `updateModule(moduleId, data)` | `PUT` | `/api/modules/{moduleId}` | Updates a module. |
| `deleteModule(moduleId)` | `DELETE` | `/api/modules/{moduleId}` | Deletes a module. |
| `fetchTimeSlots()` | `GET` | `/api/timeslots` | Retrieves all time slots. |
| `createTimeSlot(data)` | `POST` | `/api/timeslots` | Creates a time slot from the supplied data. |
| `updateTimeSlot(slotId, data)` | `PUT` | `/api/timeslots/{slotId}` | Updates a time slot. |
| `deleteTimeSlot(slotId)` | `DELETE` | `/api/timeslots/{slotId}` | Deletes a time slot. |
| `fetchUsers()` | `GET` | `/api/users` | Retrieves all users. |
| `createUser(data)` | `POST` | `/api/users` | Creates a user from the supplied data. |
| `updateUser(userId, data)` | `PUT` | `/api/users/{userId}` | Updates a user. |
| `deleteUser(userId)` | `DELETE` | `/api/users/{userId}` | Deletes a user. |
| `fetchDepartments()` | `GET` | `/api/departments` | Retrieves all departments. |
| `fetchLecturers()` | `GET` | `/api/lecturers` | Retrieves all lecturers. |
| `updateLecturer(lecturerId, data)` | `PUT` | `/api/lecturers/{lecturerId}` | Updates a lecturer. |
| `deleteLecturer(lecturerId)` | `DELETE` | `/api/lecturers/{lecturerId}` | Deletes a lecturer. |
| `fetchLecturerModules(lecturerId)` | `GET` | `/api/lecturers/{lecturerId}/modules` | Retrieves the modules assigned to a lecturer. |

## Batch Modules and Lab Schedules

| Function | Method | Endpoint path | Purpose |
| --- | --- | --- | --- |
| `autoLinkSharedModules(batchId)` | `POST` | `/api/batches/{batchId}/auto-link-shared` | Automatically links shared modules for a batch. |
| `fetchBatchModules(batchId, departmentId)` | `GET` | `/api/batches/{batchId}/modules` with optional `departmentId` | Retrieves modules assigned to a batch, optionally filtered by department; an invalid or missing batch ID returns an empty array without a request. |
| `updateBatchModule(batchModuleId, data)` | `PUT` | `/api/batches/modules/{batchModuleId}` | Updates a batch-module assignment. |
| `addModuleToBatch(batchId, moduleId, departmentId)` | `POST` | `/api/batches/{batchId}/modules` | Adds a module to a batch with the module and department IDs; an invalid or missing batch ID rejects with `Invalid batch ID` without a request. |
| `removeModuleFromBatch(batchId, batchModuleId, departmentId)` | `DELETE` | `/api/batches/{batchId}/modules/{batchModuleId}` with optional `departmentId` | Removes a module assignment from a batch; an invalid or missing batch ID rejects with `Invalid batch ID` without a request. |
| `fetchLabSchedules(batchId, departmentId)` | `GET` | `/api/lab-schedules` with optional `batchId` and `departmentId` | Retrieves lab schedules, optionally filtered by batch and department. |
| `createLabSchedule(data)` | `POST` | `/api/lab-schedules` | Creates a lab schedule from the supplied data. |
| `deleteLabSchedule(id)` | `DELETE` | `/api/lab-schedules/{id}` | Deletes a lab schedule. |

## Lecture Timetables and Versions

| Function | Method | Endpoint path | Purpose |
| --- | --- | --- | --- |
| `generateTimetable(batchId, departmentId)` | `POST` | `/api/timetable/generate?batchId={batchId}` with optional `departmentId` | Generates a timetable for a batch and optional department; an invalid or missing batch ID rejects with `Invalid batch ID` without a request. |
| `fetchTimetable(batchId, departmentId, isAdmin, timetableId)` | `GET` | `/api/timetable` with optional `batchId`, `departmentId`, `isAdmin=true`, and `timetableId` | Retrieves a timetable using the supplied optional filters. |
| `fetchLecturerTimetable(lecturerId)` | `GET` | `/api/timetable?lecturerId={lecturerId}` | Retrieves the timetable for a lecturer. |
| `fetchTimetableStatus(batchId, departmentId, isAdmin)` | `GET` | `/api/timetable/status` with optional `batchId`, `departmentId`, and `isAdmin=true` | Retrieves timetable generation or publication status using optional filters. |
| `publishTimetable(batchId, departmentId)` | `POST` | `/api/timetable/publish?batchId={batchId}` with optional `departmentId` | Publishes a timetable for a batch and optional department; an invalid or missing batch ID rejects with `Invalid batch ID` without a request. |
| `moveTimetableEntry(entryId, dayOfWeek, startTime, endTime, venueId)` | `PUT` | `/api/timetable/entries/{entryId}/move` | Moves a timetable entry to a new day, time range, and venue. |
| `fetchTimetableVersions(batchId, departmentId)` | `GET` | `/api/timetable/versions?batchId={batchId}` with optional `departmentId` | Retrieves timetable versions for a batch and optional department; a missing batch ID returns an empty array without a request. |
| `publishTimetableVersion(versionId)` | `POST` | `/api/timetable/versions/publish` | Publishes a timetable version using its ID in the request body. |
| `unpublishTimetableVersion(versionId)` | `POST` | `/api/timetable/versions/unpublish` | Unpublishes a timetable version using its ID in the request body. |
| `deleteTimetableVersion(versionId)` | `DELETE` | `/api/timetable/versions/{versionId}` | Deletes a timetable version. |
| `fetchMasterLecturerStatus()` | `GET` | `/api/timetable/versions/master-lecturer-status` | Retrieves the master lecturer timetable publication status. |
| `publishMasterLecturerTimetable()` | `POST` | `/api/timetable/versions/publish-master-lecturer` | Publishes the master lecturer timetable. |
| `unpublishMasterLecturerTimetable()` | `POST` | `/api/timetable/versions/unpublish-master-lecturer` | Unpublishes the master lecturer timetable. |

## Exam Timetables and Enrollment

| Function | Method | Endpoint path | Purpose |
| --- | --- | --- | --- |
| `fetchExamTimetables(batchId, streamScope)` | `GET` | `/api/exam-timetables` with optional `batchId` and `streamScope` | Retrieves exam timetables, optionally filtered by batch and stream scope. |
| `fetchExamTimetableDetails(examTimetableId)` | `GET` | `/api/exam-timetables/{examTimetableId}` | Retrieves the details of an exam timetable. |
| `createExamTimetable(data)` | `POST` | `/api/exam-timetables` | Creates an exam timetable from the supplied data. |
| `saveExamEntries(examTimetableId, entries)` | `POST` | `/api/exam-timetables/{examTimetableId}/entries` | Saves entries for an exam timetable. |
| `publishExamTimetable(examTimetableId)` | `POST` | `/api/exam-timetables/{examTimetableId}/publish` | Publishes an exam timetable. |
| `unpublishExamTimetable(examTimetableId)` | `POST` | `/api/exam-timetables/{examTimetableId}/unpublish` | Unpublishes an exam timetable. |
| `reoptimizeExamTimetable(examTimetableId)` | `POST` | `/api/exam-timetables/{examTimetableId}/reoptimize` | Reoptimizes an exam timetable. |
| `deleteExamTimetable(examTimetableId)` | `DELETE` | `/api/exam-timetables/{examTimetableId}` | Deletes an exam timetable. |
| `deleteExamEntry(examTimetableId, entryId)` | `DELETE` | `/api/exam-timetables/{examTimetableId}/entries/{entryId}` | Deletes an entry from an exam timetable. |
| `fetchExamHallUnavailabilities()` | `GET` | `/api/exam-timetables/hall-unavailabilities` | Retrieves exam hall unavailability records. |
| `addExamHallUnavailability(data)` | `POST` | `/api/exam-timetables/hall-unavailabilities` | Adds an exam hall unavailability record. |
| `deleteExamHallUnavailability(id)` | `DELETE` | `/api/exam-timetables/hall-unavailabilities/{id}` | Deletes an exam hall unavailability record. |
| `fetchStudentExamTimetable(batchId, identifier)` | `GET` | `/api/exam-timetables/student?batchId={batchId}` with optional `identifier` | Retrieves a student's exam timetable for a batch, optionally for a specific identifier. |
| `fetchStudentEnrollments(batchId)` | `GET` | `/api/student-enrollments/batch/{batchId}` | Retrieves enrollments for a batch. |
| `fetchPersonalizedStudentEnrollments(identifier)` | `GET` | `/api/student-enrollments/student?identifier={identifier}` | Retrieves personalized enrollments for a student identifier. |
| `syncMISStudentEnrollments(batchId, records)` | `POST` | `/api/student-enrollments/sync` | Synchronizes MIS enrollment records for a batch. |
| `clearBatchEnrollments(batchId)` | `DELETE` | `/api/student-enrollments/batch/{batchId}` | Clears all enrollments for a batch. |

## Notes

- The client uses `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` according to the tables above. JSON request bodies are serialized by each exported function before being passed to `request()`.
- Optional query parameters are included only when their corresponding arguments are truthy. `streamScope`, student identifiers, and lecturer identifiers used in query strings are URL-encoded where the source does so.
- To add a new endpoint, export a function in `frontend/app/lib/api.js` that calls `request()` with the exact path, HTTP method, query construction, and JSON body required by the backend, then document that function in the appropriate table in this file.
