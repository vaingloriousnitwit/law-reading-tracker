let rows = [];
let saveTimer = null;
let showCompleted = false;

const tbody = document.getElementById("table-body");
const completedBody = document.getElementById("completed-body");
const completedSection = document.getElementById("completed-section");
const saveStatus = document.getElementById("save-status");
const csvPathLabel = document.getElementById("csv-path-label");
const showCompletedBtn = document.getElementById("show-completed-btn");

function scheduleSave() {
  saveStatus.textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await window.api.saveRows(rows);
    saveStatus.textContent = "Saved";
    setTimeout(() => {
      if (saveStatus.textContent === "Saved") saveStatus.textContent = "";
    }, 1500);
  }, 400);
}

function formatDays(derived, row) {
  if (!row.dueDate || derived.days === null) return "—";
  if (derived.status === "overdue") return `${Math.abs(derived.days)}d overdue`;
  if (derived.status === "due-today") return "Due today";
  return `${derived.days} day${derived.days === 1 ? "" : "s"}`;
}

function formatPerDay(derived) {
  if (!derived.hasPages) return "—";
  if (derived.finishedReading) return "Done";
  if (derived.perDay === null) return "—";
  return `${derived.perDay} pg${derived.perDay === 1 ? "" : "s"}/day`;
}

function formatProgressNote(derived) {
  if (!derived.hasPages || derived.pagesRead <= 0) return null;
  if (derived.finishedReading) {
    return derived.aheadAmount > 0
      ? { text: `Done — ${derived.aheadAmount} ahead of pace`, cls: "ahead" }
      : { text: "Done reading", cls: "done" };
  }
  return { text: `${derived.remaining} left`, cls: "" };
}

function makeCell(className) {
  const td = document.createElement("td");
  if (className) td.className = className;
  return td;
}

function makeTextInput(value, placeholder, onChange) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  input.placeholder = placeholder || "";
  input.addEventListener("input", () => onChange(input.value));
  return input;
}

function findRowIndexById(id) {
  return rows.findIndex((r) => r.id === id);
}

function completeRow(id) {
  const idx = findRowIndexById(id);
  if (idx === -1) return;
  const row = rows[idx];
  row.completed = true;
  row.completedAt = window.api.todayISO();

  const replacement = {
    id: window.api.genId(),
    class: row.class,
    title: "",
    pages: "",
    pagesRead: "0",
    dueDate: "",
    completed: false,
    completedAt: "",
  };
  rows.splice(idx, 0, replacement);

  render();
  scheduleSave();
}

function restoreRow(id) {
  const idx = findRowIndexById(id);
  if (idx === -1) return;
  rows[idx].completed = false;
  rows[idx].completedAt = "";
  render();
  scheduleSave();
}

function deleteRow(id) {
  const idx = findRowIndexById(id);
  if (idx === -1) return;
  rows.splice(idx, 1);
  render();
  scheduleSave();
}

function renderActiveRows() {
  tbody.innerHTML = "";
  const activeRows = rows.filter((r) => !r.completed);

  activeRows.forEach((row) => {
    const tr = document.createElement("tr");
    const derived = window.api.deriveRow(row);

    const doneTd = makeCell("col-done");
    const doneCheckbox = document.createElement("input");
    doneCheckbox.type = "checkbox";
    doneCheckbox.title = "Mark assignment complete";
    doneCheckbox.addEventListener("change", () => completeRow(row.id));
    doneTd.appendChild(doneCheckbox);
    tr.appendChild(doneTd);

    const classTd = makeCell("col-class");
    classTd.appendChild(
      makeTextInput(row.class, "e.g. Torts", (v) => {
        row.class = v;
        scheduleSave();
      })
    );
    tr.appendChild(classTd);

    const titleTd = makeCell("col-title");
    titleTd.appendChild(
      makeTextInput(row.title, "e.g. Palsgraf v. Long Island R.R.", (v) => {
        row.title = v;
        scheduleSave();
      })
    );
    tr.appendChild(titleTd);

    const pagesTd = makeCell("col-pages");
    const pagesWrap = document.createElement("div");
    pagesWrap.className = "pages-cell";
    const pagesInput = document.createElement("input");
    pagesInput.type = "number";
    pagesInput.min = "0";
    pagesInput.value = row.pages || "";
    pagesInput.placeholder = "0";
    pagesInput.addEventListener("input", () => {
      row.pages = pagesInput.value;
      updateComputedCells(row.id);
      scheduleSave();
    });
    pagesWrap.appendChild(pagesInput);
    const note = formatProgressNote(derived);
    const noteDiv = document.createElement("div");
    noteDiv.className = "progress-note" + (note ? ` ${note.cls}` : "");
    noteDiv.dataset.role = "progress-note";
    noteDiv.textContent = note ? note.text : "";
    pagesWrap.appendChild(noteDiv);
    pagesTd.appendChild(pagesWrap);
    tr.appendChild(pagesTd);

    const dueTd = makeCell("col-due");
    const dueInput = document.createElement("input");
    dueInput.type = "date";
    dueInput.value = row.dueDate || "";
    dueInput.addEventListener("input", () => {
      row.dueDate = dueInput.value;
      updateComputedCells(row.id);
      scheduleSave();
    });
    dueTd.appendChild(dueInput);
    tr.appendChild(dueTd);

    const daysTd = makeCell("col-days computed");
    daysTd.dataset.role = "days";
    daysTd.textContent = formatDays(derived, row);
    if (derived.status === "overdue") daysTd.classList.add("overdue");
    if (derived.status === "due-today") daysTd.classList.add("due-today");
    tr.appendChild(daysTd);

    const perDayTd = makeCell("col-perday computed");
    perDayTd.dataset.role = "perday";
    perDayTd.textContent = formatPerDay(derived);
    if (derived.finishedReading) perDayTd.classList.add("finished");
    tr.appendChild(perDayTd);

    const actionsTd = makeCell("col-actions");
    const delBtn = document.createElement("button");
    delBtn.className = "icon-btn";
    delBtn.textContent = "✕";
    delBtn.title = "Delete row";
    delBtn.addEventListener("click", () => deleteRow(row.id));
    actionsTd.appendChild(delBtn);
    tr.appendChild(actionsTd);

    tr.dataset.rowId = row.id;
    tbody.appendChild(tr);
  });
}

function renderCompletedRows() {
  const completedRows = rows
    .filter((r) => r.completed)
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));

  showCompletedBtn.textContent = `${showCompleted ? "Hide" : "Show"} Completed (${completedRows.length})`;
  completedSection.classList.toggle("hidden", !showCompleted);

  completedBody.innerHTML = "";
  completedRows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = "completed-row";

    const classTd = document.createElement("td");
    classTd.className = "completed-class strike";
    classTd.textContent = row.class || "(untitled)";
    tr.appendChild(classTd);

    const titleTd = document.createElement("td");
    titleTd.className = "strike";
    titleTd.textContent = row.title || "";
    tr.appendChild(titleTd);

    const metaTd = document.createElement("td");
    metaTd.className = "completed-meta";
    const pages = Number(row.pages) || 0;
    const pagesRead = Number(row.pagesRead) || 0;
    metaTd.textContent = pages > 0 ? `${pagesRead}/${pages} pages · completed ${row.completedAt}` : `completed ${row.completedAt}`;
    tr.appendChild(metaTd);

    const actionsTd = document.createElement("td");
    actionsTd.className = "completed-actions";

    const restoreBtn = document.createElement("button");
    restoreBtn.className = "text-btn";
    restoreBtn.textContent = "Restore";
    restoreBtn.addEventListener("click", () => restoreRow(row.id));
    actionsTd.appendChild(restoreBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "icon-btn";
    delBtn.textContent = "✕";
    delBtn.title = "Delete permanently";
    delBtn.addEventListener("click", () => deleteRow(row.id));
    actionsTd.appendChild(delBtn);

    tr.appendChild(actionsTd);
    completedBody.appendChild(tr);
  });
}

function render() {
  renderActiveRows();
  renderCompletedRows();
}

function updateComputedCells(id) {
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  const derived = window.api.deriveRow(row);
  const tr = tbody.querySelector(`tr[data-row-id="${id}"]`);
  if (!tr) return;

  const daysTd = tr.querySelector('[data-role="days"]');
  daysTd.textContent = formatDays(derived, row);
  daysTd.classList.remove("overdue", "due-today");
  if (derived.status === "overdue") daysTd.classList.add("overdue");
  if (derived.status === "due-today") daysTd.classList.add("due-today");

  const perDayTd = tr.querySelector('[data-role="perday"]');
  perDayTd.textContent = formatPerDay(derived);
  perDayTd.classList.toggle("finished", derived.finishedReading);

  const noteDiv = tr.querySelector('[data-role="progress-note"]');
  const note = formatProgressNote(derived);
  noteDiv.className = "progress-note" + (note ? ` ${note.cls}` : "");
  noteDiv.textContent = note ? note.text : "";
}

document.getElementById("add-row-btn").addEventListener("click", () => {
  rows.push({
    id: window.api.genId(),
    class: "",
    title: "",
    pages: "",
    pagesRead: "0",
    dueDate: "",
    completed: false,
    completedAt: "",
  });
  render();
  const inputs = tbody.querySelectorAll("tr:last-child input");
  if (inputs[1]) inputs[1].focus(); // skip the checkbox, focus the class field
  scheduleSave();
});

document.getElementById("show-completed-btn").addEventListener("click", () => {
  showCompleted = !showCompleted;
  renderCompletedRows();
});

// --- Log Pages popover ---

const logOverlay = document.getElementById("log-overlay");
const logClassSelect = document.getElementById("log-class-select");
const logAssignmentInfo = document.getElementById("log-assignment-info");
const logPagesInput = document.getElementById("log-pages-input");
const logConfirmation = document.getElementById("log-confirmation");

function loggableRows() {
  return rows.filter((r) => !r.completed && Number(r.pages) > 0);
}

function refreshLogPopover() {
  const options = loggableRows();
  const previousValue = logClassSelect.value;
  logClassSelect.innerHTML = "";

  if (options.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "No assignments with pages yet";
    opt.value = "";
    logClassSelect.appendChild(opt);
    logAssignmentInfo.textContent = "Add a class with a page count first.";
    return;
  }

  options.forEach((row) => {
    const opt = document.createElement("option");
    opt.value = row.id;
    opt.textContent = row.class || "(untitled class)";
    logClassSelect.appendChild(opt);
  });

  const stillExists = options.some((r) => r.id === previousValue);
  logClassSelect.value = stillExists ? previousValue : options[0].id;
  updateAssignmentInfo();
}

function updateAssignmentInfo() {
  const row = rows.find((r) => r.id === logClassSelect.value);
  if (!row) {
    logAssignmentInfo.textContent = "";
    return;
  }
  const derived = window.api.deriveRow(row);
  const total = Number(row.pages) || 0;
  const readSoFar = Number(row.pagesRead) || 0;
  let statusLine;
  if (derived.finishedReading) {
    statusLine =
      derived.aheadAmount > 0 ? `Done — ${derived.aheadAmount} pages ahead of pace` : "Done reading";
  } else {
    statusLine = `${derived.remaining} of ${total} pages remaining`;
  }
  logAssignmentInfo.textContent = `${row.title || "(no title set)"} — ${statusLine} (${readSoFar} logged so far)`;
}

logClassSelect.addEventListener("change", updateAssignmentInfo);

document.getElementById("log-pages-btn").addEventListener("click", () => {
  refreshLogPopover();
  logPagesInput.value = "";
  logConfirmation.textContent = "";
  logOverlay.classList.remove("hidden");
  logPagesInput.focus();
});

document.getElementById("log-close-btn").addEventListener("click", () => {
  logOverlay.classList.add("hidden");
});

logOverlay.addEventListener("click", (e) => {
  if (e.target === logOverlay) logOverlay.classList.add("hidden");
});

document.getElementById("log-submit-btn").addEventListener("click", () => {
  const row = rows.find((r) => r.id === logClassSelect.value);
  const amount = Number(logPagesInput.value);
  if (!row || !Number.isFinite(amount) || amount <= 0) return;

  row.pagesRead = String((Number(row.pagesRead) || 0) + amount);
  render();
  scheduleSave();

  const derived = window.api.deriveRow(row);
  const statusLine = derived.finishedReading
    ? derived.aheadAmount > 0
      ? `Done — ${derived.aheadAmount} ahead of pace`
      : "Done reading"
    : `${derived.remaining} pages left`;
  logConfirmation.textContent = `Logged ${amount} pages to ${row.class || "(untitled class)"}. ${statusLine}.`;
  logPagesInput.value = "";
  refreshLogPopover();
  logClassSelect.value = row.id;
  logPagesInput.focus();
});

// --- Settings ---

const settingsOverlay = document.getElementById("settings-overlay");
const settingsThemeSelect = document.getElementById("settings-theme");
const settingsFontFamilySelect = document.getElementById("settings-font-family");
const settingsFontSizeSelect = document.getElementById("settings-font-size");

function applySettings(settings) {
  const root = document.documentElement;
  if (settings.theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", settings.theme);
  root.setAttribute("data-font-family", settings.fontFamily);
  root.setAttribute("data-font-size", settings.fontSize);
}

async function saveAndApplySettings(settings) {
  applySettings(settings);
  await window.api.saveSettings(settings);
}

function openSettingsOverlay() {
  settingsOverlay.classList.remove("hidden");
}

document.getElementById("settings-btn").addEventListener("click", openSettingsOverlay);
document.getElementById("settings-close-btn").addEventListener("click", () => {
  settingsOverlay.classList.add("hidden");
});
settingsOverlay.addEventListener("click", (e) => {
  if (e.target === settingsOverlay) settingsOverlay.classList.add("hidden");
});

window.api.onOpenSettings(openSettingsOverlay);

[settingsThemeSelect, settingsFontFamilySelect, settingsFontSizeSelect].forEach((select) => {
  select.addEventListener("change", () => {
    saveAndApplySettings({
      theme: settingsThemeSelect.value,
      fontFamily: settingsFontFamilySelect.value,
      fontSize: settingsFontSizeSelect.value,
    });
  });
});

// --- Update download progress toast ---

const updateToast = document.getElementById("update-toast");
const updateToastMessage = document.getElementById("update-toast-message");
const updateToastFill = document.getElementById("update-toast-fill");

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

window.api.onUpdaterEvent((payload) => {
  if (payload.type === "download-started") {
    updateToastMessage.textContent = `Downloading update v${payload.version}…`;
    updateToastFill.style.width = "0%";
    updateToast.classList.remove("hidden");
  } else if (payload.type === "download-progress") {
    const pct = Math.round(payload.percent || 0);
    updateToastMessage.textContent = `Downloading update… ${pct}% (${formatBytes(payload.transferred)} / ${formatBytes(payload.total)})`;
    updateToastFill.style.width = `${pct}%`;
  } else if (payload.type === "download-finished") {
    updateToast.classList.add("hidden");
  } else if (payload.type === "download-error") {
    updateToast.classList.add("hidden");
  }
});

async function init() {
  rows = await window.api.loadRows();
  if (rows.length === 0) {
    rows = [
      {
        id: window.api.genId(),
        class: "",
        title: "",
        pages: "",
        pagesRead: "0",
        dueDate: "",
        completed: false,
        completedAt: "",
      },
    ];
  }
  render();
  csvPathLabel.textContent = await window.api.csvPath();

  const settings = await window.api.loadSettings();
  applySettings(settings);
  settingsThemeSelect.value = settings.theme;
  settingsFontFamilySelect.value = settings.fontFamily;
  settingsFontSizeSelect.value = settings.fontSize;
}

init();
