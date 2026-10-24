/**
 * dsh-refresh-button — browser half.
 *
 * Adds one 36px refresh button at the left of the window-menu row (the row that
 * holds the 「应用」 / "App" label), plus F5 and Ctrl+Shift+R as shortcuts.
 *
 * Constraints this file is written against:
 *  - The menu row can live inside a shadow root, where document-level CSS does
 *    not apply — every appearance rule is therefore an inline style and the
 *    hover/spin states are driven from JS.
 *  - Mounting is retried on a 200ms timer while React re-renders, and a
 *    MutationObserver re-mounts the button when it gets detached.
 *  - Nothing here may throw into the host page.
 *
 * Artwork: GET /dsh-refresh/icon.svg (host half serves the packaged SVG and
 * inverts it on dark themes). If that route is missing the inline glyph below
 * is used instead.
 */
window.__ModuleLoader__.load({
  id: 'dsh-refresh-button',
  factory: function (require) {
    'use strict'
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var ICON_SRC = '/dsh-refresh/icon.svg'
    var ICON_SIZE = 20
    var BOX = 36
    var BTN_ID = 'dsh-refresh-button'
    var FALLBACK_SVG =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20 11a8 8 0 1 0-2.6 5.9"/><path d="M20 4v7h-7"/></svg>'

    function zh() {
      try {
        var lang = (document.documentElement.getAttribute('lang') || navigator.language || '').toLowerCase()
        return lang.indexOf('zh') === 0
      } catch (e) {
        return false
      }
    }

    function labels() {
      return zh()
        ? { menu: '应用', title: '刷新界面（F5）', aria: '刷新界面' }
        : { menu: 'App', title: 'Reload the UI (F5)', aria: 'Reload the UI' }
    }

    var btnEl = null
    var imgEl = null
    var timer = null
    var ticks = 0

    function isDark() {
      try {
        if (document.body && document.body.hasAttribute('data-ds-dark-theme')) return true
        if (document.documentElement.classList.contains('dark')) return true
        var bg = getComputedStyle(document.body || document.documentElement).backgroundColor || ''
        var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(bg)
        if (m) return (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3 < 110
      } catch (e) {}
      return false
    }

    function syncTheme() {
      if (!imgEl) return
      imgEl.style.filter = isDark() ? 'invert(1) brightness(1.25)' : 'none'
    }

    function icon() {
      var wrap = document.createElement('span')
      wrap.style.cssText = 'display:block;width:' + ICON_SIZE + 'px;height:' + ICON_SIZE + 'px;line-height:0'
      var img = document.createElement('img')
      img.alt = ''
      img.decoding = 'async'
      img.draggable = false
      img.style.cssText = 'width:100%;height:100%;display:block;object-fit:contain;pointer-events:none'
      img.onerror = function () {
        wrap.innerHTML = FALLBACK_SVG
      }
      img.src = ICON_SRC + '?v=' + Date.now()
      wrap.appendChild(img)
      imgEl = img
      syncTheme()
      return wrap
    }

    function refresh() {
      try {
        window.location.reload()
      } catch (e) {
        try {
          window.location.href = window.location.href
        } catch (e2) {}
      }
    }

    function makeButton() {
      var text = labels()
      var btn = document.createElement('button')
      btn.id = BTN_ID
      btn.type = 'button'
      btn.title = text.title
      btn.setAttribute('aria-label', text.aria)
      btn.style.cssText = [
        'box-sizing:border-box',
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'flex:0 0 auto',
        'align-self:center',
        'padding:0',
        'border:0',
        'border-radius:9px',
        'cursor:pointer',
        'background:transparent',
        'color:inherit',
        'opacity:0.8',
        'width:' + BOX + 'px',
        'height:' + BOX + 'px',
        'margin:0 6px 0 2px',
        '-webkit-app-region:no-drag',
        'transition:background .12s ease,opacity .12s ease',
      ].join(';') + ';'
      btn.appendChild(icon())
      btn.addEventListener('mouseenter', function () {
        btn.style.opacity = '1'
        btn.style.background = isDark() ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.08)'
      })
      btn.addEventListener('mouseleave', function () {
        btn.style.opacity = '0.8'
        btn.style.background = 'transparent'
      })
      btn.addEventListener('mousedown', function (ev) {
        ev.preventDefault()
        ev.stopPropagation()
      })
      btn.addEventListener('click', function (ev) {
        ev.preventDefault()
        ev.stopPropagation()
        var box = btn.firstElementChild
        if (box) box.style.animation = 'dsrb-spin .55s linear infinite'
        setTimeout(refresh, 130)
      })
      var keyframes = document.getElementById('dsh-refresh-keyframes')
      if (!keyframes) {
        keyframes = document.createElement('style')
        keyframes.id = 'dsh-refresh-keyframes'
        keyframes.textContent = '@keyframes dsrb-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}'
        ;(document.head || document.documentElement).appendChild(keyframes)
      }
      return btn
    }

    function collectRoots() {
      var roots = [document]
      var srCount = 0
      for (var i = 0; i < roots.length && srCount < 40; i++) {
        var all
        try {
          all = roots[i].querySelectorAll('*')
        } catch (e) {
          continue
        }
        for (var j = 0; j < all.length; j++) {
          var shadow = all[j].shadowRoot
          if (shadow) {
            roots.push(shadow)
            srCount += 1
          }
        }
      }
      return roots
    }

    function findMenuRow(roots) {
      var wanted = [labels().menu, '应用', 'App']
      for (var i = 0; i < roots.length; i++) {
        var all
        try {
          all = roots[i].querySelectorAll('*')
        } catch (e) {
          continue
        }
        for (var j = 0; j < all.length; j++) {
          var el = all[j]
          if (el.id === BTN_ID) continue
          var text = (el.textContent || '').trim()
          if (wanted.indexOf(text) < 0) continue
          var rect = el.getBoundingClientRect()
          if (!rect.width || !rect.height || rect.top > 120 || rect.left > 700) continue
          if (el.parentNode && el.parentNode.children) return { item: el, row: el.parentNode }
        }
      }
      return null
    }

    function purgeStrays(roots) {
      for (var i = 0; i < roots.length; i++) {
        var found
        try {
          found = roots[i].querySelectorAll('#' + BTN_ID)
        } catch (e) {
          continue
        }
        for (var j = 0; j < found.length; j++) {
          if (found[j] !== btnEl) {
            try {
              found[j].parentNode.removeChild(found[j])
            } catch (e) {}
          }
        }
      }
    }

    function mount(hit) {
      if (!hit) return false
      if (btnEl && btnEl.isConnected) return true
      if (!btnEl) btnEl = makeButton()
      var first = hit.row.firstElementChild
      if (first === btnEl) return true
      hit.row.insertBefore(btnEl, first || hit.item)
      return true
    }

    function tick() {
      var roots = collectRoots()
      purgeStrays(roots)
      var mounted = mount(findMenuRow(roots))
      if (mounted && timer) {
        clearInterval(timer)
        timer = null
      }
      return mounted
    }

    function boot() {
      if (window.__dshRefreshBooted) return
      window.__dshRefreshBooted = true
      timer = setInterval(function () {
        ticks += 1
        try {
          tick()
        } catch (e) {}
        if (ticks > 60) {
          clearInterval(timer)
          timer = null
          try {
            tick()
          } catch (e) {}
        }
      }, 200)
      try {
        new MutationObserver(function () {
          try {
            var roots = collectRoots()
            purgeStrays(roots)
            if (!btnEl || !btnEl.isConnected) tick()
            syncTheme()
          } catch (e) {}
        }).observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['data-ds-dark-theme', 'class'],
        })
      } catch (e) {}
      document.addEventListener(
        'keydown',
        function (ev) {
          var isF5 = ev.key === 'F5'
          var isHard = ev.key === 'r' && (ev.ctrlKey || ev.metaKey) && ev.shiftKey
          if (isF5 || isHard) {
            ev.preventDefault()
            refresh()
          }
        },
        true,
      )
      window.__dshRefresh = refresh
      window.__dshRefreshTheme = syncTheme
    }

    function apply() {
      try {
        boot()
      } catch (e) {
        console.error('[dsh-refresh-button] boot failed', e)
      }
    }

    exports.apply = apply
    exports.inject = []
    exports.refresh = refresh
    return module.exports
  },
})
