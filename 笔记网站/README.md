# 操作系统概论笔记网站

使用 Astro Starlight，包含前三章笔记、全文搜索、习题答案折叠、插图预览、复习记录和调度实验。

界面采用简洁目录式布局，深浅主题采用中性灰底色与蓝色强调，共享语义配色。章节工具栏可选择 16、18、20px 正文字号，设置保存在当前浏览器。首页阅读按钮指向第一章尚未标记复习完成的笔记；全部完成后提供回顾入口。

## 本地运行

需要 Node.js 22.23.4 或更高版本。PowerShell 中进入本目录：

```powershell
npm.cmd install
npm.cmd run dev
```

开发预览地址见终端输出，默认 `http://127.0.0.1:4321/`。

## 更新笔记

正文仍编辑父目录中的三份 `第N章_…_笔记.md`，插图仍放在父目录的 `图/` 与 `笔记插图/`。启动和构建时自动同步，不必手工修改 `src/content/docs/chapters/`。

开发服务器运行中编辑原笔记后，另开终端执行 `npm.cmd run sync:notes`；同步的页面会触发刷新。网站首页在 `src/components/StudyHome.astro`，样式在 `src/styles/notes.css`。

同步脚本会将习题答案转换为可展开区域；第一章已有的 PNG 插图会优先采用同名 SVG。题目与答案正文均保留。

## 构建与部署

```powershell
npm.cmd run build
npm.cmd run preview
```

`dist/` 为可部署的静态文件。需要 HTTP 服务以支持路由、搜索与浏览器模块；不要直接双击其中的 HTML。

部署到域名根目录时，构建前设置实际站点地址；部署到 GitHub Pages 仓库子路径时还需指定 base：

```powershell
$env:SITE_URL = 'https://你的用户名.github.io'
$env:SITE_BASE = '/你的仓库名'
npm.cmd run build
```

`SITE_BASE` 同时应用于导航和正文插图。切回根路径部署时先清除该变量。正式域名未配置时会跳过 sitemap，不影响本地预览。当前项目未发布到外部服务。

## 核验

```powershell
node scripts/test-scheduling.mjs
```

调度实验约定单 CPU、无 I/O、忽略切换开销；SPF 非抢占；轮转的时间片边界先处理新到达者。复习记录仅存于当前浏览器 localStorage。

浏览器回归脚本为 `scripts/browser-smoke.cjs`，供 `playwright-cli run-code --filename=scripts/browser-smoke.cjs` 使用（需先启动 preview，默认 4321 端口）。
