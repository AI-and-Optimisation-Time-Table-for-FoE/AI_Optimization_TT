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
