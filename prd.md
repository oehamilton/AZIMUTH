# AZIMUTH — Product Requirements (v1)

## Purpose

Support **antenna pointing** by showing every path from the selected home to the target: **short path** (minor arc) and **long path** (major arc), each with bearing from North and distance. User can store multiple homes and targets; map is home-centric with great-circle lines and optional map caching. No paid map services; Windows 11 only, MSIX.

## User stories

- As a user, I can **add and select a home** (antenna position) so that the map is centered on it and all bearings are from that point.
- As a user, I can **add and select a target** (by coordinates, map click, or saved list) so that I see short and long path bearing from North and distance.
- As a user, I can **see great-circle lines** on the map between home and target so I have a visual of both routes.
- As a user, I can **choose distance units** (km / nm / miles) and have my choice remembered.
- As a user, I can **optionally cache map tiles** when online so I have better detail when offline later.
- As a user, I can **use the app fully offline** (bundled default world map; no subscription required).

## Acceptance criteria (v1)

- [ ] Flat azimuthal world map; home always in center and marked; target marked; great-circle lines drawn.
- [ ] Both short-path and long-path bearing (from North), direction name, and distance displayed; user-selected units persisted.
- [ ] Multiple homes and targets; persisted in single JSON file; optional user-chosen path (e.g. OneDrive).
- [ ] Magnetic declination per home (optional); when set, compass (magnetic) bearing shown for each path.
- [ ] Default home (Washington DC, White House) when no homes exist.
- [ ] App works offline from first launch (bundled default map); optional user-triggered map caching from free source.
- [ ] Windows 11; MSIX installer.

## Out of scope (v1)

- Web version; macOS/Linux.
- User accounts; cloud sync; encryption; MFA.
- DMS/DDM coordinate input (decimal degrees only).
- Automatic magnetic declination lookup (manual only).
- Special accessibility features.
