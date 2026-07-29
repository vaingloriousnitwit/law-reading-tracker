const { app, Menu, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");

autoUpdater.autoDownload = false;

function checkForUpdates(win) {
  if (!app.isPackaged) {
    dialog.showMessageBox(win, {
      type: "info",
      message: "Check for Updates isn't available in development.",
      detail: "This only works in the packaged app, which checks GitHub Releases.",
    });
    return;
  }
  autoUpdater.checkForUpdates().catch((err) => {
    dialog.showMessageBox(win, {
      type: "error",
      message: "Couldn't check for updates",
      detail: err && err.message ? err.message : String(err),
    });
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
        if (result.response === 0) autoUpdater.downloadUpdate();
      });
  });

  autoUpdater.on("update-not-available", (info) => {
    dialog.showMessageBox(getWindow(), {
      type: "info",
      message: "You're up to date",
      detail: `Law Reading Tracker v${info.version} is the latest version.`,
    });
  });

  autoUpdater.on("error", (err) => {
    dialog.showMessageBox(getWindow(), {
      type: "error",
      message: "Update check failed",
      detail: err && err.message ? err.message : String(err),
    });
  });

  autoUpdater.on("update-downloaded", () => {
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
function buildMenu(getWindow) {
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
            submenu: [{ label: "Check for Updates…", click: () => checkForUpdates(getWindow()) }],
          },
        ]
      : []),
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setupAutoUpdate(getWindow) {
  buildMenu(getWindow);
  wireAutoUpdaterEvents(getWindow);
}

module.exports = { setupAutoUpdate };
