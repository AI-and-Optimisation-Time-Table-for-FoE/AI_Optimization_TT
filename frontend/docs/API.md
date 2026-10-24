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
