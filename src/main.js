const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const { parseCSV, stringifyCSV } = require("./csv");
const { deriveRow } = require("./calc");
const { genId } = require("./id");

// In dev, keep the CSV inside the repo (handy to inspect/commit-ignore).
// In a packaged app, the app bundle is read-only, so use a user-writable,
// easy-to-find folder instead.
const DATA_DIR = app.isPackaged
  ? path.join(app.getPath("documents"), "Law Reading Tracker")
  : path.join(__dirname, "..", "data");
const CSV_PATH = path.join(DATA_DIR, "readings.csv");
const HEADER = [
  "Id",
  "Class",
  "Reading / Notes",
  "Pages",
  "Pages Read",
  "Due Date",
  "Days Until Due",
  "Pages Per Day",
  "Completed",
  "Completed At",
];
// Maps HEADER label -> row field name, so column order in the file can change
// without breaking old CSVs that predate a given column.
const FIELD_BY_LABEL = {
  Id: "id",
  Class: "class",
  "Reading / Notes": "title",
  Pages: "pages",
  "Pages Read": "pagesRead",
  "Due Date": "dueDate",
  Completed: "completed",
  "Completed At": "completedAt",
};

function ensureCSVExists() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, stringifyCSV([HEADER]), "utf8");
  }
}

function loadRows() {
  ensureCSVExists();
  const text = fs.readFileSync(CSV_PATH, "utf8");
  const parsed = parseCSV(text);
  if (parsed.length === 0) return [];
  const [headerRow, ...dataRows] = parsed;

  const colIndex = {};
  headerRow.forEach((label, i) => {
    const field = FIELD_BY_LABEL[label.trim()];
    if (field) colIndex[field] = i;
  });

  return dataRows.map((r) => {
    const get = (field) => (colIndex[field] !== undefined ? r[colIndex[field]] || "" : "");
    return {
      id: get("id") || genId(),
      class: get("class"),
      title: get("title"),
      pages: get("pages"),
      pagesRead: get("pagesRead") || "0",
      dueDate: get("dueDate"),
      completed: get("completed") === "true",
      completedAt: get("completedAt"),
    };
  });
}

function saveRows(rows) {
  ensureCSVExists();
  const out = [HEADER];
  for (const row of rows) {
    const derived = row.completed ? null : deriveRow(row);
    out.push([
      row.id || genId(),
      row.class || "",
      row.title || "",
      row.pages || "",
      row.pagesRead || "0",
      row.dueDate || "",
      derived && derived.days !== null ? String(derived.days) : "",
      derived && derived.perDay !== null ? String(derived.perDay) : "",
      row.completed ? "true" : "false",
      row.completedAt || "",
    ]);
  }
  fs.writeFileSync(CSV_PATH, stringifyCSV(out), "utf8");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    title: "Law Reading Tracker",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.loadFile(path.join(__dirname, "index.html"));
}

ipcMain.handle("load-rows", () => loadRows());
ipcMain.handle("save-rows", (_event, rows) => {
  saveRows(rows);
  return true;
});
ipcMain.handle("csv-path", () => CSV_PATH);

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
