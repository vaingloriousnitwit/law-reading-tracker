const { app, Menu, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");

autoUpdater.autoDownload = false;

// True only while a download is actually in flight (i.e. after the user
// confirmed "Download" in the update-available prompt). Lets us tell a real
// download failure apart from a check-phase error (e.g. GitHub mid-upload,
// a brief network hiccup) — the former needs to be surfaced, the latter
// should just quietly read as "you're up to date" rather than alarm anyone.
let downloading = false;

function sendToRenderer(getWindow, payload) {
  const win = getWindow();
  if (win && !win.isDestroyed()) win.webContents.send("updater-event", payload);
}

function showUpToDate(win, version) {
  dialog.showMessageBox(win, {
    type: "info",
    message: "You're up to date",
    detail: `Law Reading Tracker v${version} is the latest version.`,
  });
}

function checkForUpdates(win) {
  if (!app.isPackaged) {
    dialog.showMessageBox(win, {
      type: "info",
      message: "Check for Updates isn't available in development.",
      detail: "This only works in the packaged app, which checks GitHub Releases.",
    });
    return;
  }
  autoUpdater.checkForUpdates().catch(() => {
    // Reaching here means the check itself failed (network hiccup, GitHub
    // release still mid-upload, etc.) — not that a download failed. Treat it
    // the same as "no update found" rather than showing a scary error.
    showUpToDate(win, app.getVersion());
  });
}

function wireAutoUpdaterEvents(getWindow) {
  autoUpdater.on("update-available", (info) => {
    dialog
      .showMessageBox(getWindow(), {
        type: "info",
        buttons: ["Download", "Later"],
        defaultId: 0,
        cancelId: 1,
        message: `Update available: v${info.version}`,
        detail: "Would you like to download it now?",
      })
      .then((result) => {
        if (result.response === 0) {
          downloading = true;
          sendToRenderer(getWindow, { type: "download-started", version: info.version });
          autoUpdater.downloadUpdate();
        }
      });
  });

  autoUpdater.on("update-not-available", (info) => {
    showUpToDate(getWindow(), info.version);
  });

  autoUpdater.on("download-progress", (progress) => {
    sendToRenderer(getWindow, {
      type: "download-progress",
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on("error", (err) => {
    if (downloading) {
      downloading = false;
      sendToRenderer(getWindow, { type: "download-error" });
      dialog.showMessageBox(getWindow(), {
        type: "error",
        message: "Update download failed",
        detail: err && err.message ? err.message : String(err),
      });
    } else {
      showUpToDate(getWindow(), app.getVersion());
    }
  });

  autoUpdater.on("update-downloaded", () => {
    downloading = false;
    sendToRenderer(getWindow, { type: "download-finished" });
    dialog
      .showMessageBox(getWindow(), {
        type: "info",
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
        cancelId: 1,
        message: "Update ready to install",
        detail: "Restart Law Reading Tracker to finish installing the update.",
      })
      .then((result) => {
        if (result.response === 0) autoUpdater.quitAndInstall();
      });
  });
}

// Mirrors Electron's documented default menu (About/Services/Hide/Quit,
// Edit with copy-paste, View, Window) so we don't lose those roles by
// replacing the auto-generated default menu — just adds "Check for Updates…".
function buildMenu(getWindow, onOpenSettings) {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              {
                label: "Check for Updates…",
                click: () => checkForUpdates(getWindow()),
              },
              { type: "separator" },
              {
                label: "Settings…",
                accelerator: "CmdOrCtrl+,",
                click: () => onOpenSettings(),
              },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: isMac
        ? [{ role: "minimize" }, { role: "zoom" }, { type: "separator" }, { role: "front" }]
        : [{ role: "minimize" }, { role: "close" }],
    },
    ...(!isMac
      ? [
          {
            label: "Help",
            submenu: [
              { label: "Check for Updates…", click: () => checkForUpdates(getWindow()) },
              { label: "Settings…", accelerator: "Ctrl+,", click: () => onOpenSettings() },
            ],
          },
        ]
      : []),
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setupAutoUpdate(getWindow, onOpenSettings) {
  buildMenu(getWindow, onOpenSettings);
  wireAutoUpdaterEvents(getWindow);
}

module.exports = { setupAutoUpdate };
