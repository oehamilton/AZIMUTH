/**
 * File logger for remote troubleshooting. No PII unless opted in.
 * Cap: 5 MB per file; keep last 2 rotated files (azimuth.log, azimuth.log.1).
 * Levels: error, info, debug (numeric: 0, 1, 2).
 */
import { appendFile, stat, rename, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const LEVELS = { error: 0, info: 1, debug: 2 };
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const LOG_FILE = "azimuth.log";

let logDir = null;
let currentLevel = LEVELS.info;
let enabled = false;
let appVersion = "";
let platform = "";

export function initLogger(options) {
  const { dir, level = "info", on = false, version = "", os = process.platform } = options || {};
  logDir = dir;
  currentLevel = LEVELS[level] ?? LEVELS.info;
  enabled = !!on;
  appVersion = version;
  platform = os;
}

export function setEnabled(on) {
  enabled = !!on;
}

export function setLevel(level) {
  currentLevel = LEVELS[level] ?? LEVELS.info;
}

export function isEnabled() {
  return enabled;
}

export function getLogDir() {
  return logDir;
}

export function getLevel() {
  const names = Object.keys(LEVELS);
  for (const name of names) {
    if (LEVELS[name] === currentLevel) return name;
  }
  return "info";
}

function shouldLog(level) {
  return enabled && logDir && (LEVELS[level] ?? 0) <= currentLevel;
}

function formatLine(level, message) {
  const ts = new Date().toISOString();
  return `${ts} [${level.toUpperCase()}] ${message}\n`;
}

async function ensureLogDir() {
  if (!logDir) return;
  await mkdir(logDir, { recursive: true }).catch(() => {});
}

async function rotateIfNeeded() {
  const path = join(logDir, LOG_FILE);
  try {
    const st = await stat(path);
    if (st.size >= MAX_SIZE_BYTES) {
      const rotatedPath = join(logDir, `${LOG_FILE}.1`);
      try {
        await rename(path, rotatedPath);
      } catch {
        // overwrite .1
      }
    }
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}

export async function log(level, message) {
  if (!shouldLog(level)) return;
  await ensureLogDir();
  await rotateIfNeeded();
  const path = join(logDir, LOG_FILE);
  const line = formatLine(level, String(message));
  await appendFile(path, line, "utf-8").catch(() => {});
}

export async function writeHeader() {
  if (!enabled || !logDir) return;
  await ensureLogDir();
  const path = join(logDir, LOG_FILE);
  const line = formatLine("info", `AZIMUTH ${appVersion} | ${platform} | logging started\n`);
  await appendFile(path, line, "utf-8").catch(() => {});
}
