# dsh-refresh-button · 刷新按钮

[English](README.md) | 中文

给 DeepSeek Harness（dsh）桌面端的**窗口菜单行**（带 `应用` / `App` 字样的那一行）
加一个刷新按钮，并把 <kbd>F5</kbd>、<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>
绑到同一个动作。桌面端外壳没有浏览器工具栏，这是改完客户端插件后一键重载页面的入口。

## 行为

- 菜单行最左侧一个 36px 图标按钮，配色跟随宿主主题，深色主题下自动反色；
- 点一下图标转 130ms，随后 `location.reload()`；
- <kbd>F5</kbd> 与 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> 等效（Electron 默认不处理）；
- 控制台可用 `window.__dshRefresh()` 手动触发，`window.__dshRefreshTheme()`
  重新同步图标对比度。

## 安装

标准 dsh bundle，按常规方式安装：

```bash
# npm（发布后）
dsh plugin install dsh-refresh-button

# 直接从 GitHub
dsh plugin install github:GH-cz0827/dsh-refresh-button
```

应用内也可以走 **插件 → 添加**（填仓库地址）或 dshmarket / 插件管理器。
本地目录安装用 `plugin_manager install_bundle`（target 指向包目录）。

首次安装后重启一次 dsh，让浏览器半从新包加载；之后只改客户端代码，
点这个按钮就能热重载。

## 结构

```
dsh-refresh-button/
├── package.json          # dsh.bundle.patch + dsh.client(platform: web)
├── cordis.patch.yml      # 插入 `refresh-button` 这一行
├── lib/index.js          # 宿主半：伺服 /dsh-refresh/icon.svg 与 probe
├── lib/client.js         # 浏览器半：按钮、快捷键、observer
├── assets/icon.svg       # 自绘图标（MIT），同时作为插件列表图标
├── locale/{en,zh}.json   # meta.title / meta.description
└── tools/build-index.mjs # 生成 index.json（插件市场 format 1 索引）
```

## 宿主路由

| 路由 | 用途 |
|---|---|
| `GET /dsh-refresh/icon.svg` | 按钮图标（可用 `$DSH_REFRESH_ICON` 覆盖） |
| `GET /dsh-refresh/icon` | 同上，无扩展名 |
| `GET /dsh-refresh/probe.json` | 诊断：实际命中的图标路径与候选列表 |

图标路由不可用时，按钮退化为内联 SVG，功能不受影响。

## 配置

| 环境变量 | 作用 |
|---|---|
| `DSH_REFRESH_ICON` | 自备图标的绝对路径（SVG/PNG/WebP） |
| `DSH_REFRESH_LOG` | 日志路径，默认 `<tmp>/dsh-refresh-button.log` |

## 发布清单

1. `GH-cz0827` 已写入 `package.json`、`README.md`、`README.zh.md`；
2. `npm publish`（`files` 只打包运行时与展示资源）；
3. 打 tag 发布：`.github/workflows/release.yml` 会打包 tarball 并挂到 Release，
   这是 dshmarket 首选的预构建产物；
4. `node tools/build-index.mjs --repo https://github.com/GH-cz0827/dsh-refresh-button`
   生成并提交 `index.json`，在 dsh 的 **插件 → 发现 → 索引源** 里加上它；
5. 可选：向 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
   提 PR，进入精选目录。

## 卸载

移除该 bundle（`dsh plugin remove dsh-refresh-button` 或插件页开关）即可，
路由随之注销，不会向工作区写任何文件。

## 许可

MIT。`assets/icon.svg` 为本包自绘，同许可。
