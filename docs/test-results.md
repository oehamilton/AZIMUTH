# Test results

View this file to see latest test output. Regenerate with:

- **Unit tests:** `pnpm test:results` — writes Phase 1 geo test output below.
- **E2E (Phase 2):** `pnpm e2e` — launches the app for 3s and records result. If Electron fails to start, run `pnpm approve-builds` (or reinstall) and try again.

---

## Unit tests (Phase 1 geo)

Run: `pnpm test` or `pnpm test:results`

(Results will appear below after running `pnpm test:results`.)

---

## E2E (Phase 2)

Run: `pnpm e2e`

(Results will appear below after running e2e.)

## Unit test run — 2026-03-05T03:21:52.416Z

```
TAP version 13
# Subtest: distanceKm: same point is 0
ok 1 - distanceKm: same point is 0
  ---
  duration_ms: 1.219
  type: 'test'
  ...
# Subtest: distanceKm: antipodal points ≈ half circumference
ok 2 - distanceKm: antipodal points ≈ half circumference
  ---
  duration_ms: 0.195
  type: 'test'
  ...
# Subtest: bearing: North pole to equator (0,0) is South (180°)
ok 3 - bearing: North pole to equator (0,0) is South (180°)
  ---
  duration_ms: 0.1645
  type: 'test'
  ...
# Subtest: bearing: East is 90°
ok 4 - bearing: East is 90°
  ---
  duration_ms: 0.119
  type: 'test'
  ...
# Subtest: directionFromDegrees: cardinals and sub-cardinals
ok 5 - directionFromDegrees: cardinals and sub-cardinals
  ---
  duration_ms: 0.2451
  type: 'test'
  ...
# Subtest: paths: same point → short 0 km, long = circumference
ok 6 - paths: same point → short 0 km, long = circumference
  ---
  duration_ms: 0.2079
  type: 'test'
  ...
# Subtest: paths: Lake Charles LA to Tehran Iran — short path ~east, long path ~west
ok 7 - paths: Lake Charles LA to Tehran Iran — short path ~east, long path ~west
  ---
  duration_ms: 0.2748
  type: 'test'
  ...
# Subtest: paths: short + long distance ≈ circumference
ok 8 - paths: short + long distance ≈ circumference
  ---
  duration_ms: 0.1567
  type: 'test'
  ...
# Subtest: paths: returns bearing (0–360), direction string, distanceKm for both
ok 9 - paths: returns bearing (0–360), direction string, distanceKm for both
  ---
  duration_ms: 0.3597
  type: 'test'
  ...
# Subtest: destination: from (0,0) bearing 0° distance 111km ≈ (1, 0)
ok 10 - destination: from (0,0) bearing 0° distance 111km ≈ (1, 0)
  ---
  duration_ms: 0.4825
  type: 'test'
  ...
# Subtest: longPathPoints: returns array of [lon, lat], first = from, last ≈ to
ok 11 - longPathPoints: returns array of [lon, lat], first = from, last ≈ to
  ---
  duration_ms: 0.3634
  type: 'test'
  ...
# Subtest: magneticBearing: true 85° decl +3° → magnetic 82°
ok 12 - magneticBearing: true 85° decl +3° → magnetic 82°
  ---
  duration_ms: 0.1304
  type: 'test'
  ...
# Subtest: magneticBearing: true 10° decl -5° → magnetic 15°
ok 13 - magneticBearing: true 10° decl -5° → magnetic 15°
  ---
  duration_ms: 0.0859
  type: 'test'
  ...
# Subtest: validateDecimalDegrees: valid returns { lat, lon }
ok 14 - validateDecimalDegrees: valid returns { lat, lon }
  ---
  duration_ms: 0.7496
  type: 'test'
  ...
# Subtest: validateDecimalDegrees: invalid returns null
ok 15 - validateDecimalDegrees: invalid returns null
  ---
  duration_ms: 0.1598
  type: 'test'
  ...
1..15
# tests 15
# suites 0
# pass 15
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 99.4423

```

**Exit code:** 0

### E2E run at 2026-03-05T19:39:58.183Z

✅ E2E: Home selector visible with at least one home.
✅ E2E: Target set; Great-Circle and Loxodrome with bearing and distance displayed.
✅ E2E: Map shows great-circle and loxodrome path elements.
