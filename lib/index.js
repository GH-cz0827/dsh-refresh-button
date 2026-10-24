/**
 * dsh-refresh-button — host half.
 *
 * The browser half needs one thing from the host: the button artwork, served as a
 * real image over HTTP (`/dsh-refresh/icon.svg`). Everything else is client-side.
 *
 * Icon resolution order (first existing non-empty file wins):
 *   1. $DSH_REFRESH_ICON                 (your own glyph; absolute path)
 *   2. <plugin>/assets/icon.svg          (shipped with the package)
 *   3. <plugin>/assets/icon.png | .webp | .gif
 *
 * `ctx.webServer` only exists after declaring the injection, so the route
 * registration runs inside `root.inject(['webServer'], ...)`. When the Web
 * carrier is absent (headless / CLI profile) the plugin simply does nothing —
 * the browser half then falls back to its inline SVG glyph.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGE_MANIFEST = readManifest()
const LOG = process.env.DSH_REFRESH_LOG || path.join(os.tmpdir(), 'dsh-refresh-button.log')

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'))
  } catch {
    return { name: 'dsh-refresh-button', version: '0.0.0' }
  }
}

function log(msg) {
  try {
    fs.appendFileSync(LOG, '[' + new Date().toISOString() + '] ' + msg + '\n')
  } catch {
    /* logging must never break the host */
  }
}

const ICON_CANDIDATES = [
  process.env.DSH_REFRESH_ICON || '',
  path.join(PACKAGE_ROOT, 'assets', 'icon.svg'),
  path.join(PACKAGE_ROOT, 'assets', 'icon.png'),
  path.join(PACKAGE_ROOT, 'assets', 'icon.webp'),
  path.join(PACKAGE_ROOT, 'assets', 'icon.gif'),
].filter(Boolean)

const MIME = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

function pickIcon() {
  for (const candidate of ICON_CANDIDATES) {
    try {
      const stat = fs.statSync(candidate)
      if (stat.isFile() && stat.size > 0) return candidate
    } catch {
      /* try the next candidate */
    }
  }
  return ''
}

let cache = { file: '', mtime: 0, bytes: null }

function readIcon() {
  const file = pickIcon()
  if (!file) return null
  try {
    const stat = fs.statSync(file)
    if (cache.file !== file || cache.mtime !== stat.mtimeMs || !cache.bytes) {
      cache = { file, mtime: stat.mtimeMs, bytes: fs.readFileSync(file) }
      log('icon loaded: ' + file + ' (' + cache.bytes.length + ' bytes)')
    }
    return { file, bytes: cache.bytes }
  } catch (error) {
    log('icon read failed: ' + String(error?.message ?? error))
    return null
  }
}

function iconHandler(_req, res) {
  try {
    const hit = readIcon()
    if (!hit) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('icon not found; tried:\n' + ICON_CANDIDATES.join('\n'))
      return
    }
    res.statusCode = 200
    res.setHeader('Content-Type', MIME[path.extname(hit.file).toLowerCase()] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.setHeader('Content-Length', String(hit.bytes.length))
    res.end(hit.bytes)
  } catch (error) {
    log('icon handler error: ' + String(error?.message ?? error))
    try {
      res.statusCode = 500
      res.end('icon handler error')
    } catch {
      /* response already gone */
    }
  }
}

function probeHandler(_req, res) {
  try {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.end(
      JSON.stringify(
        {
          package: PACKAGE_MANIFEST.name,
          version: PACKAGE_MANIFEST.version,
          icon: pickIcon() || null,
          candidates: ICON_CANDIDATES,
        },
        null,
        2,
      ),
    )
  } catch (error) {
    log('probe handler error: ' + String(error?.message ?? error))
  }
}

const disposers = []
/** True while this generation's routes are registered; cleared when they are torn down. */
let live = false

/**
 * Register one route through `ctx.effect`, so the fiber that mounted this plugin
 * owns the registration and disposes it on unload / hot reload. A bare
 * `web.register()` leaks the exact route: the next module generation then fails
 * with `duplicate exact route` until the host restarts.
 */
function own(ctx, web, route) {
  const mount = () => {
    const dispose = web.register({ kind: 'exact', path: route.path, handler: route.handler })
    log('route registered: ' + route.path)
    return () => {
      try {
        if (typeof dispose === 'function') dispose()
      } catch {
        /* already gone */
      }
      log('route disposed: ' + route.path)
    }
  }
  if (typeof ctx.effect === 'function') {
    ctx.effect(mount)
    return
  }
  try {
    disposers.push(web.register({ kind: 'exact', path: route.path, handler: route.handler }))
    log('route registered (no ctx.effect): ' + route.path)
  } catch (error) {
    log('route register failed for ' + route.path + ': ' + String(error?.message ?? error))
  }
}

function registerRoutes(ctx) {
  if (live) return
  const web = ctx?.webServer ?? (typeof ctx?.get === 'function' ? ctx.get('webServer') : undefined)
  if (!web || typeof web.register !== 'function') {
    log('webServer service unavailable; icon route not registered (client falls back to its inline SVG)')
    return
  }
  const routes = [
    { path: '/dsh-refresh/icon.svg', handler: iconHandler },
    { path: '/dsh-refresh/icon', handler: iconHandler },
    { path: '/dsh-refresh/probe.json', handler: probeHandler },
  ]
  live = true
  try {
    for (const route of routes) own(ctx, web, route)
  } catch (error) {
    log('route registration aborted: ' + String(error?.message ?? error))
  }
  // Release the guard with the registrations themselves, so a remount of the same
  // module instance (not just a fresh generation) can register again.
  if (typeof ctx?.effect === 'function') {
    ctx.effect(() => () => {
      live = false
      log('routes released')
    })
  }
}

export const inject = ['webServer']

export function apply(root) {
  log('apply() called; picked=' + (pickIcon() || '(none)'))
  // `inject` above already guarantees the service; register on this plugin's own
  // context so the routes belong to the plugin fiber and outlive a re-composition.
  const web = root?.webServer ?? (typeof root?.get === 'function' ? root.get('webServer') : undefined)
  if (web) {
    registerRoutes(root)
    return
  }
  if (root && typeof root.inject === 'function') {
    try {
      root.inject(['webServer'], (ctx) => registerRoutes(ctx))
      return
    } catch (error) {
      log('root.inject failed: ' + String(error?.message ?? error))
    }
  }
  registerRoutes(root)
}

export function dispose() {
  while (disposers.length) {
    const dispose = disposers.pop()
    try {
      if (typeof dispose === 'function') dispose()
    } catch {
      /* already disposed */
    }
  }
  live = false
}

/** Diagnostics for the host side: which file the button will use. */
export function iconPath() {
  return pickIcon()
}
