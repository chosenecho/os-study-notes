# 站点体验审计 · 共同约定

## 被测对象

| 环境 | URL | 说明 |
|---|---|---|
| 本地部署（默认用这个） | `http://127.0.0.1:8123` | 已由 Lead 构建并起静态服务器。构建命令 `python -m mkdocs build -f 站点/mkdocs.yml --strict`，`SITE_URL=https://studynote.chosenecho.dpdns.org/`。产物在 `站点/dist/`，HTML 中的绝对地址与线上一致。 |
| 线上 | `https://studynote.chosenecho.dpdns.org` | Cloudflare Pages 源站 + Worker 反代。已核对：线上 HTML = 本地构建 + 一段 Cloudflare Web Analytics beacon，其余逐字节一致。个别抽查用线上即可。 |

站点是 MkDocs Material 9.7.7（`zh`），自定义样式 `站点/docs/assets/notes.css`，交互脚本 `站点/docs/assets/interactions.js`（构建时被 esbuild 打包进产物，源码同内容）。

页面：

- `/`　首页：课程卡片、章节列表、复习进度条、交互练习入口
- `/chapters/chapter-1..6/`　操作系统概论六章（含插图、教材习题折叠答案、复习工具条）
- `/computer-organization/chapter-1..6/`　计算机组成原理六章（习题是表格，未折叠）
- `/lab/scheduling/`　进程调度实验（表单 + 甘特图 + 结果表）

## 环境与工具

- 仓库根目录 = `C:\Users\ChosenEcho\Documents\学习资料`。**所有命令都在仓库根目录执行**（`node qa/<脚本>.mjs`），否则相对路径会错。
- Playwright 已装好，`import { chromium } from 'playwright'` 可直接用（全局 `node_modules` 在 `C:\Users\ChosenEcho\node_modules`）。
- 共用工具：`qa/lib/audit.mjs`。常用导出：

```js
import { session, DEVICES, PAGES, custom, goto, warm, layout, tapTargets, contrast, a11y,
         auditPage, shot, shotElement, saveJSON, diagnostics, LOCAL, LIVE } from './lib/audit.mjs';

const s = await session('iphone-se');            // 或 session('desktop-1440', { colorScheme:'light' })
await goto(s.page, PAGES.os2);                   // 或 PAGES.home / PAGES.lab / PAGES.co1
await warm(s.page);                              // 滚动到底再回顶，触发 lazy 图片
const l = await layout(s.page);                  // 横向溢出、表格溢出、被裁切元素
const t = await tapTargets(s.page);              // 小于 44px 的可点元素
const c = await contrast(s.page);                // 对比度不足的文字（含 placeholder）
const a = await a11y(s.page);                    // 标题层级、landmark、图片 alt、字号
const p = await shot(s.page, 'artifacts/mobile/home.png');       // 存到 qa/artifacts/...
await s.close();
```

`auditPage(page, pathName)` 一把梭：`goto + warm + layout + tapTargets + contrast + a11y`。

## 已知陷阱（别当成缺陷重新发现，也别被它骗到）

1. **站点不跟随系统深色模式**：`mkdocs.yml` 的两个 palette 没写 `media`，`prefers-color-scheme: dark` 无效。要测深色，点右上角月亮图标（`label[for="__palette_1"]`），或用 `page.evaluate(() => localStorage.setItem('__palette', ...))` 后刷新；也可以直接点。
2. **`html` 根字号是 20px**（Material 的 `font-size:125%`），而 `notes.css` 里大量用 `rem` 当 px 写（`.875rem` = 17.5px）。这类「小字比正文还大」的现象要当成候选缺陷，先量再判。
3. **图片 `loading="lazy"`**：不滚动就统计会出现「图片全挂」的假象。先 `warm()`。
4. **`/lab/` 返回 404 是正常的**（没有目录索引页），导航链到的是 `/lab/scheduling/`。
5. 本地服务已起（`python -m http.server 8123`，`站点/dist`）。不要重启、不要重跑构建、不要改 `站点/` 下任何文件。

## 产物与写盘范围

只写自己的目录，不要动别人的文件：

| 成员 | 脚本 | 截图 | 报告 |
|---|---|---|---|
| qa-mobile | `qa/scripts/mobile.mjs` | `qa/artifacts/mobile/` | `qa/reports/mobile.json`、`qa/reports/mobile.md` |
| qa-tablet | `qa/scripts/tablet.mjs` | `qa/artifacts/tablet/` | `qa/reports/tablet.json`、`qa/reports/tablet.md` |
| qa-desktop | `qa/scripts/desktop.mjs` | `qa/artifacts/desktop/` | `qa/reports/desktop.json`、`qa/reports/desktop.md` |
| qa-functional | `qa/scripts/functional.mjs` | `qa/artifacts/functional/` | `qa/reports/functional.json`、`qa/reports/functional.md` |
| qa-delivery | `qa/scripts/delivery.mjs` | `qa/artifacts/delivery/` | `qa/reports/delivery.json`、`qa/reports/delivery.md` |

`qa/reports/<成员>.json` 的结构：

```json
{
  "member": "qa-mobile",
  "env": "local",
  "devices": ["iPhone SE 375x667", "..."],
  "findings": [
    {
      "id": "MOB-01",
      "title": "一句话说清是什么坏了",
      "severity": "P1",
      "category": "responsive | typography | navigation | interaction | a11y | content | performance | delivery",
      "device": "iPhone SE 375x667 / Safari-ish UA",
      "url": "http://127.0.0.1:8123/chapters/chapter-2/",
      "steps": ["滚动到…", "点击…"],
      "expected": "按常识/README 承诺应该怎样",
      "actual": "实际怎样（带数字：px、比例、数量）",
      "measurements": { "任何能量化的键值": 0 },
      "evidence": ["artifacts/mobile/mob-01.png"],
      "source": "notes.css:123 或 interactions.js 里的函数 + 行号，能定位就写",
      "fix": "一两句具体改法"
    }
  ]
}
```

严重度口径（用来统一排序）：

- **P0** 功能不可用 / 内容丢失 / 白屏报错
- **P1** 主要流程被卡住或明显误导（导航进不去、点不动、文案与行为不符）
- **P2** 明显影响阅读或操作，但有绕法（排版塌陷、对比度、触控目标过小、布局跳动）
- **P3** 细节、观感、可维护性问题

## 判定纪律

- **每个缺陷必须有截图**（`qa/artifacts/...`）+ **至少一个量化证据**（px / 对比度比值 / 元素计数 / HTTP 状态码）+ 可复现步骤。
- 不确定就写"待确认"，不要编。怀疑是浏览器默认行为、Material 自带行为、或纯审美偏好时，标注 `scope: "upstream"` 或 `scope: "taste"`，别混进主线缺陷。
- 视觉类问题 light / dark 都要看。
- 同一现象不要按设备重复计数：一个缺陷一条，写清"受影响设备/宽度"。
- 每个成员 8–15 条质量过硬的缺陷即可，宁少勿滥。

## 协作

- 先 `team_task_list`，认领自己那张任务卡（claim），做完 `team_task_update` → `complete`。
- 结束后给 Lead 发一条 ≤8 行的消息：条数、P0/P1 清单标题、报告文件路径。
- 不要互相改文件；不要 git commit。
