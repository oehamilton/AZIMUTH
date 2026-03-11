import { app, BrowserWindow, ipcMain, Menu, shell, dialog, protocol, net } from "electron";
import { readFile, writeFile, mkdir, readdir, copyFile, stat, rm } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { access } from "fs/promises";
import { execSync } from "child_process";
import * as logger from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

protocol.registerSchemesAsPrivileged([
  { scheme: "azimuth-tiles", privileges: { standard: true, supportFetchAPI: true } },
]);

const DEFAULT_HOME = {
  id: "default-dc",
  name: "Washington DC, White House",
  lat: 38.8977,
  lon: -77.0365,
  magneticDeclination: null,
  notes: "",
};

function getDataPath() {
  const path = app.getPath("userData");
  return join(path, "azimuth-data.json");
}

async function ensureDir(path) {
  const dir = join(path, "..");
  await mkdir(dir, { recursive: true }).catch(() => {});
}

async function loadData(customPath = null) {
  const path = customPath || getDataPath();
  try {
    const raw = await readFile(path, "utf-8");
    const data = JSON.parse(raw);
    if (!data.homes || !Array.isArray(data.homes)) data.homes = [];
    if (!data.targets || !Array.isArray(data.targets)) data.targets = [];
    if (!data.preferences || typeof data.preferences !== "object") data.preferences = {};
    if (data.homes.length === 0) {
      data.homes = [DEFAULT_HOME];
    }
    return data;
  } catch (err) {
    if (err.code === "ENOENT") {
      return {
        schemaVersion: 1,
        homes: [DEFAULT_HOME],
        targets: [],
        preferences: { distanceUnit: "km", dataFilePath: null },
      };
    }
    throw err;
  }
}

async function saveData(data, customPath = null) {
  const path = customPath || data.preferences?.dataFilePath || getDataPath();
  await ensureDir(path);
  const out = {
    schemaVersion: data.schemaVersion ?? 1,
    homes: data.homes ?? [],
    targets: data.targets ?? [],
    preferences: data.preferences ?? {},
  };
  await writeFile(path, JSON.stringify(out, null, 2), "utf-8");
}

function getLogDirPath() {
  return join(app.getPath("userData"), "azimuth-logs");
}

function getTilesCachePath() {
  return join(app.getPath("userData"), "azimuth-tiles");
}

async function getTilesCacheSize() {
  const dir = getTilesCachePath();
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    let sizeBytes = 0;
    let fileCount = 0;
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        const sub = await getDirSizeRecursive(full);
        sizeBytes += sub.size;
        fileCount += sub.count;
      } else {
        const st = await stat(full).catch(() => null);
        if (st) { sizeBytes += st.size; fileCount++; }
      }
    }
    return { sizeBytes, fileCount };
  } catch (err) {
    if (err.code === "ENOENT") return { sizeBytes: 0, fileCount: 0 };
    throw err;
  }
}

async function getDirSizeRecursive(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  let size = 0;
  let count = 0;
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      const sub = await getDirSizeRecursive(full);
      size += sub.size;
      count += sub.count;
    } else {
      const st = await stat(full).catch(() => null);
      if (st) { size += st.size; count++; }
    }
  }
  return { size, count };
}

async function clearTilesCache() {
  const dir = getTilesCachePath();
  try {
    await rm(dir, { recursive: true, force: true });
    return { ok: true };
  } catch (err) {
    if (err.code === "ENOENT") return { ok: true };
    return { ok: false, error: err.message };
  }
}

function latLonToTileXY(latDeg, lonDeg, z) {
  const n = 2 ** z;
  const x = Math.floor(((lonDeg + 180) / 360) * n);
  const latRad = (latDeg * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

function getTilesForView(view) {
  const { centerLat, centerLon, radiusDeg } = view;
  const latMin = Math.max(-85, centerLat - radiusDeg);
  const latMax = Math.min(85, centerLat + radiusDeg);
  const lonMin = centerLon - radiusDeg * 2;
  const lonMax = centerLon + radiusDeg * 2;
  const z = Math.max(2, Math.min(10, Math.round(Math.log2(360 / (2 * Math.max(1, radiusDeg))))));
  const tiles = [];
  const tl = latLonToTileXY(latMax, lonMin, z);
  const br = latLonToTileXY(latMin, lonMax, z);
  const xMin = Math.min(tl.x, br.x);
  const xMax = Math.max(tl.x, br.x);
  const yMin = Math.min(tl.y, br.y);
  const yMax = Math.max(tl.y, br.y);
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      tiles.push({ z, x, y });
    }
  }
  return tiles;
}

const TILE_USER_AGENT = "AZIMUTH/1.0 (Windows; antenna pointing app; https://www.project8x.com)";
const TILE_BASE = "https://tile.openstreetmap.org";

async function downloadTileToCache(cacheDir, z, x, y) {
  const dir = join(cacheDir, String(z), String(x));
  await mkdir(dir, { recursive: true });
  const outPath = join(dir, `${y}.png`);
  const url = `${TILE_BASE}/${z}/${x}/${y}.png`;
  const res = await fetch(url, { headers: { "User-Agent": TILE_USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
}

async function downloadTilesForCurrentView(sendProgress) {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, error: "Main window not available" };
  let view;
  try {
    view = await mainWindow.webContents.executeJavaScript(
      "window.__AZIMUTH_GET_MAP_VIEW__ ? window.__AZIMUTH_GET_MAP_VIEW__() : null"
    );
  } catch (e) {
    return { ok: false, error: "Could not get map view" };
  }
  if (!view || typeof view.centerLat !== "number") return { ok: false, error: "No map view" };
  const tiles = getTilesForView(view);
  if (tiles.length === 0) return { ok: true, downloaded: 0 };
  const cacheDir = getTilesCachePath();
  await mkdir(cacheDir, { recursive: true });
  let done = 0;
  const total = tiles.length;
  for (const t of tiles) {
    try {
      await downloadTileToCache(cacheDir, t.z, t.x, t.y);
    } catch (_) {}
    done++;
    if (sendProgress && mapsPrefsWindow && !mapsPrefsWindow.isDestroyed()) {
      mapsPrefsWindow.webContents.send("maps:downloadProgress", { current: done, total });
    }
  }
  if (sendProgress && mapsPrefsWindow && !mapsPrefsWindow.isDestroyed()) {
    mapsPrefsWindow.webContents.send("maps:downloadProgress", { current: total, total, done: true });
  }
  return { ok: true, downloaded: tiles.length };
}

let mainWindow = null;
let aboutWindow = null;
let licenseWindow = null;
let loggingWindow = null;
let mapsPrefsWindow = null;

function openLicenseWindow() {
  if (licenseWindow && !licenseWindow.isDestroyed()) {
    licenseWindow.focus();
    return;
  }
  const win = new BrowserWindow({
    width: 440,
    height: 320,
    resizable: false,
    parent: BrowserWindow.getFocusedWindow() || null,
    modal: false,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  win.loadFile(join(__dirname, "..", "..", "dist", "renderer", "license.html"));
  win.on("closed", () => { licenseWindow = null; });
  licenseWindow = win;
}

function openLoggingWindow() {
  if (loggingWindow && !loggingWindow.isDestroyed()) {
    loggingWindow.focus();
    return;
  }
  const win = new BrowserWindow({
    width: 440,
    height: 420,
    resizable: false,
    parent: BrowserWindow.getFocusedWindow() || null,
    modal: false,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  win.loadFile(join(__dirname, "..", "..", "dist", "renderer", "logging.html"));
  win.on("closed", () => { loggingWindow = null; });
  loggingWindow = win;
}

function openMapsPrefsWindow() {
  if (mapsPrefsWindow && !mapsPrefsWindow.isDestroyed()) {
    mapsPrefsWindow.focus();
    return;
  }
  const win = new BrowserWindow({
    width: 460,
    height: 480,
    resizable: true,
    parent: BrowserWindow.getFocusedWindow() || null,
    modal: false,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(join(__dirname, "..", "..", "dist", "renderer", "maps-preferences.html"));
  win.on("closed", () => { mapsPrefsWindow = null; });
  mapsPrefsWindow = win;
}

function openAboutWindow() {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus();
    return;
  }
  const win = new BrowserWindow({
    width: 440,
    height: 320,
    resizable: false,
    parent: BrowserWindow.getFocusedWindow() || null,
    modal: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  win.loadFile(join(__dirname, "..", "..", "dist", "renderer", "about.html"));
  win.webContents.on("did-finish-load", () => {
    win.webContents.executeJavaScript(`window.appVersion = ${JSON.stringify(app.getVersion())}; document.getElementById('app-version').textContent = window.appVersion;`).catch(() => {});
  });
  win.on("closed", () => { aboutWindow = null; });
  aboutWindow = win;
}

function buildApplicationMenu() {
  const template = [
    {
      label: "File",
      submenu: [{ role: "quit", label: "Exit" }],
    },
    {
      label: "Preferences",
      submenu: [
        {
          label: "Maps",
          click: () => openMapsPrefsWindow(),
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Logging",
          click: () => openLoggingWindow(),
        },
        {
          label: "License",
          click: () => openLicenseWindow(),
        },
        {
          label: "About AZIMUTH",
          click: () => openAboutWindow(),
        },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // Geolocation: allow so "Use current location" can get position. When running the built app
  // (AZIMUTH.exe), Windows shows "AZIMUTH" in Settings → Privacy → Location; when running from
  // source (pnpm start) the process is Electron so Windows shows "Electron".
  const ses = win.webContents.session;
  ses.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === "geolocation") return true;
    return false;
  });
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === "geolocation") callback(true);
    else callback(false);
  });
  win.loadFile(join(__dirname, "..", "..", "dist", "renderer", "index.html"));
  win.on("closed", () => { mainWindow = null; });
  mainWindow = win;
  // DevTools: open manually via F12 or Application menu if needed. Auto-open was removed to avoid console noise from DevTools internals (Autofill/remote fetch errors).
}

app.whenReady().then(async () => {
  protocol.handle("azimuth-tiles", async (request) => {
    const u = new URL(request.url);
    const pathname = u.pathname.replace(/^\/+/, "");
    const subpath = pathname.replace(/^tile\/?/, "");
    if (!subpath || subpath.includes("..")) return new Response(null, { status: 404 });
    const filePath = join(getTilesCachePath(), ...subpath.split("/"));
    try {
      return await net.fetch(pathToFileURL(filePath).toString());
    } catch (_) {
      return new Response(null, { status: 404 });
    }
  });
  buildApplicationMenu();
  createWindow();
  const logDir = getLogDirPath();
  logger.initLogger({ dir: logDir, version: app.getVersion(), os: process.platform });
  try {
    const data = await loadData();
    const prefs = data.preferences || {};
    if (prefs.loggingEnabled) {
      logger.setEnabled(true);
      logger.setLevel(prefs.logLevel || "info");
      await logger.writeHeader();
    }
  } catch (_) {}
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

process.on("uncaughtException", (err) => {
  logger.log("error", `uncaughtException: ${err.message}\n${err.stack || ""}`);
});
process.on("unhandledRejection", (reason, promise) => {
  logger.log("error", `unhandledRejection: ${reason}`);
});

ipcMain.handle("data:load", async (_, customPath) => {
  const data = await loadData(customPath);
  logger.log("info", "data loaded");
  return data;
});
ipcMain.handle("data:save", async (_, data) => {
  await saveData(data);
  logger.log("info", "data saved");
});
ipcMain.handle("app:getResourcesPath", () => join(__dirname, "..", "..", "assets"));

ipcMain.handle("logging:getOptions", () => ({
  enabled: logger.isEnabled(),
  logDir: logger.getLogDir(),
  level: logger.getLevel(),
}));
ipcMain.handle("logging:setOptions", async (_, opts) => {
  if (opts && typeof opts.enabled === "boolean") logger.setEnabled(opts.enabled);
  if (opts && opts.level) logger.setLevel(opts.level);
  if (opts && opts.enabled) {
    await logger.writeHeader();
    logger.log("debug", "logging enabled");
  } else if (opts && typeof opts.enabled === "boolean") {
    logger.log("debug", "logging disabled");
  }
  return logger.getLogDir();
});
ipcMain.handle("logging:getLogDir", () => logger.getLogDir());

ipcMain.handle("logging:createZip", async (_, destPath) => {
  const logDir = logger.getLogDir();
  if (!logDir || !destPath) return { ok: false, path: null };
  try {
    const a = logDir.replace(/'/g, "''");
    const b = destPath.replace(/'/g, "''");
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${a}' -DestinationPath '${b}' -Force"`, { stdio: "pipe" });
    return { ok: true, path: destPath };
  } catch (e) {
    return { ok: false, path: null, error: String(e.message) };
  }
});
ipcMain.handle("logging:copyToFolder", async (_, destDir) => {
  const logDir = logger.getLogDir();
  if (!logDir || !destDir) return { ok: false, path: null };
  try {
    const files = await readdir(logDir);
    await mkdir(destDir, { recursive: true });
    for (const f of files) {
      await copyFile(join(logDir, f), join(destDir, f));
    }
    return { ok: true, path: destDir };
  } catch (e) {
    return { ok: false, error: String(e.message), path: null };
  }
});
ipcMain.handle("logging:showSaveZipDialog", async () => {
  const w = BrowserWindow.getFocusedWindow();
  const { filePath } = await dialog.showSaveDialog(w || null, {
    title: "Save log zip",
    defaultPath: `azimuth-logs-${new Date().toISOString().slice(0, 10)}.zip`,
    filters: [{ name: "Zip", extensions: ["zip"] }],
  });
  return { path: filePath || null };
});
ipcMain.handle("logging:showCopyToFolderDialog", async () => {
  const w = BrowserWindow.getFocusedWindow();
  const { filePaths } = await dialog.showOpenDialog(w || null, {
    title: "Choose folder to copy logs to",
    properties: ["openDirectory", "createDirectory"],
  });
  return { path: filePaths && filePaths[0] ? filePaths[0] : null };
});
ipcMain.handle("logging:openLogFolder", async () => {
  const dir = logger.getLogDir();
  if (dir) await shell.openPath(dir);
});
ipcMain.handle("logging:write", (_, level, message) => {
  logger.log(level || "info", message);
});

ipcMain.handle("maps:getCacheSize", async () => {
  try {
    return await getTilesCacheSize();
  } catch (e) {
    return { sizeBytes: 0, fileCount: 0 };
  }
});
ipcMain.handle("maps:clearCache", async () => clearTilesCache());
ipcMain.handle("maps:openCacheFolder", async () => {
  const dir = getTilesCachePath();
  await mkdir(dir, { recursive: true });
  await shell.openPath(dir);
});
ipcMain.handle("maps:getCurrentView", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  try {
    return await mainWindow.webContents.executeJavaScript(
      "window.__AZIMUTH_GET_MAP_VIEW__ ? window.__AZIMUTH_GET_MAP_VIEW__() : null"
    );
  } catch (_) {
    return null;
  }
});
ipcMain.handle("maps:startDownloadForCurrentView", async () => {
  return downloadTilesForCurrentView(true);
});
