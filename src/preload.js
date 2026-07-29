const { contextBridge, ipcRenderer } = require("electron");
const { deriveRow, todayLocalDateOnly } = require("./calc");
const { genId } = require("./id");

contextBridge.exposeInMainWorld("api", {
  loadRows: () => ipcRenderer.invoke("load-rows"),
  saveRows: (rows) => ipcRenderer.invoke("save-rows", rows),
  csvPath: () => ipcRenderer.invoke("csv-path"),
  deriveRow,
  genId,
  todayISO: () => {
    const d = todayLocalDateOnly();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  },
});
