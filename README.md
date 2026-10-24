# dsh-refresh-button

[中文](README.zh.md) | English

A DeepSeek Harness (dsh) bundle that puts a **reload button** into the desktop
app's window-menu row — the row that holds the `应用` / `App` label — and binds
<kbd>F5</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> to the same action.
The desktop shell has no browser chrome, so this is the only one-click way to
reload the page after a client-side plugin change.

## What you get

- A 36px icon button at the left of the menu row, themed from the host palette
  and inverting automatically on dark themes.
- One click spins the glyph for ~130ms, then calls `location.reload()`.
- <kbd>F5</kbd> and <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> trigger the
  same reload (the Electron shell does not handle them itself).
- `window.__dshRefresh()` reloads on demand; `window.__dshRefreshTheme()`
  re-syncs the icon contrast.

## Install

Published as a dsh bundle — install it the normal way:

```bash
# npm (once published)
dsh plugin install dsh-refresh-button

# straight from GitHub
dsh plugin install github:GH-cz0827/dsh-refresh-button
```

Inside the app you can also use **Plugins → Add** with the repository URL, or the
dshmarket / plugin-manager UI. A local checkout installs with
`plugin_manager install_bundle` (target: the package directory).

Restart dsh once after the first install so the browser half is served from the
new package; later client-only edits hot-reload by clicking this very button.

## Package layout

```
dsh-refresh-button/
├── package.json          # dsh.bundle.patch + dsh.client (platform: web)
├── cordis.patch.yml      # inserts the `refresh-button` loader row
├── lib/index.js          # host half: serves /dsh-refresh/icon.svg + probe
├── lib/client.js         # browser half: button, shortcuts, observer
├── assets/icon.svg       # original artwork (MIT), also the plugin-list icon
├── locale/{en,zh}.json   # meta.title / meta.description
└── tools/build-index.mjs # generates index.json (plugin market index, format 1)
```

## Host routes

| Route | Purpose |
|---|---|
| `GET /dsh-refresh/icon.svg` | Button artwork (override with `$DSH_REFRESH_ICON`). |
| `GET /dsh-refresh/icon` | Same bytes, no extension. |
| `GET /dsh-refresh/probe.json` | Diagnostics: resolved artwork path and candidates. |

The button falls back to an inline SVG glyph when the icon route is absent, so a
headless profile still renders a working control.

## Configuration

| Variable | Effect |
|---|---|
| `DSH_REFRESH_ICON` | Absolute path to your own glyph (SVG/PNG/WebP). |
| `DSH_REFRESH_LOG` | Log file path; defaults to `<tmp>/dsh-refresh-button.log`. |

## Publishing checklist

1. Replace `GH-cz0827` in `package.json`, `README.md` and `README.zh.md`.
2. `npm publish` (the `files` list ships only runtime + display resources).
3. Tag a release: `.github/workflows/release.yml` packs the tarball and attaches
   it to the GitHub Release, which is the artifact dshmarket prefers for
   prebuilt installs.
4. Generate the market index with `node tools/build-index.mjs --repo
   https://github.com/GH-cz0827/dsh-refresh-button` and commit
   `index.json`; add it in dsh as **Plugins → Discover → Index sources**.
5. Optional: open a PR against
   [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
   to have it appear in the curated catalog.

## Uninstall

Remove the bundle (`dsh plugin remove dsh-refresh-button`, or the Plugins page).
The loader row and the routes disappear with it; nothing is written to the
workspace.

## License

MIT. The artwork in `assets/icon.svg` was drawn for this package and is covered
by the same license.
