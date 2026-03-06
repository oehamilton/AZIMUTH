# AZIMUTH — Development Plan

World map application for **antenna pointing**: determine the direction(s) to point an antenna for RF transmission to a target. Users enter target GPS coordinates or click on the map. Because the Earth is a sphere, there are **two great-circle paths** to any target (e.g. Lake Charles, LA → Tehran, Iran: one roughly east/short, one the long way). The app presents **all options** — each with **bearing from North** (degrees) and **distance** — so the user can choose short path, long path, or both for RF planning.

---

## 1. Project summary

| Aspect | Description |
|--------|-------------|
| **Purpose** | Support antenna pointing by showing every path to the target: **short path** (minor arc) and **long path** (major arc), each with bearing from North and distance. |
| **Scope** | Map (home-centric globe), stored home and target locations, target by coords/click or from list; great-circle lines and numeric bearing/distance for both paths. |
| **Users** | Operators (often mobile) planning RF transmission; need to choose among multiple homes and targets, with accurate azimuth and distance for both directions. |
| **Success** | Stored homes/targets; map with home at center and marked, target marked, great-circle lines; correct bearing from North and distance for both paths; works on Windows. |

---

## 1a. Core behavior (two paths)

On a sphere, there are exactly two great-circle routes from A to B:

| Path | Description | What we show |
|------|--------------|--------------|
| **Short path (minor arc)** | The shorter way around the globe (e.g. Lake Charles → Tehran going east). | Bearing from North (°), direction (e.g. E), distance (km/nm). |
| **Long path (major arc)** | The longer way (e.g. Lake Charles → Tehran going west/north around the globe). | Bearing from North (°), direction (e.g. WNW), distance (km/nm). |

Both options must always be presented so the user can choose which direction to point the antenna (e.g. short path for primary link, long path for backup or propagation experiments).

---

## 1b. Stored locations and map behavior

**Stored locations**
- **Home locations** — User can save multiple “home” (antenna) positions (e.g. base, shack, portable site). When mobile, user selects which home is active; that home is the reference for all bearings and distances. **Magnetic declination** (angle between magnetic north and true north at that location) can be stored per home so the app can show both true and compass (magnetic) bearing when using a compass on site.
- **Target locations** — User can save target positions (e.g. repeaters, DX targets). User can choose target from the saved list or add one by coordinates or map click.

**Map (azimuth / great-circle)**
- **Flat azimuthal map** — World map in flat azimuthal projection (e.g. orthographic), home-centric, great-circle view.
- **Home always in center** — The map is centered on the **selected home**; home is always marked clearly (antenna position).
- **Selected target** — The chosen target is indicated on the map (marker).
- **Lines** — Great-circle lines are drawn between home and target (short path and optionally long path) so the user gets a clear visual of both routes.
- **Numeric output** — In addition to the map: specific **bearing from North** (true) and **distance** for both short and long path. When a home has **magnetic declination** set, also show compass (magnetic) bearing for each path so the user can set a compass directly.

**Flow:** Select home → map centers on home, home marked. Select or add target → target marked, lines drawn, bearing and distance shown for both paths.

---

## 2. Technical context

- **Version control:** Git, descriptive commit messages.
- **Package manager:** pnpm.
- **Platform:** Windows installed application only (Electron). **Windows 11 only.** Microsoft Store distribution may be added later. **MSIX** installer.
- **Backend:** None for v1. No active cloud sync. User can optionally choose a **OneDrive-synced folder** as the store location for preferences/locations if they want sync across devices; app does not perform sync itself.
- **Infrastructure:** Windows installer. No web hosting.
- **Storage:** All preferences and stored locations are **local only**. No encryption. No MFA; no user accounts.

---

## 3. Design direction

- Functional and practical; minimal clutter.
- Warm tones and intentional use of color (e.g. map + warm accent for bearing/distance).
- Use current, trending UI patterns where they improve usability (e.g. clear CTAs, readable typography).

---

## 4. Iterative phases

### Phase 0 — Setup and planning ✅ Complete
- [x] Initialize repo: `pnpm init`, add `.gitignore`, basic README.
- [x] Choose stack: **Windows desktop app** (Electron), **Windows 11 only**, **MSIX** installer. Map library that supports **flat azimuthal** projection and great-circle lines — choose simplest option. **Maps: no paid subscriptions.** Use a **bundled default world map** (free source, e.g. Natural Earth or OSM-derived) so the app works offline from first launch; add **optional user-triggered caching** from a free tile source (e.g. OSM) when online. See Section 7 for details.
- [x] Define data structures for **saved home locations** (e.g. id, name, lat, lon, magneticDeclination° optional; notes) and **saved target locations** (e.g. id, name, lat, lon; optional notes). Single **JSON** file with **schema version** field. Persistence: **local storage** (local file or app data); optional **user-chosen path** (e.g. OneDrive folder). **Default home** when none exist: Washington DC, White House (38.8977 N, 77.0365 W).
- [x] Create `prd.md` with features, user stories, and acceptance criteria.
- [x] Add this plan to `plan.md` and use it as the living to-do list.
- [x] Document open questions and TBDs in this plan.

**Deliverable:** Repo ready, Windows app stack and simplest map approach chosen, location schema and local storage (with optional path) defined, PRD and plan in place.

#### Phase 0 — Detailed steps

1. **Initialize repo and tooling**
   - [x] Run `pnpm init` in project root (creates `package.json`).
   - [x] Add `.gitignore` (include: `node_modules/`, `dist/`, `out/`, `*.log`, `.env`, `.env.local`, OS/editor junk, Electron build artifacts).
   - [x] Update `README.md` with project name, one-line description, and “see plan.md for the development plan”.

2. **Lock stack and map approach**
   - [x] In `package.json`, set `"type": "module"` if using ES modules; add `engines` for Node (e.g. `>=20`) and note Windows 11.
   - [x] Document stack choice in plan or `docs/stack.md`: **Electron** for Windows desktop; **Windows 11 only**; **MSIX** for installer (e.g. electron-builder MSIX target).
   - [x] Document map approach: **flat azimuthal** projection; **bundled default world map** (free source: Natural Earth or small OSM-derived asset); **optional user-triggered caching** from a free tile URL (e.g. OSM) when online. No paid subscriptions or API keys.

3. **Define location data model and persistence**
   - [x] Create a schema doc or TypeScript types for:
     - **Saved home:** `id`, `name`, `lat`, `lon`, `magneticDeclination` (optional, number), `notes` (optional). Default home when none exist: Washington DC, White House (38.8977, -77.0365).
     - **Saved target:** `id`, `name`, `lat`, `lon`, `notes` (optional).
     - **App preferences:** e.g. `distanceUnit` (`km` | `nm` | `miles`), `dataFilePath` (optional user-chosen path for JSON file).
   - [x] Define single **JSON store**: one file containing `{ schemaVersion: 1, homes: [], targets: [], preferences: {} }`. Document where the file lives by default (e.g. app data dir) and how optional user-chosen path (e.g. OneDrive folder) is applied.

4. **PRD and plan hygiene**
   - [x] Create `prd.md` with: product purpose, user stories (e.g. “As a user I can select a home and target and see both path bearings and distances”), and acceptance criteria for v1.
   - [x] Ensure `plan.md` remains the single source of truth for the to-do list; check off Phase 0 items as they are done.
   - [x] Review Section 6 (Open questions) and add any new TBDs; resolve or defer.

5. **Phase 0 sign-off**
   - [x] All Phase 0 checkboxes above and in the detailed steps are checked.
   - [x] Repo builds (or will build after Phase 1): `pnpm install` succeeds; no broken references.

---

### Phase 1 — Core math and logic (no UI)
- [x] Implement geodetic utilities (e.g. WGS84):
  - **Short path (minor arc):** forward bearing from A to B, and distance (e.g. Haversine or Vincenty).
  - **Long path (major arc):** bearing from A toward B the “other way” around the globe, and distance = (Earth circumference − short distance).
  - Direction label (N, NE, E, …) from degrees for each path.
- [x] API returns both paths: e.g. `{ short: { bearing°, direction, distanceKm }, long: { bearing°, direction, distanceKm } }`.
- [x] Add unit tests for both paths (e.g. Lake Charles → Tehran: short ~E and long ~W/N; poles; antipodal; same point).
- [x] No UI in this phase; pure functions/modules.

**Deliverable:** Tested library that returns short-path and long-path bearing (from North), direction, and distance. All tests passing.

---

### Phase 2 — Home-centric globe map and homes
- [x] Integrate map library; show world map in **flat azimuthal** projection (e.g. orthographic), great-circle style. Use **bundled default world map** (free source; no network required) so the app works offline from first launch.
- [x] **Home at center** — Map is centered on the selected home; selected home is **always marked** on the map (e.g. pin or distinct symbol).
- [x] Support at least one home: **manual entry** of coordinates is primary. If no homes exist, use **default home** (Washington DC, White House: 38.8977 N, 77.0365 W) so the map has a center. If device location is available (e.g. Windows location), offer it as an **option** to save as a home — not required.
- [x] **Stored home locations** — User can save multiple homes (name, lat, lon); select which home is “active”; when selection changes, map recenters on that home and updates the marker. **Magnetic declination** — optional field per home (degrees, e.g. +E / −W convention); user can view and edit when adding or editing a home. Persist list **locally** (local file or app data; optional user-chosen path e.g. OneDrive).
- [x] Add e2e test: load app → map visible, centered on home → home marked; add/select different home → map recenters.

**Deliverable:** Globe map with selected home always in center and marked; multiple homes can be saved and selected.

---

### Phase 3 — Target by coordinates and stored targets
- [x] Input for target latitude/longitude (validation, **decimal degrees only**); **or** select a **saved target** from a list.
- [x] **Stored target locations** — User can save targets (name, lat, lon); select target from list or add new by coords. Persist list **locally** (same store as homes; optional user-chosen path e.g. OneDrive).
- [x] On home + target set: compute **both** short path and long path (from **selected home** to target) using Phase 1 logic.
- [x] **Map:** Selected target is **indicated on the map** (marker). Draw **great-circle lines** from home to target (short path and long path) for a clear visual.
- [x] Display **all options**: for each path show bearing from North (°), direction name, and distance in **user-selected units** (km / nm / miles; persist preference). Clearly label “Short path” and “Long path”. When the selected home has **magnetic declination** set, also show **compass (magnetic) bearing** for each path (true bearing ± declination).
- [x] Unit tests for validation and integration with core math (both paths); test magnetic bearing when declination is set.
- [x] E2e test: select home, enter valid target coords (or pick saved target) → target marked, lines drawn, both paths show correct bearing/direction/distance.

**Deliverable:** User can set target by coordinates or from saved list; map shows home (center), target (marker), great-circle lines, and numeric bearing/distance for both paths.

---

### Phase 4 — Target by map click ✅ Complete
- [x] Click on map to set target (in addition to coords and saved list); option to **save** clicked position as a new stored target.
- [x] When target changes (click, form, or list): update target marker, redraw great-circle lines (home → target), recompute and show **both** paths (bearing from North, direction, distance).
- [x] E2e test: click on map → target updates → lines and both path bearings/distances update correctly.

**Deliverable:** Target selectable by map click; same visual (target marker, lines) and numeric output; optional save to target list.

---

### Phase 5 — UX and design
- [x] Apply design direction: warm palette, clear typography, practical layout.
- [x] Responsive or fixed layout suitable for Windows (and browser if applicable).
- [x] **Home selector** — Clear way to choose among saved homes (e.g. dropdown or list); map recenters on selection.
- [x] **Target selector** — Clear way to choose saved target or add by coords/click; target marker and lines update.
- [x] **Map** — Home at center and marked; target marked; great-circle lines visible; legend; **country boundaries** and **major cities** (up to 20 in the visible area; zooming shows up to 20 cities in the new area). Cities from bundled Natural Earth 110m data.
- [x] **Results** — Clear display of **both paths** (short and long): bearing from North (°), direction name, distance in user-selected units (km/nm/miles). If home has magnetic declination: show compass bearing for each path (e.g. “True 85° / Magnetic 82°”).
- [x] Error and loading states (e.g. geolocation denied, invalid coordinates, no home/target selected).
- [ ] **Optional (deferred):** User-triggered **raster tile cache** — when online, offer an option to fetch tiles from a free source (e.g. OSM) and store locally. v1 uses richer bundled vector (countries + cities) instead; no tile caching yet.

**Deliverable:** UI aligned with “functional, warm, intentional” design; home/target selection and both path options easy to use for antenna pointing.

---

### Phase 6 — Security and hardening ✅ Complete
- [x] Identify sensitive data: stored home/target locations (local only; no accounts).
- [x] **No encryption** and **no MFA** per product decision; all preferences and locations stored locally in plain form.
- [x] No secrets in repo; **no paid map services** — use only free, open tile sources (e.g. OSM, Natural Earth); attribution as required by license, no API keys or subscriptions.

**Deliverable:** Security posture documented in `docs/security.md`; local-only storage; no encryption/MFA.

---

### Phase 7 — E2E and release prep
- [x] E2e coverage for core journeys: select home → map centers, home marked → set target (saved list, coordinates, or map click) → target marked, great-circle lines drawn → verify **both** short-path and long-path bearing from North and distance displayed.
- [x] Fix issues from e2e and manual testing.
- [x] Document how to run (dev + build) and any env requirements.
- [x] Tag/release v1: **MSIX** Windows 11 installer. Document Microsoft Store as possible future distribution.

**Deliverable:** E2e suite passing, docs updated, Windows v1 release path clear.

- [x] **Help → About:** Company (Project8X, Inc.), support contact (support@project8x.com), and license summary (free for amateur/personal use; commercial licensing on request). See `docs/licensing-and-support.md`.

**Follow-up (post-release)** — ordered easiest → longest:

1. [x] **About dialog:** Open the project8x.com link in the user's external browser instead of inside the Help/About modal (e.g. use Electron `shell.openExternal` for that link).
2. [x] **GitHub:** Add screenshots of the app to the repo (e.g. README or repo social image) so the project page shows the UI.
3. [ ] **Set home from current location:** Add an option to set (or add) home using the system's current location when available (e.g. Windows location / geolocation); manual entry remains primary; handle denied or unavailable location gracefully.
4. [ ] **License key:** Add license key input (e.g. in settings or Help/About) and validation logic to support commercial licensing (unlock or confirm licensed use; optional telemetry-free activation if desired).
5. [ ] **Optional detailed tiles:** Add an option to download more detailed tiles (e.g. from a free source like OSM) when zoomed in, to improve ad-hoc target selection on the map; cache tiles locally for offline use. Aligns with deferred "user-triggered raster tile cache" (Phase 5 / Section 7).
6. [ ] **Android (e.g. Capacitor):** Android build: Capacitor shell, replace persistence with Capacitor APIs, touch-friendly UI, optional store publish. Single repo: shared renderer and geo; platform-specific persistence and shell; run/build either Electron (Windows) or Capacitor (Android). **Android-only:** Use device compass (magnetometer) to assist orienting the phone to the calculated bearing instead of a separate physical compass.

---

## 5. Test strategy

- **Unit tests:** All business logic (short/long path bearing, distance, direction, validation); include cases like Lake Charles → Tehran (short vs long); poles; antipodal; same point. Run on every commit.
- **E2E tests:** Core user journeys: select home (map centers, home marked); set target (saved list, coords, or map click); verify target marked, great-circle lines shown, **both** path options with correct bearing from North and distance; run before release and on PRs.
- Test cases to be written before each development phase; run and fix after the phase.

---

## 6. Decisions and open questions

**Resolved (v1):**
- **Backend:** None. User can **optionally** choose a OneDrive-synced folder as the store location; no active cloud sync by the app.
- **Infrastructure:** **Windows installed application only.** Distribution via installer; Microsoft Store may be added later.
- **Current location:** Manual entry primary. If device location is available, offer as an option to save (e.g. as a new home); no requirement for geolocation.
- **MFA:** No. No user accounts.
- **Storage:** All preferences and locations **stored locally**. No encryption.

**Open:**
- **Offline maps:** See Section 7 (Offline maps: development and shipping) for how to obtain and use map tiles for offline use and development.

---

## 7. Resolved options and offline maps

Decide or explicitly defer these so they don’t block or surprise you mid-build.

**Decided (v1):**
- **Map projection:** **Flat azimuthal** (e.g. orthographic), not 3D globe.
- **Distance units:** **User selects** preferred units (km / nm / miles); persist choice in preferences.
- **Coordinate input:** **Decimal degrees only**; no DMS/DDM.
- **Magnetic declination:** **Manual entry only** for now; optional lookup deferred.
- **Desktop stack:** **Electron** (better compatibility and maturity on Windows and Microsoft Store; Tauri is lighter but less proven for Store and tooling).
- **Windows:** **Windows 11 only.**
- **Installer:** **MSIX** (supports Store submission path).
- **Data format:** **JSON** for homes, targets, and preferences; include a **schema version** field for future migrations.
- **Default home:** **Washington DC, White House** (e.g. 38.8977 N, 77.0365 W) when no homes exist.
- **Language:** **English-only** for v1.
- **Accessibility:** **No special accessibility** for v1 (revisit later if needed).
- **Maps:** **No paid subscriptions.** Bundled default world map (free source) so app works offline from first launch; optional user-triggered caching from a free tile source (e.g. OSM) when user wants more detail.
---

### Offline maps: development and shipping

**No paid services.** The app must not require any paid map subscription or API key for normal use. Use only **free, open** tile sources (e.g. OpenStreetMap, Natural Earth); attribution may be required by the provider’s license, but no sign-up or payment. The user and developer should never have to pay for map tiles, and the app must work **without being online** (no “must be online to use” requirement).

**Chosen strategy (v1):**
- **Bundled default world map** — Ship a low-detail world basemap (e.g. from Natural Earth or a small OSM-derived set) inside the app. The app works **fully offline from first launch**; no network needed to see the map, home, target, and great-circle lines.
- **Optional user-triggered caching** — When the user is online, offer an option (e.g. “Cache maps for this area” or “Download map detail”) that fetches tiles from a **free** tile source (e.g. OSM tile server) and caches them locally. Later, when offline, the app can use the cache for better detail where cached. No automatic background fetch required; user controls when to cache.

This gives: no subscriptions, no cost, no requirement to be online to use the software; optional caching for better detail when the user wants it.

**Cached maps and extra detail — options**

1. **Raster tile caching (optional, user-triggered)**  
   User clicks e.g. “Cache maps for this area”; app fetches raster tiles (e.g. OSM) for the current view (and optionally surrounding zoom levels), saves to local disk or app data. When offline or later, use cached tiles for the basemap or an overlay. **Pros:** Familiar street/terrain detail. **Cons:** Tile storage, cache invalidation, attribution; more implementation work.

2. **Richer bundled vector (no network)**  
   Ship more vector data with the app: **country boundaries** (e.g. world-atlas `countries-110m`) and **major cities** (e.g. Natural Earth populated places or a curated list). Draw country outlines and up to N cities (e.g. 20) in the current view so zooming in shows more local cities. **Pros:** Offline, no cache layer; countries and city names improve orientation. **Cons:** Bundle size; city labels only (no streets).

3. **Hybrid (future)**  
   Bundled vector for countries + cities as above; optional raster tile cache on top for extra detail when the user has cached an area.

**Chosen for v1 (Phase 5):** Option 2 — add **countries** and **major cities** to the bundled map. Limit city labels to **20 in the visible area**; when the user zooms (e.g. “Fit path”) the visible area changes and up to 20 cities in the new area are shown. No tile caching in v1.

---

**How to get maps for development (no network or no paid services)**

1. **Development**  
   - **Bundled minimal base map:** Use the same kind of asset you will ship — a low-detail world image or vector (e.g. Natural Earth, or a small OSM export). No tile server or API key needed; dev works offline.  
   - **Optional — local tile server:** If you want to test caching or higher-detail tiles, download tiles once from a **free** source (e.g. OSM via tile-downloader, OpenMapTiles, or Protomaps PMTiles). Serve them locally (e.g. `npx serve ./tiles`) and point the map at `http://localhost:PORT/{z}/{x}/{y}.png`. No subscription.

2. **Shipping**  
   - **Default:** Bundled world map (as above); app works offline from first run.  
   - **Optional caching:** When user chooses to cache, request tiles from a free public tile URL (e.g. OSM); store in app data or user-chosen folder; use cache when offline. Respect the tile provider’s usage policy and attribution.

**Free tile sources (no subscription):** OpenStreetMap (e.g. tile.openstreetmap.org — check usage policy and attribution), Natural Earth (static datasets), Protomaps (free PMTiles for small areas), or self-hosted OSM extracts. Avoid Mapbox/Google/etc. for v1 so no keys or billing are required.

---

## 8. Process reminders

- Update `plan.md` and check off items as they’re done.
- Keep `prd.md` in sync with features and acceptance criteria.
- Add new open questions to Section 6; resolve or defer items in Section 7 before starting a phase that depends on them.
- If < 90% confident on an approach, ask for clarification before implementing.
- Create test cases before each development phase; run tests and fix issues after.

---

*Last updated: 2025-03-06*
