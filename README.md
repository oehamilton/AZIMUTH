# AZIMUTH

Antenna pointing app: world map with home at center, target selection, and **short path** / **long path** bearing from North and distance. No paid map services; bundled default world map + optional user-triggered caching. Windows 11, Electron, MSIX.

See **plan.md** for the full development plan and Phase 0 detailed steps.

## Quick start

```bash
pnpm install
pnpm test
pnpm start   # builds renderer and launches Electron (Phase 2 map + homes)
```

**Test results:** Run `pnpm test:results` to run unit tests and write output to `docs/test-results.md`. Run `pnpm e2e` to launch the app briefly and record E2E result there too. Open `docs/test-results.md` to view.

## Stack (planned)

- **Platform:** Electron, Windows 11 only, MSIX installer
- **Maps:** Flat azimuthal projection; bundled default world map (free); optional cache from OSM
- **Data:** Single JSON file (homes, targets, preferences), local or user-chosen path (e.g. OneDrive)
