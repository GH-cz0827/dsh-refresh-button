# Changelog

## 1.0.0 — 2026-10-24

First distributable release.

- Packaged as a standard dsh bundle: `dsh.bundle.patch` + `dsh.client`
  (`platform: web`), so `dsh plugin install`, plugin_manager and dshmarket all
  accept it.
- Added `locale/en.json`, `locale/zh.json` and a package-root `icon`, so the
  Plugins page shows a real title, description and glyph.
- The artwork now ships inside the package (`assets/icon.svg`, original MIT
  drawing); `$DSH_REFRESH_ICON` still overrides it. No machine-specific paths.
- Host half declares `inject: ['webServer']`, owns every route through
  `ctx.effect` (so a hot reload disposes them instead of leaving
  `duplicate exact route` behind), logs to `<tmp>` instead of a fixed drive path,
  and exposes `/dsh-refresh/probe.json`.
- Client half localizes its tooltip (`应用` / `App` detection on both languages)
  and keeps the shadow-root-safe mounting, F5 shortcut and theme inversion.
