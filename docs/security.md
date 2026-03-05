# AZIMUTH — Security and hardening

Security posture for the AZIMUTH antenna-pointing application (v1). Windows 11 only; Electron; local-only storage.

---

## 1. Sensitive data

| Data | Location | Scope |
|------|----------|--------|
| **Saved home locations** | Single JSON file (see [data-schema.md](data-schema.md)) | Local only. Stored in app user data directory or user-chosen path (e.g. OneDrive). |
| **Saved target locations** | Same JSON file | Local only. |
| **Preferences** (e.g. distance unit, data file path) | Same JSON file | Local only. |

- **No user accounts.** No login, no cloud identity, no sync performed by the app.
- **No collection of personal data** beyond what the user explicitly enters (location names, coordinates, notes).
- Optional use of a user-chosen folder (e.g. OneDrive) is under the user’s control; the app does not transmit or sync data itself.

---

## 2. Encryption and MFA

Per product decision:

- **No encryption** of the stored JSON file. Data is stored in plain form.
- **No multi-factor authentication (MFA).** There are no accounts or authenticated sessions.

Users who want encrypted or synced storage can place the data file in an encrypted or cloud-synced folder (e.g. OneDrive, encrypted volume); the app does not implement this.

---

## 3. Secrets and map services

- **No secrets in the repository.** No API keys, tokens, or passwords are committed or required to run the app.
- **No paid map services.** The app does not call any subscription or paid map/tile APIs.
- **Maps:** Bundled world map is from [Natural Earth](https://www.naturalearthdata.com/) data via [world-atlas](https://github.com/topojson/world-atlas) (ISC license). No network request is required for the default map; the app works offline from first launch.
- **Attribution:** world-atlas/Natural Earth use is in line with their licenses. No API keys or paid services are used; no further attribution is required by the current stack for v1.

---

## 4. Summary

| Aspect | Stance |
|--------|--------|
| Sensitive data | Home/target locations and preferences; local only; no accounts. |
| Encryption | None; plain JSON on disk. |
| MFA | None. |
| Secrets in repo | None. |
| Map services | Free, bundled (Natural Earth / world-atlas); offline-first; no paid APIs. |

**Deliverable:** Security posture documented; local-only storage; no encryption/MFA; no secrets or paid map services.
