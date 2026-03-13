/**
 * Entry for bundled Capacitor bridge. Defines window.azimuth when in Capacitor.
 * Built with esbuild so @capacitor/filesystem is available in the WebView.
 */
import { Filesystem } from "@capacitor/filesystem";

var DATA = "DATA";
var UTF8 = "utf8";
var PATH = "azimuth-data.json";

function defaultData() {
  return {
    schemaVersion: 1,
    homes: [],
    targets: [],
    preferences: { distanceUnit: "km", dataFilePath: null },
  };
}

function expose() {
  if (typeof window.Capacitor === "undefined") return;
  window.azimuth = {
    loadData: function () {
      return Filesystem.readFile({ path: PATH, directory: DATA, encoding: UTF8 })
        .then(function (r) {
          return JSON.parse(r.data);
        })
        .catch(function (err) {
          var msg = err && (err.message || err.code || String(err));
          if (msg && (msg.indexOf("NOT_FOUND") !== -1 || msg.indexOf("does not exist") !== -1))
            return defaultData();
          throw err;
        });
    },
    saveData: function (data) {
      var out = {
        schemaVersion: data.schemaVersion || 1,
        homes: data.homes || [],
        targets: data.targets || [],
        preferences: data.preferences || {},
      };
      return Filesystem.writeFile({
        path: PATH,
        data: JSON.stringify(out, null, 2),
        directory: DATA,
        encoding: UTF8,
      });
    },
    getResourcesPath: function () {
      return Promise.resolve(null);
    },
    loggingGetOptions: function () {
      return Promise.resolve({ enabled: false, logDir: null, level: "info" });
    },
    loggingSetOptions: function () {
      return Promise.resolve(null);
    },
    loggingGetLogDir: function () {
      return Promise.resolve(null);
    },
    loggingCreateZip: function () {
      return Promise.resolve({ ok: false, path: null });
    },
    loggingCopyToFolder: function () {
      return Promise.resolve({ ok: false });
    },
    loggingShowSaveZipDialog: function () {
      return Promise.resolve({ path: null });
    },
    loggingShowCopyToFolderDialog: function () {
      return Promise.resolve({ path: null });
    },
    loggingOpenLogFolder: function () {},
    loggingWrite: function () {
      return Promise.resolve();
    },
    mapsGetCacheSize: function () {
      return Promise.resolve({ sizeBytes: 0, fileCount: 0 });
    },
    mapsClearCache: function () {
      return Promise.resolve({ ok: true });
    },
    mapsOpenCacheFolder: function () {},
    mapsGetCurrentView: function () {
      return Promise.resolve(null);
    },
    mapsStartDownloadForCurrentView: function () {
      return Promise.resolve({ ok: false, error: "Not available on Android" });
    },
    onMapsDownloadProgress: function () {},
  };
}

expose();
if (typeof window.dispatchEvent === "function") {
  window.dispatchEvent(new Event("azimuth-ready"));
}
