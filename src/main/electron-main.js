import { app, BrowserWindow, ipcMain, Menu } from "electron";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

let aboutWindow = null;

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
      label: "Help",
      submenu: [
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
  win.loadFile(join(__dirname, "..", "..", "dist", "renderer", "index.html"));
  // DevTools: open manually via F12 or Application menu if needed. Auto-open was removed to avoid console noise from DevTools internals (Autofill/remote fetch errors).
}

app.whenReady().then(() => {
  buildApplicationMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("data:load", async (_, customPath) => loadData(customPath));
ipcMain.handle("data:save", async (_, data) => saveData(data));
ipcMain.handle("app:getResourcesPath", () => join(__dirname, "..", "..", "assets"));
