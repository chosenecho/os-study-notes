# 操作系统概论学习笔记

依据《操作系统概论（2017 年版）》与自学考试大纲整理的前三章笔记，使用 Astro Starlight 展示。

网站提供中文搜索、章节目录、逐题答案折叠、插图放大、浏览器内复习进度与字号设置，以及 FCFS、SPF、时间片轮转调度实验。

## 本地运行

需要 Node.js 22.23.4 或更高版本。

```sh
cd 笔记网站
npm ci
npm run dev
```

## 构建

```sh
cd 笔记网站
npm run build
npm run preview
```

部署平台的项目根目录设置为 `笔记网站`，构建命令为 `npm run build`，产物目录为 `dist`。正式部署时通过 `SITE_URL` 设置域名，使用子路径时另外设置 `SITE_BASE`。

EdgeOne 的 GitHub 项目可直接以仓库根目录构建：根目录的 `edgeone.json` 会配置依赖安装、构建命令和产物位置。平台默认 Node 22.11.0 低于当前 Astro 的要求，因此安装及构建命令通过 npm 的 Node 分发包使用 Node 24.16.0。

阿里云 ESA CLI 使用根目录的 `esa.jsonc`，静态资源目录为 `笔记网站/dist`。进入 `笔记网站` 构建后，可执行 `esa deploy --name os-study-notes --environment production` 发布。

三章原始 Markdown 放在仓库根目录，插图位于 `图/` 和 `笔记插图/`。启动和构建时会自动同步至网站内容目录。详细说明见 [网站维护说明](笔记网站/README.md)。

## 检查

```sh
cd 笔记网站
npm test
```

题目和教材结论按笔记中的依据说明理解。仓库只包含整理的笔记与网站所需插图。
