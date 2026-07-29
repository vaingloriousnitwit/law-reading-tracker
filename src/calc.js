// Pure calculation helpers shared by main and renderer.

function todayLocalDateOnly() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDateOnly(dateStr) {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}

// Days available to read = calendar days between today and the due date,
// NOT counting the due date itself (so if due date is tomorrow, you have 1 day: today).
function daysUntilDue(dueDateStr) {
  const due = parseDateOnly(dueDateStr);
  if (!due) return null;
  const today = todayLocalDateOnly();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((due.getTime() - today.getTime()) / msPerDay);
}

function pagesPerDay(pages, days) {
  const p = Number(pages);
  if (!Number.isFinite(p) || p <= 0) return null;
  if (days === null || days === undefined) return null;
  if (days <= 0) return p; // overdue or due today: all remaining pages are "today's" load
  return Math.round(p / days);
}

// Derives display-only fields for a row without mutating stored fields.
// "Remaining" pages (total - logged) drives both the days-left status and the pace math,
// so logging pages or letting a day pass both naturally reflow the pace.
function deriveRow(row) {
  const pages = Number(row.pages);
  const hasPages = Number.isFinite(pages) && pages > 0;
  const pagesRead = Number(row.pagesRead) || 0;
  const remainingRaw = hasPages ? pages - pagesRead : null;
  const aheadAmount = hasPages && remainingRaw < 0 ? Math.abs(remainingRaw) : 0;
  const remaining = hasPages ? Math.max(remainingRaw, 0) : null;
  const finishedReading = hasPages && remainingRaw <= 0;

  const days = daysUntilDue(row.dueDate);
  const perDay = finishedReading ? 0 : pagesPerDay(remaining, days);

  let status = "ok";
  if (row.dueDate && days !== null) {
    if (days < 0) status = "overdue";
    else if (days === 0) status = "due-today";
  }

  return { days, perDay, status, hasPages, pagesRead, remaining, aheadAmount, finishedReading };
}

module.exports = { todayLocalDateOnly, parseDateOnly, daysUntilDue, pagesPerDay, deriveRow };
