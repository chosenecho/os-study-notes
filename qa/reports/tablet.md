# 平板 / 中等宽度体验审计（768–1220px）· qa-tablet

**被测**：`http://127.0.0.1:8123`（MkDocs Material 9.7.7 + `站点/docs/assets/notes.css`），线上 `https://studynote.chosenecho.dpdns.org` 抽查对照。
**结论一句话**：断点本身没坏，坏在断点之间的空档——`notes.css` 只有 640px 一个断点，而 Material 在 960px 加右侧目录、1220px 加左侧导航，于是正文列在 686–945px 之间反复跳崖（单次 −241px），iPad 横屏（1024）的正文比竖屏（820）还窄；同一空档里表格列被 Material 的 `th{min-width:5rem}` 钉死在 100px，中文被迫折出单字行。
**总量**：11 条 —— P0 0 条 / **P1 1 条** / P2 5 条 / P3 5 条；其中 4 条标注为 Material 上游默认行为或审美取舍（`scope`）。

| ID | 级别 | 标题 | 分类 |
|---|---|---|---|
| TBL-02 | **P1** | 甘特图 236–284px 被藏且无提示（图看着到 8，实际到 11） | interaction |
| TBL-01 | P2 | 断点空档正文列宽非单调塌陷（两次 −241px，横屏比竖屏窄） | responsive |
| TBL-03 | P2 | 表格列被钉在 100px，1024 下 5 处中文末行单字 | typography |
| TBL-04 | P2 | h1 32px ≈ h2 31px，标题层级塌陷 | typography |
| TBL-05 | P2 | 首页主 CTA 触控目标仅 84×17px | interaction |
| TBL-10 | P2 · upstream | 目录链接 18–36px 高（19 个 <24px）、页头按钮 40×40 | a11y |
| TBL-06 | P3 | rem 当 px 写，工具条 17.5px > 正文 16px | typography |
| TBL-07 | P3 | 960–1219 布局左右失衡（左 16 / 右 258） | responsive |
| TBL-08 | P3 · taste | 深色主题插图仍是 736×400 纯白卡片 | content |
| TBL-09 | P3 · upstream | 开抽屉后旋转，抽屉保持打开并遮罩全屏 | navigation |
| TBL-11 | P3 · upstream | 浅色 3 处对比度 4.42–4.49:1（差 0.01–0.08） | a11y |

---

## 1. 审计范围与方法

| 项 | 内容 |
|---|---|
| 档位 | `ipad-portrait 768×1024`、`ipad-air 820×1180`、`surface-pro 912×1368`、`ipad-landscape 1024×768`，另加 `custom 960×800`、`1219×800`、`1220×800` |
| 主题 | light + dark 各一遍（深色点 `label[for="__palette_1"]`，并用 body 背景 `rgb(24,25,29)` 复核已生效） |
| 断点对 | 719/720、959/960、1219/1220 用 `page.setViewportSize` 来回切，每次等 650ms 动画落定后再量 |
| 页面 | `/`、`/chapters/chapter-2/`、`/chapters/chapter-3/`、`/computer-organization/chapter-1/`、`/computer-organization/chapter-2/`、`/lab/scheduling/` |
| 脚本 | `node qa/scripts/tablet.mjs probe` / `deep` / `measure` / `extra` / `final`（原始数据落在 `qa/reports/_tablet-*.json`） |
| 覆盖 | 断点矩阵、正文列宽与行字数、表格列宽/孤字、甘特图溢出、页头挤压、触控目标全量、对比度、a11y 结构、深色插图、首页 CTA、线上抽查 |

设备相关前提（来自 `qa/lib/audit.mjs`）：四个平板档位均 `hasTouch:true, isMobile:true`，UA 为 iPad / Android 平板，因此触控目标与 hover 判断按真机触屏口径。

---

## 2. 断点行为矩阵（chapter-2，light，实测值）

Material 的断点按 16px 基准换算：`44.984375em=719.75px`、`59.984375em=959.75px`、`76.234375em=1219.75px`、`76.25em=1220px`；`notes.css` 的 `40rem` 媒体查询同为 640px。

| 视口 | `.md-content` | `.md-content__inner` | 每行汉字 | 左导航 | 右侧目录 | 汉堡 |
|---|---|---|---|---|---|---|
| 719 | 719 | 687 | 49 | 抽屉（离屏 −242） | 无 | 40px |
| 720 | 720 | 688 | 49 | 抽屉 | 无 | 40px |
| **768** | 768 | 736 | **53** | 抽屉 | 无 | 40px |
| **820** | 820 | 788 | **56** | 抽屉 | 无 | 40px |
| **912** | 912 | 880 | **63** | 抽屉 | 无 | 40px |
| 959 | 959 | 927 | 66 | 抽屉 | 无 | 40px |
| **960** | 718 | 686 | **49** ↓241 | 抽屉 | 常驻 242px | 40px |
| **1024** | 782 | 750 | **54** | 抽屉 | 常驻 | 40px |
| 1219 | 977 | 945 | 68 | 抽屉 | 常驻 | 40px |
| **1220** | 736 | 688 | **49** ↓241 | 常驻 242px | 常驻 | 无 |

三条读法：

1. **719→720 是空断点**：本站该断点不承载任何切换，量到的正文/导航/目录完全一致，不算缺陷。
2. **两次 −241px 断崖**：`959→960`（正文字数 66→49）与 `1219→1220`（68→49）。中间 960–1219 是"半个桌面"——目录已经常驻、导航还锁在抽屉里。
3. **宽度与字号不成正比**：912 竖屏最宽（880px / 63 字），1024 横屏只有 750px / 54 字，1220 又回到 688px / 49 字。每行字数在 49–68 之间跳，中文舒适区大致是 30–45 字。

---

## 3. 缺陷清单（P0 → P3）

### P0 · 功能不可用 / 内容丢失 / 白屏
无。所有档位 `document.documentElement.scrollWidth - innerWidth = 0`（无页面级横向溢出），`brokenImages=0`，`h1` 唯一、标题无跳级，`console/pageerror/4xx` 线上抽查全空。

---

### TBL-02（P1）甘特图片段多时把 236–284px（最多 3 段）藏在横向滚动里且无提示，图上看着时间轴 8 就结束（实际到 11）

**现象**：`/lab/scheduling/` 把算法切「轮转 RR」、时间片填 1（界面完全允许的配置）后，时间轴变成 11 段；图只画到 `P2 7–8`，后面 `P1 8–9`、`P2 9–10`、`P4 10–11` 完全不可见，因为 910px 的内容被塞进 674px 的容器。触摸屏上没有常驻滚动条（`offsetHeight == clientHeight`），也没有渐隐或箭头提示，读者会以为时间轴到 8 就结束了。

**复现**
1. 768 打开 `/lab/scheduling/`（默认 FCFS，4 段，宽度刚好铺满）。
2. 调度算法选「轮转 RR」，时间片填 `1`，点「运行」。
3. 量 `.gantt`：`scrollWidth=910`、`clientWidth=674` → 隐藏 236px；截图右侧在 `P2 7–8` 处被硬切。
4. 把视口拉到 1220：容器反而缩到 626px，隐藏 284px（比 768 更糟）。

**证据**
- `qa/artifacts/tablet/tbl-gantt-rr1-768.png`
- `qa/artifacts/tablet/tbl-gantt-rr1-1220.png`
- `qa/artifacts/tablet/tbl-gantt-fcfs-768.png`（对照组：4 段 288/177/80/121，合计 674，正好铺满无遮挡）

**量化**
| 指标 | 768 | 1024 | 1220 |
|---|---|---|---|
| `.gantt` clientWidth | 674 | 688 | 626 |
| 需要宽度（11 段） | 910 | 910 | 910 |
| 被隐藏 | 236 | 222 | **284** |
| 常驻滚动条 | 无 | 无 | 无 |
| 色块最小宽 / 字号 | 80px / 16.25px | 同 | 同 |

**根因**：`notes.css:102` `.gantt{display:flex;overflow-x:auto;gap:3px;scrollbar-width:thin}` + `notes.css:103` `.gantt-block{flex-basis:0;min-width:4rem}`（4rem = 80px，根字号 20px）。既没有溢出提示，也没有在中等宽度换行；`min-width` 的 80px 让"按时长成比例"的 `flex-grow` 在短片段上失效。

**建议改法**
```css
@media (max-width: 76.234375em) {
  .gantt { flex-wrap: wrap; scrollbar-width: auto; }
  .gantt-block { min-width: 3rem; }
}
```
或保留单行但给 `.gantt` 加右侧渐隐遮罩 + 「← 横向滑动查看更多」提示；并把 `min-width` 降到 2.5rem，让比例关系在短片段上仍然成立。

---

### TBL-01（P2）断点空档正文列宽非单调塌陷：959→960 少 241px、1219→1220 再少 241px，iPad 横屏比竖屏还窄

**现象**：`notes.css` 只在 640px 有一个断点，而 Material 在 960px 加右侧目录、1220px 加左侧导航。结果正文列在 686–945px 之间跳变，单次跳变 −241px；把 iPad 从竖屏转到横屏，正文反而变窄。

**复现**
1. 打开 `/chapters/chapter-2/`，`page.setViewportSize({width:959,height:900})`，读 `.md-content__inner` → 927px。
2. 只把宽度改成 960 → 686px（−241），右侧突然多出 242px 目录。
3. 改成 1219 → 945px（68 汉字/行）；改成 1220 → 688px（−257），左侧再出现 242px 常驻导航 + logo。
4. 竖屏 820 与横屏 1024 对照：inner 788 vs 750；同一张表（co2 第一张）高度 540px vs 679px。

**证据**
- `qa/artifacts/tablet/tbl-content-820-os2.png`（820 竖屏，正文 788px）
- `qa/artifacts/tablet/tbl-ipad-landscape-light-os2.png`（1024 横屏，正文 750px，反而更窄）
- `qa/artifacts/tablet/tbl-content-912-os2.png`（912 竖屏，880px / 63 字，全区间最宽）
- `qa/artifacts/tablet/tbl-ipad-portrait-light-os2.png`（768 竖屏，16px 边距贴边）

**量化**
| 视口 | content | inner | 汉字/行 | 左/右留白 |
|---|---|---|---|---|
| 768 | 768 | 736 | 53 | 16 / 16 |
| 820 | 820 | 788 | 56 | 16 / 16 |
| 912 | 912 | 880 | 63 | 16 / 16 |
| 959 → 960 | 959 → 718 | 927 → 686 | 66 → 49 | 16 / 258 |
| 1024 | 782 | 750 | 54 | 16 / 258 |
| 1219 → 1220 | 977 → 736 | 945 → 688 | 68 → 49 | 266 / 266 |

**根因**：`notes.css:109` / `notes.css:139` 只有 `@media (max-width: 40rem)`（=640px），641–1219px 之间没有任何宽度约束。`notes.css:4` 的 `--sl-content-width: 56rem` 是从 Starlight 站点带过来的残留变量，Material 不读取；`notes.css:147` 的 `.md-grid{max-width:1480px}` 在 ≤1480px 时不生效。正文宽度实际完全由 Material 决定：`.md-content{max-width:61rem}` 加上 12.1rem（242px）的侧栏。

**建议改法**
```css
/* 让正文回到可读行宽，并消掉 1220 处的断崖 */
@media (min-width: 60em) and (max-width: 76.234375em) {
  .md-sidebar--secondary { width: 10rem; }
  .md-content__inner { max-width: 44rem; margin-inline: auto; }
}
.md-content__inner { max-width: 46rem; margin-inline: auto; }  /* 行宽上限约 45 汉字 */
```
并把正文宽度改写成 Material 认的 `.md-content{max-width:…}`，不要依赖 `--sl-content-width`。

---

### TBL-03（P2）表格列被 Material 的 `th{min-width:5rem}` 钉在 100px，1024px 下出现 5 处中文末行单字

**现象**：中文表格在空档里被压成 100–141px 的窄列，`「4 非数值数据的编码」` 折成两行、末行只剩 `码`；`notes.css` 想覆盖的 `display`/字号也被 Material 更高特异性的规则压掉。

**复现**
1. 768 打开 `/computer-organization/chapter-2/`，滚到「复习导航：大纲要求与笔记位置」表。
2. 首列 139px：`4 非数值数据的编 / 码`、`5 数据的宽度和存 / 储` 末行各剩 1 个汉字。
3. 同表在 820 / 912 / 1219 无孤字（列宽 145–160px），在 1024 反而有 **5 处**、960 有 2 处。
4. 看计算值：`table` 的 `display=inline-block`、`font-size=12.8px` —— `notes.css:55` 写的 `display:table` 与 `.9em` 都没有生效。

**证据**
- `qa/artifacts/tablet/tbl-table-co2-768.png`
- `qa/artifacts/tablet/tbl-table-co2-1024.png`（5 处孤字最集中）
- `qa/artifacts/tablet/tbl-table-co2-1219.png`（同表正常，无孤字）

**量化**
| 指标 | 768 | 820/912/1219 | 960 | 1024 | 1220 |
|---|---|---|---|---|---|
| 该表列宽 | 139… | 145 / 160 / 100 / 378 | 133 / 145 / 100 / 306 | 141 / 155 / 100 / 352 | 134 / 145 / 100 / 307 |
| 表格高度 | 679 | **540** | 748 | 679 | 748 |
| 末行单字单元格 | 3 | **0** | 2 | **5** | 2 |

补充：表格字号 **12.8px**（正文 16px）；单元格横向 padding 34px；`os3` 有一张 7 列表格恒定 702px 宽，960px 下比正文列宽 16px（由 Material 的 `.md-typeset__scrollwrap` 吸收为表格内部滚动）。

**根因**：Material 的 `.md-typeset table:not([class])`（特异性 0,2,1）给出 `display:inline-block; max-width:100%; overflow:auto; font-size:.64rem`，以及 `th{min-width:5rem}`（5×20px = **100px**）。`notes.css:55` 的 `.md-typeset table{display:table;width:100%;font-size:.9em}` 与 `notes.css:111` 的 `display:block;overflow-x:auto` 特异性都是 0,1,1，**全部被覆盖**；`notes.css:57` 只成功改掉了 padding。

**建议改法**
```css
.md-typeset table:not([class]) { font-size: .9em; }          /* 提到同特异性 */
.md-typeset table:not([class]) th { min-width: 7rem; }
.md-typeset table:not([class]) td { min-width: 5rem; }
@media (max-width: 76.234375em) {
  .md-typeset__scrollwrap { overflow-x: auto; }               /* 宁横向滚动，不把列压到 100px */
}
```

---

### TBL-04（P2）h1 32px 与 h2 31px 几乎同字号，章节页标题层级塌陷

**现象**：章节页的 `h1`（第 2 章 进程管理）32px，`h2`（复习导航）31px，比值 1.03 —— 视觉上同级，扫读时无法靠字号区分章节结构与小节。

**复现**
1. 打开任意章节页，量 `h1` / `h2` / `h3` 的 computed font-size。
2. 查看构建产物 `chapters/chapter-2/index.html`：`h1` 是 `<h1 id="2">`，不是 `notes.css:49` 假设的 `#_top`。
3. 768 / 1024 / 1220 三档一致，线上 1024 复测同样 32 / 31。

**证据**
- `qa/artifacts/tablet/tbl-ipad-portrait-light-os2.png`（h1 与「复习导航」同号）
- `qa/artifacts/tablet/tbl-ipad-landscape-light-co2.png`

**量化**：`h1 32px` / `h2 31px` / `h3 24px` / 正文 16px；比值 h1:h2 = **1.03**；首页 `h2` 反而只有 25px（不属 `.chapter-prose`）。

**根因**：`notes.css:49` 的 `h1#_top{font-size:clamp(1.85rem,3vw,2.65rem)}` **永不命中**（构建出的 h1 id 是章节序号），h1 落到 Material 默认 `2em = 32px`；`notes.css:123` 又用 `.md-typeset.chapter-prose h2{font-size:1.55rem}`（1.55×20 = 31px）把 h2 顶到与 h1 齐平。

**建议改法**
```css
.md-typeset h1 { font-size: clamp(1.85rem, 3vw, 2.65rem); }
.md-typeset.chapter-prose h2 { font-size: 1.3rem; }   /* 26px，h1:h2:h3 ≈ 1.6:1.3:1.1 */
```

---

### TBL-05（P2）首页主 CTA 触控目标只有 84×17px，站点自己定义的 `.primary-link`（46px）只用在实验页

**现象**：首页两张课程卡里的「进入课程 →」实测 **84×17px**，「进入进程调度实验 →」148×17px。站点 `notes.css:82` 已经定义了 `.primary-link{min-height:46px}`，但全站 15 个 HTML 里只有 `/lab/scheduling/` 一处用到。

**复现**
1. 768 打开 `/`，量 `.grid.cards` 内链接的盒模型。
2. 对照 `/lab/scheduling/` 的「运行」按钮（`.primary-link`，46px 高）。
3. 触屏上点 17px 高的文字链接，命中率明显低于按钮。

**证据**：`qa/artifacts/tablet/tbl-home-cta-768.png`

**量化**：`84×17` / `148×17` / 章节列表链接 `126–174×17`；`.primary-link` 最小高 46px；WCAG 2.5.8 AA 要求 24×24，Apple HIG 建议 44×44。

**根因**：`站点/docs/index.md` 的 CTA 是普通 markdown 链接，没有挂 `{.primary-link}`（`mkdocs.yml` 已启用 `attr_list`）；`notes.css:82` 的类没有任何全局兜底（如 `.grid.cards a`）。

**建议改法**：给首页三处 CTA 加 `{.primary-link}`；或补
```css
.grid.cards a { display: inline-flex; align-items: center; min-height: 44px; }
```

---

### TBL-06（P3）rem 当 px 写：根字号 20px 让「小字」比正文还大，工具条 17.5px > 正文 16px

**现象**：`html` 根字号是 20px（Material `font-size:125%`），`notes.css` 里按 16px 换算的 rem 全部放大 1.25 倍：工具条说明 17.5px、状态文字 16px、图片角标 15px、甘特色块 16.25px —— 全部 ≥ 或接近正文 16px。

**复现**：768 打开章节页，量 `.study-toolbar` / `.save-status` / `.zoom-hint` / `.gantt-block` 的 font-size；截图里「本章已复习」明显比正文大一号；线上 1024 复测工具条同为 17.5px。

**证据**：`qa/artifacts/tablet/tbl-toolbar-768.png`、`qa/artifacts/tablet/tbl-gantt-fcfs-768.png`

**量化**：root 20px；toolbar **17.5**、save-status **16**、zoom-hint **15**、gantt-block **16.25**、正文 16、表格 12.8；作者意图应为 14 / 12.8 / 12 / 13。

**根因**：`notes.css:61`（`.875rem`）、`notes.css:68`（`.8rem`）、`notes.css:76`（`.75rem`）、`notes.css:103`（`.8125rem`）都按 16px 根字号写 rem。

**建议改法**：辅助字号改用 `em`（相对正文 16px）或直接写 px；或引入 `--note-fs-sm: 14px` 之类的 token 统一替换。

---

### TBL-07（P3）960–1219px 空档内左导航仍是抽屉、右侧目录常驻，布局左右失衡（左 16px / 右 258px）

**现象**：1024 横屏时右下有 242px 常驻目录，左侧却只有 16px 留白，主导航仍锁在 40×40 汉堡里 —— 目录已经"桌面化"，导航还是"手机化"。

**复现**
1. 1024 打开章节页，量 `.md-content__inner` 的左右留白：**左 16 / 右 258**。
2. 同一屏：左侧无任何导航；右侧目录 28 个链接，可视高度 641px 而内容高 944px，需要内部滚动。
3. 拉到 1220：左右对称 266 / 266，左导航出现。

**证据**：`qa/artifacts/tablet/tbl-ipad-landscape-light-os2.png`、`qa/artifacts/tablet/tbl-toc-1024.png`、`qa/artifacts/tablet/tbl-toc-sticky-1024.png`

**量化**：gutter 左/右 = 16/258（960–1219）vs 266/266（1220）；TOC 宽 242px；28 个目录链接；可视高度 641px / 内容 944px（目录本身可滚、滚动时保持 sticky，已核实不是缺陷）。

**根因**：Material 在 60em（960px）起显示 `.md-sidebar--secondary`，而 `.md-sidebar--primary` 要到 76.25em（1220px）才常驻；`notes.css` 该区间没有任何补偿（只有 640px 断点）。

**建议改法**：与 TBL-01 同一段媒体查询一起做 —— 正文居中 + 目录收窄（`width:10rem`），左右留白回到对称。

---

### TBL-08（P3 · taste）深色主题下 8 张插图仍是 736×400 纯白卡片（占视口 96%），夜间阅读出现整屏白块

**现象**：深色下 `.figure-zoom` 计算背景是 `rgb(255,255,255)`，736×400，占 768 视口宽的 96%；放大对话框背景是 `rgb(24,25,29)`，但里面的 `img` 仍白底。整块白在 `#18191d` 页面上非常跳。

**复现**：768 点月亮切深色 → 打开 `/chapters/chapter-1/` → 滚到第一张插图 → 读 `.figure-zoom` 的 `backgroundColor`；点图放大看 `.image-dialog img` 背景。

**证据**：`qa/artifacts/tablet/tbl-figure-zoom-dark-768.png`、`qa/artifacts/tablet/tbl-image-dialog-dark-768.png`

**量化**：8 处；`bg rgb(255,255,255)`；盒 736×400（96% 视口）；页面底 `rgb(24,25,29)`；对话框 722px、`img` 白底。

**根因**：`notes.css:74` `.figure-zoom{background:white}`、`notes.css:79` `.image-dialog img{background:white}` 硬编码白色，没有 `[data-md-color-scheme="slate"]` 分支。

**建议改法**：深色下容器改 `var(--note-surface)`、边框 `var(--note-border)`，白底只留给 `img` 本身并加 8px 圆角。图片本身是白底 SVG，无法纯靠 CSS 消除，但可以把容器留白和边框压到最小 —— 属取舍项，故标 `taste`。

---

### TBL-09（P3 · upstream）768 打开抽屉后旋转到 1024，抽屉保持打开并把正文盖住、遮罩覆盖全屏

**现象**：768 竖屏点汉堡打开抽屉后不关闭，直接切到 1024×768：抽屉仍然打开（242px 盖住正文，h1 被压住），`label.md-overlay` 铺满全屏且 `pointer-events:auto`，`elementFromPoint(512,384)` 命中的是遮罩 —— 此时点正文区域等于点遮罩。**恢复只需再点一次遮罩，不需要刷新**；768→1024→1220→768 反复切换也未出现"刷新才恢复"的状态。

**复现**
1. 768 点汉堡 → `#__drawer` 勾选，overlay `opacity 1`。
2. `setViewportSize({width:1024,height:768})`，等 900ms。
3. 读状态：`drawerChecked=true`、`overlay.opacity=1`、`overlay.width=1024`、`sidebarLeft=0`、中心命中 `label.md-overlay`。

**证据**：`qa/artifacts/tablet/tbl-drawer-open-768.png`、`qa/artifacts/tablet/tbl-drawer-rotate-1024.png`、`qa/artifacts/tablet/tbl-drawer-back-768.png`（回到 768 仍是打开态）、`qa/artifacts/tablet/tbl-drawer-1220.png`（1220 无遮罩残留）

**量化**：overlay 1024×768、`opacity 1`、`pointer-events auto`；1220 时遮罩不再拦截（中心命中 `blockquote`），视觉无残留；`refreshNeeded=false`。

**根因**：Material 抽屉由 `#__drawer` checkbox 驱动，断点切换不会重置 checkbox（上游默认）；`interactions.js` 未监听 `matchMedia`。

**建议改法**（可选）：监听 `matchMedia('(min-width:60em)')` 的 `change`，回调里把 `#__drawer` 置为未勾选。若接受上游默认行为，建议在交互说明里不承诺"旋转自动收起"。

---

### TBL-10（P2 · upstream）平板触控目标：右侧目录链接只有 18–36px 高（19 个低于 24px）、页头三按钮 40×40、permalink ¶ 仅 17px 宽

**现象**：1024 横屏下右侧目录是唯一的页内导航，但 28 个目录链接里有 **19 个只有 18px 高**（低于 WCAG 2.5.8 AA 的 24×24），全部 28 个都低于 44px 推荐值；页头三个图标按钮 40×40，`.md-top` 40px 高，标题旁的 permalink ¶ 只有 17px 宽。站点自有控件反而全部达标。

**复现**
1. 1024 打开章节页，量 `.md-sidebar--secondary a.md-nav__link`：28 个链接，高 18px（19 个）/ 36px（9 个）。
2. 768（`hasTouch:true`）量页头：汉堡、主题、搜索三个 label 都是 **40×40**；`.md-top` 144×40；`a.headerlink` 17×42 / 17×48。
3. 对照 `/chapters/chapter-2/` 的站点自有控件：工具条 label 129×44 / 124×44、习题摘要 678×59、页脚翻页 257×81。

**证据**：`qa/artifacts/tablet/tbl-toc-1024.png`、`qa/artifacts/tablet/tbl-header-768.png`、`qa/artifacts/tablet/tbl-header-1024.png`

**量化**
| 目标 | 实测 | 标准 |
|---|---|---|
| 目录链接（28 个） | 高 18px ×19、36px ×9 | WCAG 2.5.8 AA 24×24 → **19 个不达标** |
| 页头汉堡 / 主题 / 搜索 | 40×40 | HIG 44×44（差 4px） |
| 回到页面顶部 | 144×40 | 44×44 |
| 标题 permalink ¶ | 17×42 / 17×48 | 24×24 → 宽不达标 |
| 代码复制按钮 | 24×24 | 刚好等于 AA 下限 |
| 站点自有：工具条 label / 习题摘要 / 页脚 | 129×44 / 678×59 / 257×81 | 达标 |

**根因**：Material 的 `.md-nav__link`（行高 18px）、`.md-header__button`（40×40）、`.md-code__button`（24×24）、`.headerlink` 默认尺寸（上游）；`notes.css` 只给自有控件（`.study-toolbar label`、`.exercise-answer summary`、`.primary-link`、`.lab-buttons`）设了 44–48px，没管目录与页头。

**建议改法**
```css
@media (hover: none) {
  .md-nav--secondary .md-nav__link { display: flex; align-items: center; min-height: 32px; }
  .md-header__button { padding: .6rem; }
  .md-header__inner { min-height: 52px; }
  .md-top { height: 44px; }
  .headerlink { display: none; }        /* 或用 padding 放大到 44px */
}
```

---

### TBL-11（P3 · upstream）浅色主题下 3 处文字对比度 4.42–4.49:1 略低于 4.5（深色主题 0 违规）

**现象**：浅色下 `.md-nav__title`（「操作系统概论」/「目录」）16px、`rgba(0,0,0,.54)` on `#ededed` → **4.42:1**；搜索提示 `.md-search-result__meta` 13px 同色 → 4.42:1；搜索框 placeholder 18px → **4.49:1**（背景 `#f3f4f6`）。深色主题全量扫描 0 违规。

**复现**：浅色下扫 `.md-content * / .md-header * / .md-nav * / footer *` 的对比度（含 placeholder）；再切深色跑同一段。

**证据**：`qa/artifacts/tablet/tbl-toc-1024.png`、`qa/artifacts/tablet/tbl-ipad-portrait-light-os2.png`

**量化**：light 违规 **3 处**（4.42 / 4.42 / 4.49，需 4.5）；dark 违规 **0 处**；其余正文/表格/代码/目录条目均达标。

**根因**：Material `--md-default-fg-color--light: rgba(0,0,0,.54)`；`notes.css:36` 只覆盖了 `--note-muted`（#555e70），没动这个变量。

**建议改法**：`[data-md-color-scheme="default"]{ --md-default-fg-color--light: rgba(0,0,0,.66) }`

---

## 4. 核实后判定"不算缺陷"的观察

| 观察 | 判定 |
|---|---|
| 719/720 断点来回切换 | 本站该断点不承载布局切换，正文/导航/目录完全一致，非缺陷 |
| 959/960、1219/1220 反复切换后状态错乱 | `resizeLadder` 两轮循环（1219→1220→1219、960→720）均能回到正确状态，**未出现需要刷新才恢复** |
| 页面级横向溢出 | 7 个档位 × 4 页 × light/dark 全部 `docOverflow = 0` |
| 目录在 1024×768 只有 641px 可视 | 目录自身可滚（`overflow-y:auto`，944→641），滚动时 sticky 正常（`sidebarTop 49`），非缺陷（对照 `qa/artifacts/tablet/tbl-toc-1024x768-scrolled.png`） |
| 表格横向滚动 | Material 的 `.md-typeset__scrollwrap` 兜底存在，表格不会撑破页面 |
| 搜索结果面板 | 960/1024/1219/1220 下点击搜索图标并输入均未触发结果面板（`#__search` 未勾选、`output opacity 0`），只量到隐藏面板 468px 宽、右缘超出视口 230px（1220 下 450px）。**无法确认真实结果是否被裁，故不计入缺陷**（见缺口） |
| hover-only 交互 | 未发现。Material 的 `(hover:none),(pointer:coarse)` 分支正常，`.figure-zoom` 的「点击放大」提示常驻显示 |
| 图片加载 | `brokenImages = 0`（已 `warm()` 触发 lazy） |

---

## 5. 缺口

1. **搜索结果面板未复现**：Material 的内联搜索在 960–1220 下点击/输入均未打开结果列表（`#__search` 未勾选、`output opacity 0`），只量到隐藏面板 468px 宽、右缘超出视口 230px（1220 下 450px，见 `qa/artifacts/tablet/tbl-search-960.png`、`tbl-search-1024.png`、`tbl-search-1219.png`、`tbl-search-1220.png`）。若真实使用时被父级 `overflow:hidden` 裁掉，会变成"搜索只能看到半截结果"的 P1/P2 —— 需在真实浏览器手工点一次确认。
2. **真机未测**：全部为桌面 Chromium 模拟（`hasTouch/isMobile` 已设置），iPadOS Safari 的滚动条、`100dvh`、橡皮筋行为未验证；`.gantt` 的横向滑动在真机上的可发现性可能比 headless 稍好。
3. **阅读字号档位（16/18/20px）** 只按默认 16px 测；选 20px 时 768 下行宽降到约 37 汉字（更接近舒适区），表格与甘特的挤压程度未复测。
4. **打印/PDF 与键盘 Tab 顺序**不在本次 tablet 范围（`notes.css:121` 有 print 分支，未验证）。
5. 线上只抽查了 `/chapters/chapter-2/` @1024，未全站对照；该页与本地逐项一致（正文 750px、h1 32、h2 31、工具条 17.5、目录常驻）。

---

## 6. 建议修复顺序

1. **TBL-02 甘特图**（P1）：一个 `@media` + 两个属性，直接消除"图看着 8、实际 11"的误导。
2. **TBL-01 + TBL-07**（P2）：同一段 `@media (min-width:60em) and (max-width:76.234375em)` 一起解决正文列跳崖与左右失衡，这是平板体验的主线。
3. **TBL-03 表格**（P2）：提高选择器特异性即可，顺带修掉 5 处中文孤字。
4. **TBL-04 / TBL-05**（P2）：h1 选择器改名一行、首页 CTA 加 class，成本极低。
5. **TBL-10**（P2 upstream）：一个 `@media (hover:none)` 把目录行高抬到 32px、页头按钮补到 44px，这是横屏平板唯一的页内导航。
6. **TBL-06 / TBL-08 / TBL-11**（P3）：字号 token、深色插图容器、对比度变量，可合并成一次"设计 token 收口"。
7. **TBL-09**（P3 upstream）：可接受上游行为，或用 6 行脚本在断点切换时收起抽屉。
