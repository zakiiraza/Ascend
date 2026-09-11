# Ascend

A private, offline character sheet for real-life discipline. Add quests, complete them, level up.

No account, no backend, no analytics. Everything lives in your browser's local storage on your device only.

---

## Get it on your home screen (recommended — 5 minutes, one time)

For it to open full-screen with no browser bar (a real "app" feel, not a bookmark), it needs to be served over `https://` — Chrome won't do a full standalone install from a local file. The easiest free way is GitHub Pages:

1. Create a free GitHub account if you don't have one, and create a new repository (e.g. `ascend`).
2. Upload every file in this folder to that repository — keep the `fonts/` folder intact, don't rename anything.
3. In the repo, go to **Settings → Pages**. Under "Branch", pick `main` and folder `/ (root)`, then Save.
4. GitHub gives you a URL like `https://yourname.github.io/ascend/`. Wait ~1 minute, then open it in Chrome **on your phone**.
5. Tap the ⋮ menu → **"Install app"** (or "Add to Home screen"). Confirm.

You'll now have an Ascend icon on your home screen that opens full-screen and works offline after the first load.

## Quick local test (no GitHub, no real install)

Just open `index.html` in a browser to preview it right now. This works fine to look around, but a `file://` page can't register as a real installable app — you'll still see the browser's address bar. Use this only to check the design before doing the GitHub Pages setup above.

If you want a closer-to-real test on-device: in Termux, `cd` into this folder and run `python -m http.server 8080`, then open `http://localhost:8080` in Chrome on the same device and install from there. This only works while that Termux session is running, so it's for testing, not daily use.

## Your data

- Stored entirely in the browser's local storage on your device. Nothing is sent anywhere.
- **Settings → Export backup** downloads a `.json` file — do this occasionally so a cleared browser/cache can't wipe your progress.
- **Settings → Import backup** restores from that file, on this device or a new one.
- Clearing your browser's site data for this app, or uninstalling it, deletes everything. Back up first.

## Editing it yourself

Plain HTML/CSS/JS, no build step, no dependencies:

- `index.html` — page structure
- `style.css` — all styling (colors/fonts are CSS variables near the top)
- `app.js` — all logic: quests, XP/leveling math, streaks, rendering
- `manifest.json` / `sw.js` — what makes it installable and offline-capable

Levelling curve, default XP per quest frequency, class titles, and category colors are all defined near the top of `app.js` if you want to retune them.
