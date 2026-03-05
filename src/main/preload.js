const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("azimuth", {
  loadData: (customPath) => ipcRenderer.invoke("data:load", customPath),
  saveData: (data) => ipcRenderer.invoke("data:save", data),
  getResourcesPath: () => ipcRenderer.invoke("app:getResourcesPath"),
});
