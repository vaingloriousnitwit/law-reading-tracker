# Contributing

Thanks for considering a contribution to Law Reading Tracker!

## Setup

```bash
npm install
npm start
```

This runs the app straight from source with Electron's dev tooling. There's
no build step needed for development — edit files in `src/` and restart the
app (`Cmd+R` in the DevTools console, or quit and re-run `npm start`) to see
changes.

## Before submitting a PR

- Run the app and manually exercise whatever you changed — there's no
  automated test suite yet (a welcome contribution!).
- Keep changes focused. If you spot an unrelated bug or cleanup opportunity
  while working, feel free to mention it in the PR description rather than
  bundling it in.
- Match the existing code style: plain JS (no build/transpile step, no
  framework), minimal comments (only where the *why* isn't obvious from the
  code itself), no added dependencies unless there's a good reason.

## Reporting bugs / suggesting features

Open a GitHub issue with:
- What you expected to happen vs. what actually happened
- Steps to reproduce, if it's a bug
- Your OS and Node version

## Ideas for contributions

- Windows/Linux packaging (config is in `package.json` but untested)
- Automated tests for the pace/date math in `src/calc.js`
- A history log of pages logged over time (currently only a running total is
  kept per assignment)
- Multiple queued readings per class (currently one active reading per class)
