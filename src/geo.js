/**
 * Geodetic utilities (WGS84): bearing, distance, and short/long path between two points.
 * Bearings are from North (0–360°). No UI; pure functions.
 */

const EARTH_RADIUS_KM = 6371;
const EARTH_CIRCUMFERENCE_KM = 2 * Math.PI * EARTH_RADIUS_KM;

const DEG2RAD = Math.PI / 180;

/**
 * Forward bearing (azimuth) from point A to B, in degrees 0–360 from North.
 * @param {number} lat1 - Latitude of A (decimal degrees).
 * @param {number} lon1 - Longitude of A (decimal degrees).
 * @param {number} lat2 - Latitude of B (decimal degrees).
 * @param {number} lon2 - Longitude of B (decimal degrees).
 * @returns {number} Bearing in degrees 0–360.
 */
export function bearing(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * DEG2RAD;
  const φ2 = lat2 * DEG2RAD;
  const Δλ = (lon2 - lon1) * DEG2RAD;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x) * (180 / Math.PI);
  return (θ + 360) % 360;
}

/**
 * Haversine distance between two points in km.
 * @param {number} lat1 - Latitude of A (decimal degrees).
 * @param {number} lon1 - Longitude of A (decimal degrees).
 * @param {number} lat2 - Latitude of B (decimal degrees).
 * @param {number} lon2 - Longitude of B (decimal degrees).
 * @returns {number} Distance in km.
 */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * DEG2RAD;
  const φ2 = lat2 * DEG2RAD;
  const Δφ = (lat2 - lat1) * DEG2RAD;
  const Δλ = (lon2 - lon1) * DEG2RAD;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Cardinal/sub-cardinal direction label from bearing in degrees (0–360).
 * @param {number} degrees - Bearing from North.
 * @returns {string} e.g. "N", "NE", "E", "SE", "S", "SW", "W", "NW".
 */
export function directionFromDegrees(degrees) {
  const normalized = ((Number(degrees) % 360) + 360) % 360;
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const step = 360 / 8;
  const index = Math.round(normalized / step) % 8;
  return labels[index];
}

/**
 * Short path (minor arc) and long path (major arc) from A to B.
 * @param {{ lat: number, lon: number }} from - Origin (decimal degrees).
 * @param {{ lat: number, lon: number }} to - Destination (decimal degrees).
 * @returns {{ short: { bearing: number, direction: string, distanceKm: number }, long: { bearing: number, direction: string, distanceKm: number } }}
 */
/**
 * Destination point from start given bearing and distance (km). WGS84.
 * @param {{ lat: number, lon: number }} from - Start (decimal degrees).
 * @param {number} bearingDeg - Bearing from North, degrees 0–360.
 * @param {number} distanceKm - Distance in km.
 * @returns {{ lat: number, lon: number }}
 */
export function destination(from, bearingDeg, distanceKm) {
  const φ1 = from.lat * DEG2RAD;
  const λ1 = from.lon * DEG2RAD;
  const brng = bearingDeg * DEG2RAD;
  const δ = distanceKm / EARTH_RADIUS_KM;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(brng));
  const λ2 = λ1 + Math.atan2(Math.sin(brng) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  const lonDeg = λ2 * (180 / Math.PI);
  return { lat: φ2 * (180 / Math.PI), lon: ((lonDeg + 540) % 360) - 180 };
}

/**
 * Isometric (Mercator) latitude for rhumb line math: ψ = ln(tan(φ/2 + π/4)).
 * @param {number} phiRad - Latitude in radians.
 * @returns {number}
 */
function isometricLatitude(phiRad) {
  return Math.log(Math.tan(phiRad / 2 + Math.PI / 4));
}

/**
 * Rhumb (loxodrome) bearing from A to B, constant along the line. Degrees 0–360 from North.
 * @param {number} lat1 - Latitude of A (decimal degrees).
 * @param {number} lon1 - Longitude of A (decimal degrees).
 * @param {number} lat2 - Latitude of B (decimal degrees).
 * @param {number} lon2 - Longitude of B (decimal degrees).
 * @returns {number} Bearing in degrees 0–360.
 */
export function rhumbBearing(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * DEG2RAD;
  const φ2 = lat2 * DEG2RAD;
  let Δλ = ((lon2 - lon1) % 360) * DEG2RAD;
  if (Δλ > Math.PI) Δλ -= 2 * Math.PI;
  if (Δλ < -Math.PI) Δλ += 2 * Math.PI;
  const Δψ = isometricLatitude(φ2) - isometricLatitude(φ1);
  const θ = Math.atan2(Δλ, Δψ) * (180 / Math.PI);
  return (θ + 360) % 360;
}

/**
 * Distance along the rhumb line from A to B in km (direct segment, no windings).
 * @param {number} lat1 - Latitude of A (decimal degrees).
 * @param {number} lon1 - Longitude of A (decimal degrees).
 * @param {number} lat2 - Latitude of B (decimal degrees).
 * @param {number} lon2 - Longitude of B (decimal degrees).
 * @returns {number} Distance in km.
 */
export function rhumbDistanceKm(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * DEG2RAD;
  const φ2 = lat2 * DEG2RAD;
  let Δλ = ((lon2 - lon1) % 360) * DEG2RAD;
  if (Δλ > Math.PI) Δλ -= 2 * Math.PI;
  if (Δλ < -Math.PI) Δλ += 2 * Math.PI;
  const β = rhumbBearing(lat1, lon1, lat2, lon2) * DEG2RAD;
  const cosβ = Math.cos(β);
  if (Math.abs(cosβ) < 1e-9) {
    return EARTH_RADIUS_KM * Math.abs(Δλ) * Math.cos(φ1);
  }
  const Δφ = φ2 - φ1;
  return EARTH_RADIUS_KM * Math.abs(Δφ) / Math.abs(cosβ);
}

/**
 * Destination point along a rhumb line from start with constant bearing and distance (km).
 * @param {{ lat: number, lon: number }} from - Start (decimal degrees).
 * @param {number} bearingDeg - Bearing from North, degrees 0–360.
 * @param {number} distanceKm - Distance in km.
 * @returns {{ lat: number, lon: number }}
 */
export function rhumbDestination(from, bearingDeg, distanceKm) {
  const φ1 = from.lat * DEG2RAD;
  const λ1 = from.lon * DEG2RAD;
  const β = bearingDeg * DEG2RAD;
  const δ = distanceKm / EARTH_RADIUS_KM;
  const cosβ = Math.cos(β);
  let φ2, Δλ;
  if (Math.abs(cosβ) < 1e-9) {
    φ2 = φ1;
    Δλ = δ * Math.sin(β) / Math.cos(φ1);
  } else {
    const Δφ = δ * cosβ;
    φ2 = φ1 + Δφ;
    const ψ1 = isometricLatitude(φ1);
    const ψ2 = isometricLatitude(φ2);
    Δλ = (ψ2 - ψ1) * Math.tan(β);
  }
  let λ2 = (λ1 + Δλ) * (180 / Math.PI);
  λ2 = ((λ2 + 540) % 360) - 180;
  return { lat: φ2 * (180 / Math.PI), lon: λ2 };
}

/**
 * Points along the direct loxodrome (rhumb) segment from A to B, for drawing. Single curve, no windings.
 * @param {{ lat: number, lon: number }} from
 * @param {{ lat: number, lon: number }} to
 * @param {number} steps - Number of segments.
 * @returns {[number, number][]} Array of [lon, lat] in decimal degrees.
 */
export function loxodromePoints(from, to, steps = 64) {
  const β = rhumbBearing(from.lat, from.lon, to.lat, to.lon);
  const d = rhumbDistanceKm(from.lat, from.lon, to.lat, to.lon);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (d * i) / steps;
    const p = rhumbDestination(from, β, t);
    pts.push([p.lon, p.lat]);
  }
  return pts;
}

/**
 * Loxodrome (rhumb) path info from A to B: bearing and distance for the direct segment.
 * @param {{ lat: number, lon: number }} from
 * @param {{ lat: number, lon: number }} to
 * @returns {{ bearing: number, direction: string, distanceKm: number }}
 */
export function loxodromePath(from, to) {
  const lat1 = from.lat;
  const lon1 = from.lon;
  const lat2 = to.lat;
  const lon2 = to.lon;
  const bearingDeg = rhumbBearing(lat1, lon1, lat2, lon2);
  const distanceKm = rhumbDistanceKm(lat1, lon1, lat2, lon2);
  return {
    bearing: bearingDeg,
    direction: directionFromDegrees(bearingDeg),
    distanceKm,
  };
}

/**
 * Points along the long path from A to B (major arc), for drawing. Returns array of [lon, lat] in decimal degrees.
 * @param {{ lat: number, lon: number }} from
 * @param {{ lat: number, lon: number }} to
 * @param {number} steps - Number of segments.
 * @returns {[number, number][]}
 */
export function longPathPoints(from, to, steps = 64) {
  const { long } = paths(from, to);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const d = (long.distanceKm * i) / steps;
    const p = destination(from, long.bearing, d);
    pts.push([p.lon, p.lat]);
  }
  return pts;
}

export function paths(from, to) {
  const lat1 = from.lat;
  const lon1 = from.lon;
  const lat2 = to.lat;
  const lon2 = to.lon;

  const shortDistanceKm = distanceKm(lat1, lon1, lat2, lon2);
  const shortBearing = bearing(lat1, lon1, lat2, lon2);
  const longBearing = (shortBearing + 180) % 360;
  const longDistanceKm = Math.max(0, EARTH_CIRCUMFERENCE_KM - shortDistanceKm);

  return {
    short: {
      bearing: shortBearing,
      direction: directionFromDegrees(shortBearing),
      distanceKm: shortDistanceKm,
    },
    long: {
      bearing: longBearing,
      direction: directionFromDegrees(longBearing),
      distanceKm: longDistanceKm,
    },
  };
}

/**
 * Compass (magnetic) bearing from true bearing and magnetic declination. +E / −W convention.
 * magneticBearing = trueBearing - declination (e.g. true 85°, decl +3° → magnetic 82°).
 */
export function magneticBearing(trueBearingDeg, declinationDeg) {
  const d = Number(declinationDeg) || 0;
  return ((trueBearingDeg - d + 360) % 360 + 360) % 360;
}

/**
 * Validate decimal degrees. Returns { lat, lon } or null if invalid.
 * @param {number} lat - Latitude (-90 to 90).
 * @param {number} lon - Longitude (-180 to 180).
 */
export function validateDecimalDegrees(lat, lon) {
  const la = Number(lat);
  const lo = Number(lon);
  if (Number.isNaN(la) || Number.isNaN(lo)) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return { lat: la, lon: lo };
}

export { EARTH_RADIUS_KM, EARTH_CIRCUMFERENCE_KM };
