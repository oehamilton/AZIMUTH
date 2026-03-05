import test from "node:test";
import assert from "node:assert";
import {
  bearing,
  distanceKm,
  directionFromDegrees,
  paths,
  destination,
  longPathPoints,
  magneticBearing,
  validateDecimalDegrees,
  EARTH_CIRCUMFERENCE_KM,
  EARTH_RADIUS_KM,
} from "../src/geo.js";

test("distanceKm: same point is 0", () => {
  assert.strictEqual(distanceKm(0, 0, 0, 0), 0);
  assert.strictEqual(distanceKm(38.8977, -77.0365, 38.8977, -77.0365), 0);
});

test("distanceKm: antipodal points ≈ half circumference", () => {
  const d = distanceKm(0, 0, 0, 180);
  const half = EARTH_CIRCUMFERENCE_KM / 2;
  assert.ok(Math.abs(d - half) < 1, `antipodal distance ${d} ≈ ${half}`);
});

test("bearing: North pole to equator (0,0) is South (180°)", () => {
  const b = bearing(90, 0, 0, 0);
  assert.ok(Math.abs(b - 180) < 0.01, `expected ~180, got ${b}`);
});

test("bearing: East is 90°", () => {
  const b = bearing(0, 0, 0, 1);
  assert.ok(Math.abs(b - 90) < 0.01, `expected ~90, got ${b}`);
});

test("directionFromDegrees: cardinals and sub-cardinals", () => {
  assert.strictEqual(directionFromDegrees(0), "N");
  assert.strictEqual(directionFromDegrees(45), "NE");
  assert.strictEqual(directionFromDegrees(90), "E");
  assert.strictEqual(directionFromDegrees(135), "SE");
  assert.strictEqual(directionFromDegrees(180), "S");
  assert.strictEqual(directionFromDegrees(270), "W");
  assert.strictEqual(directionFromDegrees(315), "NW");
});

test("paths: same point → short 0 km, long = circumference", () => {
  const from = { lat: 38.8977, lon: -77.0365 };
  const result = paths(from, from);
  assert.strictEqual(result.short.distanceKm, 0);
  assert.ok(Math.abs(result.long.distanceKm - EARTH_CIRCUMFERENCE_KM) < 0.01);
  assert.strictEqual((result.short.bearing + 180) % 360, result.long.bearing);
});

test("paths: Lake Charles LA to Tehran Iran — short path ~east, long path ~west", () => {
  // Lake Charles ~30.22 N, 93.22 W; Tehran ~35.69 N, 51.42 E
  const lakeCharles = { lat: 30.22, lon: -93.22 };
  const tehran = { lat: 35.69, lon: 51.42 };
  const result = paths(lakeCharles, tehran);

  // Short path: roughly east (bearing 30–90° range for this route)
  assert.ok(result.short.bearing > 20 && result.short.bearing < 100, `short bearing ${result.short.bearing}° should be ~E`);
  assert.ok(
    ["N", "NE", "E"].includes(result.short.direction),
    `short direction ${result.short.direction} should be N/NE/E`
  );
  // Short distance ~11–12k km
  assert.ok(result.short.distanceKm > 10_000 && result.short.distanceKm < 13_000, `short distance ${result.short.distanceKm} km`);

  // Long path: other way around globe
  assert.ok(result.long.distanceKm > 27_000 && result.long.distanceKm < 31_000, `long distance ${result.long.distanceKm} km`);
  assert.strictEqual(
    Math.round((result.short.bearing + 180) % 360),
    Math.round(result.long.bearing),
    "long bearing = short + 180°"
  );
  assert.ok(result.short.distanceKm + result.long.distanceKm >= EARTH_CIRCUMFERENCE_KM - 1);
});

test("paths: short + long distance ≈ circumference", () => {
  const from = { lat: -33.9, lon: 18.4 };
  const to = { lat: 55.75, lon: 37.6 };
  const result = paths(from, to);
  const sum = result.short.distanceKm + result.long.distanceKm;
  assert.ok(Math.abs(sum - EARTH_CIRCUMFERENCE_KM) < 1, `short+long ${sum} ≈ ${EARTH_CIRCUMFERENCE_KM}`);
});

test("paths: returns bearing (0–360), direction string, distanceKm for both", () => {
  const result = paths({ lat: 0, lon: 0 }, { lat: 1, lon: 1 });
  assert.ok(typeof result.short.bearing === "number" && result.short.bearing >= 0 && result.short.bearing < 360);
  assert.ok(typeof result.short.direction === "string");
  assert.ok(typeof result.short.distanceKm === "number" && result.short.distanceKm >= 0);
  assert.ok(typeof result.long.bearing === "number" && result.long.bearing >= 0 && result.long.bearing < 360);
  assert.ok(typeof result.long.direction === "string");
  assert.ok(typeof result.long.distanceKm === "number" && result.long.distanceKm >= 0);
});

test("destination: from (0,0) bearing 0° distance 111km ≈ (1, 0)", () => {
  const p = destination({ lat: 0, lon: 0 }, 0, 111);
  assert.ok(Math.abs(p.lat - 1) < 0.01, `lat ${p.lat} ≈ 1`);
  assert.ok(Math.abs(p.lon - 0) < 0.01, `lon ${p.lon} ≈ 0`);
});

test("longPathPoints: returns array of [lon, lat], first = from, last ≈ to", () => {
  const from = { lat: 0, lon: 0 };
  const to = { lat: 0, lon: 1 };
  const pts = longPathPoints(from, to, 10);
  assert.strictEqual(pts.length, 11);
  assert.strictEqual(pts[0][0], 0);
  assert.strictEqual(pts[0][1], 0);
  const lastLon = pts[10][0];
  const lastLat = pts[10][1];
  assert.ok(Math.abs(lastLon - 1) < 0.1 || Math.abs(lastLon + 359) < 0.1, `last lon ${lastLon} ≈ 1`);
  assert.ok(Math.abs(lastLat - 0) < 0.1, `last lat ${lastLat} ≈ 0`);
});

test("magneticBearing: true 85° decl +3° → magnetic 82°", () => {
  assert.strictEqual(magneticBearing(85, 3), 82);
});

test("magneticBearing: true 10° decl -5° → magnetic 15°", () => {
  assert.strictEqual(magneticBearing(10, -5), 15);
});

test("validateDecimalDegrees: valid returns { lat, lon }", () => {
  assert.deepStrictEqual(validateDecimalDegrees(38.9, -77), { lat: 38.9, lon: -77 });
  assert.deepStrictEqual(validateDecimalDegrees(-90, 180), { lat: -90, lon: 180 });
});

test("validateDecimalDegrees: invalid returns null", () => {
  assert.strictEqual(validateDecimalDegrees(NaN, 0), null);
  assert.strictEqual(validateDecimalDegrees(0, NaN), null);
  assert.strictEqual(validateDecimalDegrees(91, 0), null);
  assert.strictEqual(validateDecimalDegrees(0, 181), null);
  assert.strictEqual(validateDecimalDegrees(-91, 0), null);
  assert.strictEqual(validateDecimalDegrees(0, -181), null);
});
