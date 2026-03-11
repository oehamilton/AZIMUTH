const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("azimuth", {
  loadData: (customPath) => ipcRenderer.invoke("data:load", customPath),
  saveData: (data) => ipcRenderer.invoke("data:save", data),
  getResourcesPath: () => ipcRenderer.invoke("app:getResourcesPath"),
  loggingGetOptions: () => ipcRenderer.invoke("logging:getOptions"),
  loggingSetOptions: (opts) => ipcRenderer.invoke("logging:setOptions", opts),
  loggingGetLogDir: () => ipcRenderer.invoke("logging:getLogDir"),
  loggingCreateZip: (destPath) => ipcRenderer.invoke("logging:createZip", destPath),
  loggingCopyToFolder: (destDir) => ipcRenderer.invoke("logging:copyToFolder", destDir),
  loggingShowSaveZipDialog: () => ipcRenderer.invoke("logging:showSaveZipDialog"),
  loggingShowCopyToFolderDialog: () => ipcRenderer.invoke("logging:showCopyToFolderDialog"),
  loggingOpenLogFolder: () => ipcRenderer.invoke("logging:openLogFolder"),
  loggingWrite: (level, message) => ipcRenderer.invoke("logging:write", level, message),
  mapsGetCacheSize: () => ipcRenderer.invoke("maps:getCacheSize"),
  mapsClearCache: () => ipcRenderer.invoke("maps:clearCache"),
  mapsOpenCacheFolder: () => ipcRenderer.invoke("maps:openCacheFolder"),
  mapsGetCurrentView: () => ipcRenderer.invoke("maps:getCurrentView"),
  mapsStartDownloadForCurrentView: () => ipcRenderer.invoke("maps:startDownloadForCurrentView"),
  onMapsDownloadProgress: (callback) => {
    ipcRenderer.on("maps:downloadProgress", (_e, data) => callback(data));
  },
});
