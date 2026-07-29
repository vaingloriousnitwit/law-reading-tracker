# Law Reading Tracker

A small desktop app for keeping track of law school reading assignments. It's a
spreadsheet-style grid — one row per class — that automatically works out how
many pages you need to read per day to finish each assignment on time, and
recalculates as you log pages read or as due dates approach.

## Features

- **Editable grid**: class, next reading (or a note), page count, and due date.
- **Auto-computed pace**: "days until due" (not counting the due date itself)
  and "pages/day" recalculate live from the due date and pages remaining.
- **Log Pages**: a quick popover to log pages read against any assignment.
  Remaining pages and pace update immediately — read less than planned and
  tomorrow's pace goes up to compensate; read ahead and it'll tell you how far
  ahead of pace you are.
- **Mark complete**: check an assignment off and it's archived (with a
  timestamp) while a fresh blank row for that same class appears in its place,
  ready for the next reading. Completed assignments can be shown/hidden and
  restored if checked by mistake.
- **Plain CSV storage**: all data lives in a human-readable CSV file you can
  open directly in Excel, Numbers, or Google Sheets. The app just reads and
  writes that file — there's no hidden database.
- **Check for Updates**: under the app menu, checks GitHub Releases for a
  newer version and offers to download and install it in place.

## Getting started (development)

Requires [Node.js](https://nodejs.org/) (v18+) and npm.

```bash
git clone <this-repo-url>
cd law-reading-tracker
npm install
npm start
```

In development, your data is stored at `data/readings.csv` inside the project
folder (ignored by git — it's personal data, not part of the codebase).

## Building the packaged app

```bash
npm run dist:mac
```

This produces a signed `.app`, `.dmg`, and `.zip` in `release/`. Config for
Windows (`nsis`) and Linux (`AppImage`) targets is also in `package.json`
under `build`, though only the macOS build has been tested so far — PRs
welcome if you get those working.

When packaged, the app stores its CSV at
`~/Documents/Law Reading Tracker/readings.csv` instead of inside the app
bundle (which is read-only once packaged).

### Regenerating the app icon

The icon is generated from a single SVG source:

```bash
npm run icons                      # rasterizes build/icon.svg -> build/icon.iconset + build/icon.png
iconutil -c icns build/icon.iconset -o build/icon.icns   # macOS only
```

## Releasing an update

The packaged app checks GitHub Releases for updates (see `build.publish` in
`package.json`). To ship one:

```bash
# 1. bump "version" in package.json (semver)
# 2. build, sign, and publish a GitHub Release with the new version's dmg/zip
GH_TOKEN=$(gh auth token) npm run release
```

This is currently signed with a local Apple Development identity rather than
a paid Apple Developer ID, so there's no notarization — installs and updates
work, but macOS Gatekeeper will still show its "unidentified developer"
prompt on a first-time install (right-click → Open, or allow it in System
Settings → Privacy & Security). Auto-updates on an already-installed copy are
unaffected by this. Upgrading to a real Developer ID later doesn't require
any code changes here — just add signing/notarization credentials.

## Project structure

```
src/
  main.js       Electron main process — window creation, CSV read/write over IPC
  preload.js    Exposes a small typed API (window.api) to the renderer
  calc.js       Pure date/pages-per-day math, shared by main and renderer
  csv.js        Minimal RFC-4180 CSV parser/stringifier
  id.js         Row id generator
  index.html    UI markup
  renderer.js   UI logic — grid rendering, Log Pages popover, completion flow
  styles.css    Styling (light/dark aware)
build/
  icon.svg      Icon source
  make-icons.js Rasterizes icon.svg to all required PNG sizes
```

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for how to
get set up and submit changes.

## License

[MIT](LICENSE)
