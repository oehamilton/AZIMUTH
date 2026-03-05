import * as d3 from "d3-geo";
import { feature } from "topojson-client";
import land110m from "world-atlas/land-110m.json";
import countries110m from "world-atlas/countries-110m.json";
import { paths, loxodromePoints, loxodromePath, validateDecimalDegrees, magneticBearing, distanceKm, directionFromDegrees } from "../geo.js";
import majorCities from "../data/major-cities.json" with { type: "json" };

const worldLand = feature(land110m, land110m.objects.land);
const worldCountries = feature(countries110m, countries110m.objects.countries);

function clearLoadStatus(err) {
  const el = document.getElementById("load-status");
  if (!el) return;
  if (err) {
    el.style.color = "#c44";
    el.textContent = "Error: " + (err.message || String(err));
    return;
  }
  el.remove();
}

try {
  clearLoadStatus();
} catch (e) {
  clearLoadStatus(e);
  throw e;
}

const DEFAULT_HOME = { id: "default-dc", name: "Washington DC, White House", lat: 38.8977, lon: -77.0365 };
const KM_PER_NM = 1.852;
const KM_PER_MILE = 1.60934;

const MAP_ZOOM_FULL = "full";
const MAP_ZOOM_FIT_PATH = "fit-path";
const MAX_CITIES_IN_VIEW = 20;

let state = {
  homes: [DEFAULT_HOME],
  activeHomeId: DEFAULT_HOME.id,
  targets: [],
  selectedTargetId: null,
  targetCoords: null,
  data: null,
  mapZoom: MAP_ZOOM_FULL,
};

function getActiveHome() {
  return state.homes.find((h) => h.id === state.activeHomeId) || state.homes[0];
}

function getCurrentTarget() {
  if (state.targetCoords) return state.targetCoords;
  const t = state.targets.find((x) => x.id === state.selectedTargetId);
  return t ? { lat: t.lat, lon: t.lon } : null;
}

function distanceInUnit(km, unit) {
  if (unit === "nm") return km / KM_PER_NM;
  if (unit === "miles") return km / KM_PER_MILE;
  return km;
}

function unitLabel(unit) {
  return { km: "km", nm: "nm", miles: "mi" }[unit] || "km";
}

const EARTH_RADIUS_KM = 6371;

function getProjection() {
  const home = getActiveHome();
  const target = getCurrentTarget();
  const container = document.getElementById("map-container");
  const width = container?.clientWidth || 400;
  const height = container?.clientHeight || 300;
  const projection = d3.geoAzimuthalEquidistant();
  projection.rotate([-home.lon, -home.lat]);
  projection.center([0, 0]);
  if (state.mapZoom === MAP_ZOOM_FIT_PATH) {
    try {
      let angleDeg = 10;
      if (target) {
        const distKm = distanceKm(home.lat, home.lon, target.lat, target.lon);
        const angleRad = distKm / EARTH_RADIUS_KM;
        angleDeg = Math.max(5, (angleRad * (180 / Math.PI)) * 1.25);
      }
      const circle = d3.geoCircle().center([home.lon, home.lat]).radius(angleDeg)();
      projection.fitSize([width, height], circle);
    } catch (_) {
      projection.fitSize([width, height], { type: "Sphere" });
    }
  } else {
    projection.fitSize([width, height], { type: "Sphere" });
  }
  return projection;
}

function renderMap() {
  const home = getActiveHome();
  const target = getCurrentTarget();
  const width = document.getElementById("map-container").clientWidth;
  const height = document.getElementById("map-container").clientHeight;
  const projection = getProjection();
  const path = d3.geoPath(projection);
  const svg = document.getElementById("map");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.innerHTML = "";

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.appendChild(g);

  const sphere = { type: "Sphere" };
  const spherePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  spherePath.setAttribute("d", path(sphere));
  spherePath.setAttribute("fill", "#1e1c1a");
  spherePath.setAttribute("stroke", "#3a3632");
  spherePath.setAttribute("stroke-width", "1");
  g.appendChild(spherePath);

  worldLand.features.forEach((f) => {
    const d = path(f);
    if (d) {
      const landPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      landPath.setAttribute("d", d);
      landPath.setAttribute("fill", "#2d2a26");
      landPath.setAttribute("stroke", "#3a3632");
      landPath.setAttribute("stroke-width", "0.5");
      g.appendChild(landPath);
    }
  });

  worldCountries.features.forEach((f) => {
    const d = path(f);
    if (d) {
      const countryPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      countryPath.setAttribute("d", d);
      countryPath.setAttribute("fill", "none");
      countryPath.setAttribute("stroke", "#4a4540");
      countryPath.setAttribute("stroke-width", "0.6");
      countryPath.setAttribute("class", "country-boundary");
      g.appendChild(countryPath);
    }
  });

  const graticule = d3.geoGraticule();
  const graticulePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  graticulePath.setAttribute("d", path(graticule()));
  graticulePath.setAttribute("fill", "none");
  graticulePath.setAttribute("stroke", "#3a3632");
  graticulePath.setAttribute("stroke-width", "0.5");
  g.appendChild(graticulePath);

  const pathGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  pathGroup.setAttribute("fill", "none");
  if (target && home) {
    function projectLine(coordinates) {
      const segments = [];
      let current = [];
      for (const [lon, lat] of coordinates) {
        const xy = projection([lon, lat]);
        if (xy.every(Number.isFinite)) {
          current.push(xy);
        } else {
          if (current.length >= 2) segments.push(current);
          current = [];
        }
      }
      if (current.length >= 2) segments.push(current);
      if (segments.length === 0) return null;
      return segments
        .map((pts) => "M" + pts[0].join(",") + "L" + pts.slice(1).map(([x, y]) => `${x},${y}`).join("L"))
        .join(" ");
    }
    const shortLine = d3.geoInterpolate([home.lon, home.lat], [target.lon, target.lat]);
    const shortPts = [];
    for (let i = 0; i <= 64; i++) shortPts.push(shortLine(i / 64));
    const shortD = projectLine(shortPts);
    if (shortD) {
      const shortPathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
      shortPathEl.setAttribute("d", shortD);
      shortPathEl.setAttribute("stroke", "#c4a574");
      shortPathEl.setAttribute("stroke-width", "1.5");
      shortPathEl.setAttribute("opacity", "0.9");
      shortPathEl.setAttribute("class", "path-short");
      pathGroup.appendChild(shortPathEl);
    }

    const loxoPts = loxodromePoints(home, target, 64);
    const loxoD = projectLine(loxoPts);
    if (loxoD) {
      const loxoPathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
      loxoPathEl.setAttribute("d", loxoD);
      loxoPathEl.setAttribute("stroke", "#8b7355");
      loxoPathEl.setAttribute("stroke-width", "1");
      loxoPathEl.setAttribute("stroke-dasharray", "4,2");
      loxoPathEl.setAttribute("opacity", "0.8");
      loxoPathEl.setAttribute("class", "path-loxodrome");
      pathGroup.appendChild(loxoPathEl);
    }
  }
  g.appendChild(pathGroup);

  const cx = width / 2;
  const cy = height / 2;
  const viewRadius = Math.min(width, height) / 2;
  const inView = (c) => {
    const xy = projection([c.lon, c.lat]);
    if (!xy.every(Number.isFinite)) return false;
    return Math.hypot(xy[0] - cx, xy[1] - cy) <= viewRadius;
  };
  const visibleCities = majorCities
    .filter(inView)
    .sort((a, b) => (b.p || 0) - (a.p || 0))
    .slice(0, MAX_CITIES_IN_VIEW);
  const cityGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  cityGroup.setAttribute("class", "map-cities");
  visibleCities.forEach((c) => {
    const [x, y] = projection([c.lon, c.lat]);
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", 2);
    dot.setAttribute("class", "city-dot");
    cityGroup.appendChild(dot);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x + 4);
    label.setAttribute("y", y + 1);
    label.setAttribute("class", "city-label");
    label.setAttribute("font-size", "10");
    label.textContent = c.n;
    cityGroup.appendChild(label);
  });
  g.appendChild(cityGroup);

  const [hx, hy] = projection([home.lon, home.lat]);
  const homeMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  homeMarker.setAttribute("cx", hx);
  homeMarker.setAttribute("cy", hy);
  homeMarker.setAttribute("r", 8);
  homeMarker.setAttribute("class", "home-marker");
  g.appendChild(homeMarker);

  if (target) {
    const [tx, ty] = projection([target.lon, target.lat]);
    const targetMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    targetMarker.setAttribute("cx", tx);
    targetMarker.setAttribute("cy", ty);
    targetMarker.setAttribute("r", 6);
    targetMarker.setAttribute("class", "target-marker");
    g.appendChild(targetMarker);
  }

  const zoomFit = document.getElementById("zoom-fit-path");
  const zoomFull = document.getElementById("zoom-full");
  if (zoomFit) zoomFit.classList.toggle("active", state.mapZoom === MAP_ZOOM_FIT_PATH);
  if (zoomFull) zoomFull.classList.toggle("active", state.mapZoom === MAP_ZOOM_FULL);
}

const NEW_HOME_VALUE = "__new__";
const NEW_TARGET_VALUE = "__new__";

function fillHomeForm(home) {
  const nameEl = document.getElementById("home-name");
  const latEl = document.getElementById("home-lat");
  const lonEl = document.getElementById("home-lon");
  const declEl = document.getElementById("home-decl");
  if (nameEl) nameEl.value = home.name ?? "";
  if (latEl) latEl.value = home.lat ?? "";
  if (lonEl) lonEl.value = home.lon ?? "";
  if (declEl) declEl.value = home.magneticDeclination != null ? home.magneticDeclination : "";
}

function clearHomeForm() {
  fillHomeForm({ name: "", lat: "", lon: "", magneticDeclination: "" });
}

function syncHomeFormToSelection() {
  const sel = document.getElementById("home-select");
  const btn = document.getElementById("home-submit-btn");
  const delBtn = document.getElementById("delete-home-btn");
  const nameRow = document.getElementById("home-name-row");
  if (!sel || !btn) return;
  if (sel.value === NEW_HOME_VALUE || sel.value === "") {
    clearHomeForm();
    btn.textContent = "Add home";
    if (delBtn) delBtn.style.display = "none";
    if (nameRow) nameRow.classList.add("visible");
  } else {
    const home = state.homes.find((h) => h.id === sel.value);
    if (home) {
      fillHomeForm(home);
      btn.textContent = "Update home";
      if (delBtn) delBtn.style.display = "block";
    }
    if (nameRow) nameRow.classList.remove("visible");
  }
}

function renderHomeSelect() {
  const sel = document.getElementById("home-select");
  if (!sel) return;
  sel.innerHTML = "";
  const newOpt = document.createElement("option");
  newOpt.value = NEW_HOME_VALUE;
  newOpt.textContent = "— New home —";
  sel.appendChild(newOpt);
  state.homes.forEach((h) => {
    const opt = document.createElement("option");
    opt.value = h.id;
    opt.textContent = h.name;
    sel.appendChild(opt);
  });
  sel.value = state.activeHomeId || state.homes[0]?.id || NEW_HOME_VALUE;
  syncHomeFormToSelection();
}

function fillTargetForm(target, nameOverride = "") {
  const nameEl = document.getElementById("target-name");
  const latEl = document.getElementById("target-lat");
  const lonEl = document.getElementById("target-lon");
  const name = nameOverride !== "" ? nameOverride : (target?.name ?? "");
  if (nameEl) nameEl.value = name;
  if (latEl) latEl.value = target?.lat ?? "";
  if (lonEl) lonEl.value = target?.lon ?? "";
}

function clearTargetForm() {
  fillTargetForm(null, "");
}

function syncTargetFormToSelection() {
  const sel = document.getElementById("target-select");
  const btn = document.getElementById("target-submit-btn");
  const saveBtn = document.getElementById("save-target-btn");
  const delBtn = document.getElementById("delete-target-btn");
  const nameRow = document.getElementById("target-name-row");
  if (!btn) return;
  if (state.targetCoords) {
    fillTargetForm(state.targetCoords);
    if (document.getElementById("target-name")) document.getElementById("target-name").value = "";
    btn.textContent = "Set target";
    if (saveBtn) saveBtn.style.display = "block";
    if (delBtn) delBtn.style.display = "none";
    if (nameRow) nameRow.classList.add("visible");
  } else if (sel?.value === NEW_TARGET_VALUE || (!state.selectedTargetId && !state.targetCoords)) {
    clearTargetForm();
    btn.textContent = "Add target";
    if (saveBtn) saveBtn.style.display = "none";
    if (delBtn) delBtn.style.display = "none";
    if (nameRow) nameRow.classList.add("visible");
  } else if (state.selectedTargetId) {
    const t = state.targets.find((x) => x.id === state.selectedTargetId);
    if (t) {
      fillTargetForm(t);
      btn.textContent = "Update target";
    }
    if (saveBtn) saveBtn.style.display = "none";
    if (delBtn) delBtn.style.display = "block";
    if (nameRow) nameRow.classList.remove("visible");
  } else {
    clearTargetForm();
    btn.textContent = "Set target";
    if (saveBtn) saveBtn.style.display = "none";
    if (delBtn) delBtn.style.display = "none";
    if (nameRow) nameRow.classList.remove("visible");
  }
}

function renderTargetSelect() {
  const sel = document.getElementById("target-select");
  if (!sel) return;
  sel.innerHTML = "";
  const addOpt = (value, label) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    sel.appendChild(opt);
  };
  addOpt(NEW_TARGET_VALUE, "— New target —");
  if (state.targetCoords) {
    addOpt("__custom__", "— Custom coords —");
  }
  state.targets.forEach((t) => {
    addOpt(t.id, t.name);
  });
  const want = state.targetCoords ? "__custom__" : (state.selectedTargetId || NEW_TARGET_VALUE);
  sel.value = want;
  syncTargetFormToSelection();
}

function showSidebarError(message) {
  const el = document.getElementById("sidebar-error");
  if (!el) return;
  el.textContent = message;
  el.classList.add("visible");
}

function clearSidebarError() {
  const el = document.getElementById("sidebar-error");
  if (!el) return;
  el.textContent = "";
  el.classList.remove("visible");
}

function getAntennaType() {
  const radio = document.querySelector('input[name="antenna-type"]:checked');
  return (radio && radio.value === "endfed") ? "endfed" : "yagi";
}

function renderResults() {
  const home = getActiveHome();
  const target = getCurrentTarget();
  const unit = (state.data?.preferences?.distanceUnit) || "km";
  const antennaType = state.data?.preferences?.antennaType ?? getAntennaType();
  const content = document.getElementById("results-content");
  const unitSelect = document.getElementById("distance-unit");
  const targetHint = document.getElementById("target-hint");
  const antennaYagi = document.querySelector('input[name="antenna-type"][value="yagi"]');
  const antennaEndfed = document.querySelector('input[name="antenna-type"][value="endfed"]');
  if (unitSelect) unitSelect.value = unit;
  if (antennaYagi) antennaYagi.checked = antennaType === "yagi";
  if (antennaEndfed) antennaEndfed.checked = antennaType === "endfed";
  if (targetHint) targetHint.style.visibility = target ? "hidden" : "visible";

  if (!target) {
    content.innerHTML = "<p class=\"path-detail\" style=\"color: var(--text-muted);\">Set a target by coordinates, map click, or saved list to see Great-Circle and Loxodrome.</p>";
    return;
  }

  const result = paths(home, target);
  const loxo = loxodromePath(home, target);
  const decl = home.magneticDeclination != null ? home.magneticDeclination : null;
  const unitLbl = unitLabel(unit);
  const isEndFed = antennaType === "endfed";

  const pathPopups = {
    "Great-Circle": "The shortest path between two points on the globe (an arc of a great circle). Distance and bearing shown are for this path.",
    "Loxodrome": "A path of constant compass bearing (rhumb line). Longer than the great circle but easier to follow by keeping a fixed heading.",
  };

  function pathBlock(label, r) {
    const dist = distanceInUnit(r.distanceKm, unit);
    let displayBearing = r.bearing;
    let displayDirection = r.direction;
    let bearingLabel = "";
    if (isEndFed) {
      displayBearing = (r.bearing - 90 + 360) % 360;
      displayDirection = directionFromDegrees(displayBearing);
      bearingLabel = " (wire)";
    }
    let detail = `${displayBearing.toFixed(1)}° ${displayDirection}${bearingLabel} — ${dist.toFixed(1)} ${unitLbl}`;
    let magnetic = "";
    if (decl != null) {
      const mag = magneticBearing(displayBearing, decl);
      magnetic = `True ${displayBearing.toFixed(0)}° / Magnetic ${mag.toFixed(0)}°`;
    }
    const popupText = pathPopups[label] || "";
    return `<div class="path-block"><div class="path-label-row"><span class="path-label">${label}</span><span class="results-info" aria-label="${label} description">i</span><span class="results-popup">${popupText}</span></div><div class="path-detail">${detail}${magnetic ? `<div class="magnetic">${magnetic}</div>` : ""}</div></div>`;
  }

  content.innerHTML = pathBlock("Great-Circle", result.short) + pathBlock("Loxodrome", loxo);
}

async function persist() {
  if (!window.azimuth || !state.data) return;
  state.data.homes = state.homes;
  state.data.targets = state.targets;
  state.data.preferences = state.data.preferences || {};
  state.data.preferences.distanceUnit = document.getElementById("distance-unit")?.value || "km";
  state.data.preferences.antennaType = getAntennaType();
  await window.azimuth.saveData(state.data);
}

async function loadAndRender() {
  clearSidebarError();
  if (!window.azimuth) {
    renderHomeSelect();
    renderTargetSelect();
    renderMap();
    renderResults();
    return;
  }
  try {
    const data = await window.azimuth.loadData();
    state.data = data;
    state.homes = data.homes?.length ? data.homes : [DEFAULT_HOME];
    state.targets = data.targets || [];
    if (!state.homes.find((h) => h.id === state.activeHomeId)) state.activeHomeId = state.homes[0].id;
    const unit = data.preferences?.distanceUnit || "km";
    if (data.preferences) state.data.preferences = data.preferences;
    renderHomeSelect();
    renderTargetSelect();
    renderMap();
    renderResults();
  } catch (e) {
    showSidebarError("Could not load saved data. Using defaults.");
    state.homes = [DEFAULT_HOME];
    state.targets = [];
    state.activeHomeId = DEFAULT_HOME.id;
    state.selectedTargetId = null;
    state.targetCoords = null;
    renderHomeSelect();
    renderTargetSelect();
    renderMap();
    renderResults();
  }
}

window.addEventListener("resize", () => {
  if (getActiveHome()) renderMap();
});

document.getElementById("add-home")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const sel = document.getElementById("home-select");
  const name = document.getElementById("home-name").value.trim();
  const lat = Number(document.getElementById("home-lat").value);
  const lon = Number(document.getElementById("home-lon").value);
  const valid = validateDecimalDegrees(lat, lon);
  if (!valid) {
    showSidebarError("Invalid coordinates. Use decimal degrees (e.g. 38.9, -77.0).");
    return;
  }
  clearSidebarError();
  if (!name) return;
  const decl = document.getElementById("home-decl").value ? Number(document.getElementById("home-decl").value) : null;
  const isUpdate = sel?.value && sel.value !== NEW_HOME_VALUE;
  if (isUpdate) {
    const home = state.homes.find((h) => h.id === sel.value);
    if (home) {
      home.name = name;
      home.lat = valid.lat;
      home.lon = valid.lon;
      home.magneticDeclination = decl ?? null;
      if (window.azimuth && state.data) {
        state.data.homes = state.homes;
        await window.azimuth.saveData(state.data);
      }
      renderHomeSelect();
      syncHomeFormToSelection();
      renderMap();
      renderResults();
    }
  } else {
    const id = "home-" + Date.now();
    const home = { id, name, lat: valid.lat, lon: valid.lon, magneticDeclination: decl, notes: "" };
    state.homes = [...(state.homes || []), home];
    state.activeHomeId = id;
    if (window.azimuth && state.data) {
      state.data.homes = state.homes;
      await window.azimuth.saveData(state.data);
    }
    renderHomeSelect();
    syncHomeFormToSelection();
    renderMap();
    renderResults();
  }
});

document.getElementById("set-target")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const sel = document.getElementById("target-select");
  const name = document.getElementById("target-name")?.value?.trim() ?? "";
  const lat = Number(document.getElementById("target-lat").value);
  const lon = Number(document.getElementById("target-lon").value);
  const valid = validateDecimalDegrees(lat, lon);
  if (!valid) {
    showSidebarError("Invalid coordinates. Use decimal degrees (e.g. 38.9, -77.0).");
    return;
  }
  clearSidebarError();
  if (sel?.value === NEW_TARGET_VALUE) {
    const targetName = name || "Unnamed target";
    const id = "target-" + Date.now();
    const t = { id, name: targetName, lat: valid.lat, lon: valid.lon, notes: "" };
    state.targets = [...(state.targets || []), t];
    state.targetCoords = null;
    state.selectedTargetId = id;
    if (window.azimuth && state.data) {
      state.data.targets = state.targets;
      await window.azimuth.saveData(state.data);
    }
    renderTargetSelect();
    renderMap();
    renderResults();
  } else if (state.selectedTargetId && !state.targetCoords) {
    const t = state.targets.find((x) => x.id === state.selectedTargetId);
    if (t) {
      t.name = name || t.name;
      t.lat = valid.lat;
      t.lon = valid.lon;
      if (window.azimuth && state.data) {
        state.data.targets = state.targets;
        await window.azimuth.saveData(state.data);
      }
      renderTargetSelect();
      renderMap();
      renderResults();
    }
  } else {
    state.targetCoords = valid;
    state.selectedTargetId = null;
    renderTargetSelect();
    renderMap();
    renderResults();
    document.getElementById("save-target-btn").style.display = "block";
  }
});

document.getElementById("save-target-btn")?.addEventListener("click", async () => {
  const target = getCurrentTarget();
  if (!target) return;
  const nameInput = document.getElementById("target-name");
  let name = nameInput?.value?.trim();
  if (!name) name = window.prompt("Target name");
  if (!name?.trim()) return;
  const id = "target-" + Date.now();
  const t = { id, name: name.trim(), lat: target.lat, lon: target.lon, notes: "" };
  state.targets = [...(state.targets || []), t];
  state.targetCoords = null;
  state.selectedTargetId = id;
  if (window.azimuth && state.data) {
    state.data.targets = state.targets;
    await window.azimuth.saveData(state.data);
  }
  if (nameInput) nameInput.value = "";
  renderTargetSelect();
  renderMap();
  renderResults();
  document.getElementById("save-target-btn").style.display = "none";
});

document.getElementById("distance-unit")?.addEventListener("change", async (e) => {
  const unit = e.target.value;
  if (state.data) {
    state.data.preferences = state.data.preferences || {};
    state.data.preferences.distanceUnit = unit;
    await persist();
  }
  renderResults();
});

document.querySelectorAll('input[name="antenna-type"]').forEach((radio) => {
  radio.addEventListener("change", async () => {
    if (state.data) {
      state.data.preferences = state.data.preferences || {};
      state.data.preferences.antennaType = getAntennaType();
      await persist();
    }
    renderResults();
  });
});

document.getElementById("home-select")?.addEventListener("change", (e) => {
  const id = e.target.value;
  if (id === NEW_HOME_VALUE || id === "") {
    syncHomeFormToSelection();
    return;
  }
  state.activeHomeId = id;
  syncHomeFormToSelection();
  renderMap();
  renderResults();
});

document.getElementById("target-select")?.addEventListener("change", (e) => {
  const id = e.target.value;
  if (id === "__custom__") {
    syncTargetFormToSelection();
    renderMap();
    renderResults();
    return;
  }
  if (id === NEW_TARGET_VALUE || id === "") {
    state.targetCoords = null;
    state.selectedTargetId = null;
    syncTargetFormToSelection();
    renderMap();
    renderResults();
    return;
  }
  state.targetCoords = null;
  state.selectedTargetId = id;
  syncTargetFormToSelection();
  renderMap();
  renderResults();
});

document.getElementById("delete-home-btn")?.addEventListener("click", async () => {
  const sel = document.getElementById("home-select");
  const id = sel?.value;
  if (!id || id === NEW_HOME_VALUE) return;
  const idx = state.homes.findIndex((h) => h.id === id);
  if (idx === -1) return;
  state.homes = state.homes.filter((h) => h.id !== id);
  if (state.homes.length === 0) {
    state.homes = [DEFAULT_HOME];
    state.activeHomeId = DEFAULT_HOME.id;
  } else if (state.activeHomeId === id) {
    state.activeHomeId = state.homes[0].id;
  }
  if (window.azimuth && state.data) {
    state.data.homes = state.homes;
    await window.azimuth.saveData(state.data);
  }
  renderHomeSelect();
  syncHomeFormToSelection();
  renderMap();
  renderResults();
});

document.getElementById("delete-target-btn")?.addEventListener("click", async () => {
  const id = state.selectedTargetId;
  if (!id) return;
  state.targets = state.targets.filter((t) => t.id !== id);
  state.selectedTargetId = state.targets[0]?.id ?? null;
  if (window.azimuth && state.data) {
    state.data.targets = state.targets;
    await window.azimuth.saveData(state.data);
  }
  renderTargetSelect();
  renderMap();
  renderResults();
});

document.body.addEventListener("click", (e) => {
  const controls = e.target?.closest?.("#map-zoom-controls");
  if (!controls) return;
  const btn = e.target?.closest?.("button");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  if (btn.id === "zoom-fit-path") {
    state.mapZoom = MAP_ZOOM_FIT_PATH;
  } else if (btn.id === "zoom-full") {
    state.mapZoom = MAP_ZOOM_FULL;
  } else return;
  renderMap();
});

document.getElementById("map-container")?.addEventListener("click", (e) => {
  const container = document.getElementById("map-container");
  if (!container || !container.contains(e.target)) return;
  if (e.target.closest("#map-zoom-controls") || e.target.closest("#map-legend")) return;
  const rect = container.getBoundingClientRect();
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w <= 0 || h <= 0) return;
  const x = ((e.clientX - rect.left) / rect.width) * w;
  const y = ((e.clientY - rect.top) / rect.height) * h;
  const projection = getProjection();
  const lonLat = projection.invert?.([x, y]);
  if (!lonLat || lonLat.some((v) => !Number.isFinite(v))) return;
  const [lon, lat] = lonLat;
  const valid = validateDecimalDegrees(lat, lon);
  if (!valid) return;
  state.targetCoords = valid;
  state.selectedTargetId = null;
  clearSidebarError();
  renderTargetSelect();
  syncTargetFormToSelection();
  renderMap();
  renderResults();
  document.getElementById("save-target-btn").style.display = "block";
});

loadAndRender().catch((e) => clearLoadStatus(e));
