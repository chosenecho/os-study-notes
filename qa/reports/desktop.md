# 桌面端 / 深色主题 / 键盘与无障碍审计报告

- 成员：**qa-desktop**　被测：`http://127.0.0.1:8123`（对照线上 `https://studynote.chosenecho.dpdns.org` 抽查）
- 档位：1280×800、1366×768、1440×900、1920×1080，每档 light + dark（深色经 `label[for="__palette_1"]` 手动切换，站点不跟随系统偏好，见 DSK-11）
- 页面：`/`、`/chapters/chapter-2/`、`/lab/scheduling/`；另对 chapter-2 做键盘/语义深挖
- 结论：共 13 条 —— **P0 0 / P1 0 / P2 6 / P3 7**。无 P1：主要流程可用，缺陷集中在深色一致性与排版层级。

## 档位实测矩阵（light）

| 档位 | 根字号 | 内容列宽 | 每行字数 | h1 | h2 | 表格单元 | 工具条 |
|---|---|---|---|---|---|---|---|
| desktop-1280 | 20px | 796px | 53 | 32px | 31px | 12.8px | 17.5px |
| desktop-1366 | 20px | 882px | 60 | 32px | 31px | 12.8px | 17.5px |
| desktop-1440 | 20px | 956px | 65 | 32px | 31px | 12.8px | 17.5px |
| desktop-1920 | 22px | 948px | 64 | 32px | 34.1px | 14.08px | 19.25px |

---

## P2（6 条）

### DSK-02 深色主题下每张插图都套着纯白容器（17.56:1 的亮块）

- **严重度**：P2　**scope**：site　**类别**：interaction　**设备/主题**：desktop-1440（1280/1366/1920 同）；深色主题
- **现象**：插图按钮 .figure-zoom 计算样式 background: rgb(255,255,255)，页面背景 rgb(24,25,29)，表面/背景对比度 17.56:1；章内 4/4 张插图全部如此，单张白块面积 326454–457504 px²。叠加的 .zoom-hint 也是硬编码 rgb(241,244,250)
- **复现**：1) 打开 /chapters/chapter-2/　2) 点右上角月亮图标 label[for="__palette_1"] 进入深色　3) 滚动到任一插图（进程三态图）
- **期望**：插图画框与外层深色卡片保持同一表面体系，只在图片内容区域保留白底
- **量化**：figureZoomBgDark=rgb(255, 255, 255)；pageBgDark=rgb(24, 25, 29)；surfaceVsBackdrop=17.56；figuresPerChapter=4；figuresWithWhiteBg=4；whiteAreasPx2=[457504, 378877, 335180, 326454]；zoomHintBg=rgb(241, 244, 250)（两种主题相同）；zoomHintVsFrame=1.1；lightThemeSurfaceVsBackdrop=1
- **根因**：notes.css:74 `.figure-zoom{...background:white}`；notes.css:76 `.zoom-hint{background:#f1f4fa;color:#4c586f}`
- **建议**：容器改用 var(--note-surface) 并在深色下加 1px 边框；白底图片用一个内层 <img> 保留白底（或深色下给图片容器 background:#fff 但容器本身跟随主题）；.zoom-hint 改用 accent/muted token。
- **证据**：`qa/artifacts/desktop/figure-dark-1440.png`、`qa/artifacts/desktop/figure-el-dark.png`、`qa/artifacts/desktop/figure-light-1440.png`　被测 URL：http://127.0.0.1:8123/chapters/chapter-2/

### DSK-03 章节标题间距被清零：16 个 h2 中 15 个与前文只隔 14–16px，且无分隔线

- **严重度**：P2　**scope**：site　**类别**：typography　**设备/主题**：desktop-1280 / 1366 / 1440 / 1920（light+dark 同）
- **现象**：h2 计算样式 margin-top:0、padding-top:0、border-top-width:0（被后面同选择器覆盖）；实测与前一段落视觉间距 14–16px，h3 最小 0px（h3 紧跟 h2 时）。31px 的大标题前只有 16px 空隙，页面 20823px 高、16 个 h2 全部受影响
- **复现**：1) 打开 /chapters/chapter-2/　2) 观察 h2「1 顺序执行与并发执行（1.1、1.2）」与上方段落的间距　3) 对比 notes.css:53 声明的 margin-top:2.8rem + border-top:1px
- **期望**：notes.css:53 的设计是 h2 前 2.8rem（56px）留白 + 1px 分隔线，形成章节分块
- **量化**：h2Count=16；h2GapPx=[14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 30]；h2GapLe16px=15；h2MarginTop=0px；h2PaddingTop=0px；h2BorderTopWidth=0px；h2FontSizePx=31；h3MarginTop=0px；h3MinGapPx=0；pageHeightPx=20823
- **根因**：notes.css:123 `.md-typeset.chapter-prose h2{font-size:1.55rem;margin:0;padding:0;border:0}` 与 notes.css:124 h3{margin:0}，覆盖 notes.css:53/54
- **建议**：删掉 notes.css:123-124 的 margin/padding/border 归零（或改成只保留 font-size），让 53/54 行的 2.8rem/2rem 与 1px 分隔线生效；h3 用 margin-top:2rem、h2 用 2.8rem。
- **证据**：`qa/artifacts/desktop/h2-spacing-dark.png`　被测 URL：http://127.0.0.1:8123/chapters/chapter-2/

### DSK-04 根字号 20px 下 .875rem=17.5px：工具条等辅助文字比正文 16px 还大

- **严重度**：P2　**scope**：site　**类别**：typography　**设备/主题**：desktop-1280 / 1366 / 1440（root 20px）、desktop-1920（root 22px）
- **现象**：.study-toolbar 17.5px（1920 档 19.25px）vs 正文 16px，相对正文 +9.4%（1920 +20.3%）；同类还有 .lab-controls label 17.5px、.image-dialog p 17.5px、.save-status 16px。根字号来自 Material html{font-size:125%}（1920 档 137.5%），而 notes.css 把 rem 当 px 写
- **复现**：1) 打开 /chapters/chapter-2/　2) 量「本章已复习 / 字号」工具条字号与正文段落字号　3) 对比 1920 档
- **期望**：辅助 UI 文字应小于或等于正文（阅读层级：标题 > 正文 > 辅助）
- **量化**：rootFontSizePx={d1280:20, d1366:20, d1440:20, d1920:22}；bodyParagraphPx=16；studyToolbarPx={d1280:17.5, d1366:17.5, d1440:17.5, d1920:19.25}；deltaVsBodyPct={d1440:9.4, d1920:20.3}；labControlsLabelPx=17.5；dialogCaptionPx=17.5；saveStatusPx=16；remExamplesPx={0.8rem:16, 0.875rem:17.5, 0.75rem:15, 1.55rem:31}
- **根因**：notes.css:61（.study-toolbar font-size:.875rem）、notes.css:92（.lab-controls label .875rem）、notes.css:80（.image-dialog p .875rem）、notes.css:68（.save-status .8rem）
- **建议**：把这些辅助字号改成 px（13–14px）或相对正文的 em；若坚持 rem，则同时把 html 根字号锁成 16px 并重算全部 rem 值。
- **证据**：`qa/artifacts/desktop/toolbar-dark-1440.png`、`qa/artifacts/desktop/lab-dark-1440.png`　被测 URL：http://127.0.0.1:8123/chapters/chapter-2/

### DSK-05 h1 的选择器永远不命中，1920 档 h2 反比 h1 大 6.6%

- **严重度**：P2　**scope**：site　**类别**：typography　**设备/主题**：desktop-1280 / 1366 / 1440 / 1920
- **现象**：章节页 h1 为 `<h1 id="2">`、首页为 `<h1 id="_1">`，`h1#_top` 匹配数 0，声明从未生效；h1 落到 Material 默认 2em=32px（四档宽度都是 32px）。h2 被 notes.css:123 定为 1.55rem → 1440 档 31px（h1 32px，几乎同号），1920 档 34.1px，**大于 h1 的 32px**
- **复现**：1) 打开 /chapters/chapter-2/ 与首页 /　2) 检查 h1 的 id 与 notes.css:49 的 `h1#_top` 是否匹配　3) 量 h1 与 h2 的计算字号
- **期望**：页面主标题字号最大：notes.css:49 声明 clamp(1.85rem, 3vw, 2.65rem)，在 1280–1920 应得 37–53px
- **量化**：h1SelectorMatches=0；h1IdChapter=2；h1IdHome=_1；h1FontSizePx=32；h2FontSizePx={d1280:31, d1366:31, d1440:31, d1920:34.1}；h2OverH1PctAt1920=6.6；h1OverH2PctAt1440=3.2；declaredClamp=clamp(1.85rem, 3vw, 2.65rem) → 37px–53px；rootFontSizePxAt1920=22
- **根因**：notes.css:49 `h1#_top{font-size:clamp(...)}` 与真实 DOM `h1#[页面slug]` 不匹配
- **建议**：改成 `.md-typeset h1` 或 `#_top, .md-typeset h1`（并保留 !important 之外的最低特异性）；同时把 h2 的 1.55rem 降到 ≤1.4rem，保证 h1 > h2。
- **证据**：`qa/artifacts/desktop/table-1920.png`、`qa/artifacts/desktop/home-light-1440.png`　被测 URL：http://127.0.0.1:8123/chapters/chapter-2/

### DSK-06 浅色主题搜索框占位文字与放大镜几乎不可见（1.07:1 / 1.10:1）

- **严重度**：P2　**scope**：site　**类别**：a11y　**设备/主题**：desktop-1280 / 1366 / 1440 / 1920；浅色主题（深色正常）
- **现象**：placeholder 计算色 rgba(255,255,255,0.7)（Material 的深色页头前景），而 .md-search__form 背景被改成 rgb(243,244,246) → 混合后 1.07:1（Lead 独立量得 1.06:1）；放大镜 svg fill rgb(255,255,255) 对同一背景 1.10:1。深色主题同一元素在 rgb(36,37,43) 上为 8.19:1 / 15.28:1，完全正常
- **复现**：1) 打开首页 /（浅色主题）　2) 看右上角搜索框：placeholder「搜索」与放大镜　3) 切到深色对比
- **期望**：占位文字对比度 ≥4.5:1（WCAG 1.4.3），至少肉眼可辨
- **量化**：placeholderColor=rgba(255, 255, 255, 0.7)；formBgLight=rgb(243, 244, 246)；placeholderRatioLight=1.07；iconFillLight=rgb(255, 255, 255)；iconRatioLight=1.1；formBgDark=rgb(36, 37, 43)；placeholderRatioDark=8.19；iconRatioDark=15.28；inputTextColorLight=rgb(36, 40, 51)；requiredRatio=4.5
- **根因**：notes.css:164 `.md-search__form{background:var(--note-muted-surface)}` 只换了底色，未覆盖 Material 的 `--md-primary-bg-color`（页头前景色）→ placeholder/图标仍是白色
- **建议**：在同一处补 `.md-search__input::placeholder{color:var(--note-muted)}` 和 `.md-search__form .md-search__icon{color:var(--note-muted);fill:currentColor}`，或直接覆盖 --md-primary-bg-color: var(--note-text)。
- **证据**：`qa/artifacts/desktop/search-idle-light.png`、`qa/artifacts/desktop/search-idle-dark.png`、`qa/artifacts/desktop/home-light-1440.png`　被测 URL：http://127.0.0.1:8123/

### DSK-07 搜索关闭时 Tab 序列里有一个不可见停靠点（688×0，焦点环被裁 458px）

- **严重度**：P2　**scope**：upstream　**类别**：a11y　**设备/主题**：desktop-1440（其它宽度同）
- **现象**：第 5 站是 div.md-search__scrollwrap（tabindex="0"），尺寸 688×0，父级 .md-search__output overflow:hidden 且高度 0，焦点环按几何算被裁掉 458px。键盘用户在此处"消失"，必须再按一次 Tab 才能继续
- **复现**：1) 打开任意章节页，焦点放到页面开头　2) 连按 5 次 Tab　3) 观察第 5 站：文档无任何视觉变化
- **期望**：每一次 Tab 都应落到可见控件上并有可见焦点指示（WCAG 2.4.7）
- **量化**：tabStopIndex=5；element=div.md-search__scrollwrap；tabindex=0；rect=688x0；ancestorOverflow=.md-search__output overflow:hidden；clippedPx=458；visibleFocusIndicator=false
- **根因**：Material 搜索面板把结果滚动容器设为 tabindex="0"，收起态高度 0（bundle.d7400e89.min.js + main.*.min.css）；站点未做修正
- **建议**：收起态给 `.md-search__scrollwrap{visibility:hidden}` 或在该状态下移除 tabindex（JS 切换 open 状态时同步），或用 `:focus-visible` 兜底给父级 outline。
- **证据**：`qa/artifacts/desktop/focus-searchwrap.png`　被测 URL：http://127.0.0.1:8123/chapters/chapter-2/

## P3（7 条）

### DSK-01 搜索检索由 keyup 驱动：insertText / 部分 IME 提交路径不会即时触发检索（自动化输入陷阱，非站点缺陷）

- **严重度**：P3　**scope**：upstream　**类别**：interaction　**设备/主题**：desktop-1440（4 档同）
- **现象**：仅 insertText：结果 0 条、文案停在「键入以开始搜索」、面板 36px；补一次 keyup 后：8 条结果、面板 675px；直接访问 /?q=进程调度：8 条结果、输入框回填「进程调度」。说明中文搜索**可用**，索引与 lunr.zh 分词均正常；先前把「中文搜不到」判为站点缺陷是自动化输入方式造成的假阳性
- **复现**：1) 打开 /chapters/chapter-2/，点击搜索框　2) 用 CDP insertText 一次写入「进程调度」（等价于 IME 一次提交，不含逐字 keyup）并等 3 秒　3) 补按一次空格（产生 keyup）再看结果；另直接访问 /?q=进程调度
- **期望**：中文查询应正常返回结果；检索不应依赖某一个键盘事件类型
- **量化**：insertTextOnlyItems=0；insertTextOnlyPanelPx=36；insertTextOnlyMeta=键入以开始搜索；afterOneKeyupItems=8；afterOneKeyupPanelPx=675；afterOneKeyupMeta=8 个符合条件的结果；directQueryUrlItems=8；queryInputValue=进程调度；searchIndexJsonBytes=437774；realImeNote=真实中文输入法提交后通常仍会有 keyup（或至少一次按键），因此真实用户路径正常
- **根因**：Material 9.7.7 搜索以 keyup 事件驱动（bundle.d7400e89.min.js）；Playwright 的 keyboard.type 对非 ASCII 走 CDP Input.insertText，不产生 keyup
- **建议**：站点无需修改。若要让检索更稳，可在输入框上再监听 compositionend/input 做一次防抖检索（Material 上游行为，非必须）；QA 侧中文检索应改用 keyboard.type 后补一次按键，或用 /?q= 直达 URL 验证。
- **证据**：`qa/artifacts/desktop/verify-search.json`、`qa/artifacts/desktop/search-light.png`　被测 URL：http://127.0.0.1:8123/chapters/chapter-2/ 与 http://127.0.0.1:8123/?q=进程调度

### DSK-08 深色主题放大弹窗仍给图片铺纯白底（1312×481 白块）

- **严重度**：P3　**scope**：site　**类别**：interaction　**设备/主题**：desktop-1440；深色主题；点击插图后
- **现象**：dialog 背景 rgb(24,25,29)，其中 img 计算背景 rgb(255,255,255)，尺寸 1312×481，与弹窗主体对比 17.56:1；弹窗宽 1354、高 643。弹窗 aria-label「插图预览」、Esc 关闭与焦点回位均正常
- **复现**：1) 深色主题下点击第一张插图（label[for="__palette_1"] 切深色）　2) 弹窗打开后观察图片区域
- **期望**：弹窗主体与图片容器共用深色表面，只有图片内容自身是白底
- **量化**：dialogBg=rgb(24, 25, 29)；imgBg=rgb(255, 255, 255)；imgRect=1312x481；dialogRect=1354x643；imgVsDialogRatio=17.56；dialogFontSizePx=17.5；escapeCloses=true；focusReturnsToTrigger=true；ariaLabel=插图预览
- **根因**：notes.css:79 `.image-dialog img{...;background:white}`
- **建议**：去掉 img 的 background:white，改成 var(--note-surface) 或 transparent；图片自身白底由图源决定。
- **证据**：`qa/artifacts/desktop/dialog-dark.png`　被测 URL：http://127.0.0.1:8123/chapters/chapter-2/

### DSK-09 notes.css:55 的表格字号/display 声明被 Material 覆盖，表格文字只有正文的 80%

- **严重度**：P3　**scope**：upstream　**类别**：typography　**设备/主题**：desktop-1280 / 1366 / 1440 / 1920
- **现象**：实际 th/td 字号 12.8px（≤1440）/14.08px（1920），即 Material `.md-typeset table:not([class])` 的 .64rem；display 也是 inline-block 而非声明的 table。表头行与表体仅靠 650 字重区分：表头背景 rgb(243,244,246) 对页面 rgb(255,255,255) 亮度比 1.10:1（深色 1.15:1），几乎没有底色差
- **复现**：1) 打开 /chapters/chapter-2/ 或 /lab/scheduling/　2) 量表格 th/td 字号并对照 notes.css:55 的 .9em
- **期望**：notes.css:55 声明 `.md-typeset table{font-size:.9em}` → 正文 16px × .9 = 14.4px，且 display:table
- **量化**：tableCellFontPx={d1440:12.8, d1920:14.08}；declaredFontPx=14.4；bodyParagraphPx=16；ratioToBodyPct={d1440:80, d1920:88}；tableDisplay=inline-block；declaredDisplay=table；tableCount=17；thBgLight=rgb(243, 244, 246)；thVsPageRatioLight=1.1；thVsPageRatioDark=1.15
- **根因**：notes.css:55（选择器 `.md-typeset table` 特异性 0,1,1 < Material `.md-typeset table:not([class])` 0,2,1）
- **建议**：把选择器写成 `.md-typeset table:not([class])` 或加 `.md-typeset .chapter-prose table` 提高特异性；表头再用更深一档的 muted surface 或加 1px 下边线。
- **证据**：`qa/artifacts/desktop/table-1920.png`、`qa/artifacts/desktop/lab-light-1440.png`　被测 URL：http://127.0.0.1:8123/chapters/chapter-2/

### DSK-10 深色主题下甘特图色块仍是浅色硬编码（对卡片 12.25:1）

- **严重度**：P3　**scope**：site　**类别**：interaction　**设备/主题**：desktop-1280 / 1366 / 1440 / 1920；/lab/scheduling/；深色主题
- **现象**：4 个进程块仍是浅色硬编码：rgb(198,232,223) / rgb(216,230,250) / rgb(250,231,186) / rgb(232,217,244)，对卡片背景 rgb(32,33,38) 的对比 12.25:1；块内文字与块底对比 8.93:1（可读，仅突兀）
- **复现**：1) 打开 /lab/scheduling/　2) 切深色（label[for="__palette_1"]）　3) 看「执行时间轴」甘特图色块
- **期望**：深色主题下图表色板应有深色变体，与卡片表面协调
- **量化**：darkCardBg=rgb(32, 33, 38)；blockColors=[rgb(198, 232, 223), rgb(216, 230, 250), rgb(250, 231, 186), rgb(232, 217, 244)]；blockVsCardRatio=12.25；textOnBlockRatio=8.93；blocksPerRender=4；lightUnchanged=true
- **根因**：notes.css:103-107（.gantt-block / .process-1/2/3 / .process--1 硬编码十六进制底色）
- **建议**：用 `[data-md-color-scheme="slate"] .gantt-block{...}` 提供深色变体，或改用 color-mix()/token 派生；保持每块色相可区分即可。
- **证据**：`qa/artifacts/desktop/lab-dark-1440.png`、`qa/artifacts/desktop/lab-light-1440.png`　被测 URL：http://127.0.0.1:8123/lab/scheduling/

### DSK-11 站点不跟随系统深色偏好：系统已深色，页面仍全白

- **严重度**：P3　**scope**：config　**类别**：a11y　**设备/主题**：desktop-1440（其它宽度同）；colorScheme=dark 上下文
- **现象**：matchMedia 返回 true，但 body 计算背景仍是 rgb(255,255,255)，body 上没有 data-md-color-scheme，页面需手动点月亮图标才变深色
- **复现**：1) 用 colorScheme=dark 打开 /chapters/chapter-2/　2) 检查 matchMedia("(prefers-color-scheme: dark)").matches 与 body 背景
- **期望**：系统偏好深色时首屏即为深色（MkDocs Material 支持 palette.media 自动切换）
- **量化**：prefersDarkMatches=true；bodyBg=rgb(255, 255, 255)；schemeAttrOnBody=null；schemeAfterManualClick=slate；bodyBgAfterManualClick=rgb(24, 25, 29)；metaColorScheme=dark
- **根因**：站点/mkdocs.yml 的两个 palette 条目均未设置 media:（需 (prefers-color-scheme: light)/(prefers-color-scheme: dark)），notes.css 不处理系统偏好
- **建议**：给 palette 两项分别加 `media: "(prefers-color-scheme: light)"` / `"(prefers-color-scheme: dark)"`，保留手动切换 toggle。
- **证据**：`qa/artifacts/desktop/home-light-1440.png`、`qa/artifacts/desktop/home-dark-1440.png`　被测 URL：http://127.0.0.1:8123/chapters/chapter-2/

### DSK-12 焦点环两种颜色两套样式，侧栏滚动容器还会把环裁掉 7.3px

- **严重度**：P3　**scope**：upstream　**类别**：a11y　**设备/主题**：desktop-1440（tab 走查，light+dark）
- **现象**：正文与跳过链接用 rgb(40,89,197)（notes.css 的 --note-focus），页头按钮/侧栏目录/标题锚点却用 Material 的 rgb(66,135,255) 3px auto；侧栏最后一项的环被 .md-sidebar__scrollwrap（overflow:auto）裁掉 7.3px。深色下环色分别 rgb(169,194,255) 与 rgb(66,135,255)
- **复现**：1) 打开章节页，从页面开头连续 Tab　2) 看搜索框/侧栏目录/页脚链接的焦点环颜色　3) 走到侧栏最后一项「14 教材本章习题」
- **期望**：全站统一一种焦点环（notes.css:46 定义 3px solid var(--note-focus) + 4px offset），且在滚动容器内不被裁切
- **量化**：siteRingColorLight=rgb(40, 89, 197)；materialRingColorLight=rgb(66, 135, 255)；siteRingDark=rgb(169, 194, 255)；ringWidthPx=3；ringOffsetPx=4；clippedByAncestor=.md-sidebar__scrollwrap overflow:auto；clippedPx=7.3；navLinksWithMaterialRing=40
- **根因**：notes.css:46 只覆盖 `:where(a,button,input,select,summary):focus-visible`；Material 的 `.md-nav__link:focus-visible`/`.md-option:focus-visible + label` 特异性更高 → 两套环。侧栏裁切来自 .md-sidebar__scrollwrap 的 overflow:auto
- **建议**：用 `a:focus-visible,button:focus-visible,...{outline:3px solid var(--note-focus)!important}` 或提高特异性统一环色；给 `.md-nav__link` 加 4px 内边距/让 scrollwrap 有 8px 内滚动留白，避免环贴边被裁。
- **证据**：`qa/artifacts/desktop/focus-nav-clipped.png`、`qa/artifacts/desktop/focus-headerlink.png`、`qa/artifacts/desktop/skiplink-light.png`　被测 URL：http://127.0.0.1:8123/chapters/chapter-2/

### DSK-13 1920 档正文行宽 895px（约 56 个汉字/行），且 --sl-content-width 是死声明

- **严重度**：P3　**scope**：taste　**类别**：typography　**设备/主题**：desktop-1920（1440 也已达 895px 上限）
- **现象**：正文段落宽 895px、内容列 948px，按 16px 汉字计约 56 字/行（量得的 contentW/字号比 53–65）；`.md-grid{max-width:1480px}` 才是真正生效的约束，`--sl-content-width` 全站无人引用（grep 0 处使用）。1280 档 796px（约 50 字）尚可
- **复现**：1) 在 1920x1080 打开 /chapters/chapter-2/　2) 量正文段落宽度与每行汉字数　3) 检索 `--sl-content-width` 的使用处
- **期望**：中文长文舒适行宽约 30–45 字；notes.css:4 声明了 --sl-content-width:56rem 作为内容宽度上限
- **量化**：contentWidthPx={d1280:796, d1366:882, d1440:956, d1920:948}；paragraphWidthPx=895；cjkCharsPerLine=56；measuredCharsPerLine={d1280:53, d1366:60, d1440:65, d1920:64}；declaredVar=--sl-content-width: 56rem；declaredVarUsages=0；realConstraint=.md-grid max-width 1480px；recommendedChars=30–45
- **根因**：notes.css:4（声明）与 notes.css:147 `.md-grid{max-width:1480px}`（实际生效）
- **建议**：给 `.md-content__inner`/`.md-typeset` 设 max-width: 42rem（约 672px，42 汉字）或直接启用 --sl-content-width；同时删除或真正使用该变量。
- **证据**：`qa/artifacts/desktop/table-1920.png`　被测 URL：http://127.0.0.1:8123/chapters/chapter-2/

## 通过项（已实测，不计缺陷）

| 检查项 | 结果 | 实测 |
|---|---|---|
| 深色主题切换 | 通过 | 点击 label[for="__palette_1"] 生效：body[data-md-color-scheme] 由 default→slate，body 背景 rgb(255,255,255)→rgb(24,25,29)；键盘 ArrowRight 也可切换 |
| 横向溢出 / 表格溢出 | 通过 | 4 档宽度 × 3 页 × 2 主题共 24 次检测：documentElement.scrollWidth 均等于视口宽（1280/1366/1440/1920），被裁元素 0，表格溢出 0 |
| 200% 缩放（640×512@2x） | 通过 | 无横向溢出；表格 606px 不滚动；工具条 608×72 不裁切；搜索框收成移动态 0×48（Material 断点行为） |
| prefers-reduced-motion | 通过 | reduced 下 .md-header/.md-nav__link/正文链接等 transition-duration 全部 0s（常规态 0.25s/0.125s），动画元素 0 个（notes.css:120 生效） |
| 跳过链接 | 通过 | 第一站 Tab 落到 a.md-skip：opacity 0→1、58×36 @ (10,10)、定位 fixed、href="#2" 目标存在、焦点环 3px rgb(40,89,197) 可见 |
| 弹窗键盘流程 | 通过 | Enter 打开后焦点落在「关闭 · Esc」按钮，aria-label=插图预览，alt=图2-1 进程状态转换图；Esc 关闭且焦点回到触发按钮（backToTrigger=true） |
| 折叠答案键盘操作 | 通过 | details summary 可用 Enter 展开、Space 收起（before=false → Enter=true → Space=false） |
| 标题/landmark/图片 alt | 通过 | h1 数量 1，标题层级跳级 0，header/nav/main/footer 齐全；4 张内容图均有中文 alt（第 5 张是弹窗内的空 alt 占位图，不在正文流） |
| aria-live | 通过 | .lab-results 有 aria-live="polite" aria-atomic="true"，.save-status 有 role="status"（注意：recon 时曾误判为缺失，实际 HTML 里有 role） |
| 表单 label 关联 | 通过 | /lab/scheduling/ 两个 .lab-controls label 采用隐式包裹（label>select/input，隐藏 for 但可访问），输入行用 aria-label 标注「P1 到达时刻」等 |
| CLS / LCP（本地，仅参考） | 参考值 | CLS 0.0008（1440）/0.0009（1280），唯一 shift 发生在 308ms 的 H2；LCP 264ms/244ms（元素为正文段落）；首屏传输 759KB / 11 资源 / 1 个 long task |
| 控制台与网络 | 通过 | 所有检测页 console error 0、pageerror 0、4xx 0、requestfailed 0 |

## 缺口与说明

- 深色主题「进度条/代码块/折叠答案/页头导航标题」实测均随主题正确切换：progress 轨道 rgb(223,226,232)→rgb(56,58,67)，pre>code rgb(245,245,245)→rgb(39,42,53)，表头 rgb(243,244,246)→rgb(36,37,43)——未列为缺陷。
- 折叠 <details> 内的 12 个代码元素在默认收起态会量到 rgb(245,245,245)，展开后实测 rgb(39,42,53)（正确深色）：这是 Chromium 对 content-visibility 收起子树的自定义属性解析假象，非缺陷，已排除。
- 搜索中文「搜不到」曾是本轮的一条 P1，复核后**判定为假阳性并降级为 DSK-01（P3, upstream）**：Material 9.7.7 检索由 keyup 驱动，Playwright 对非 ASCII 走 CDP Input.insertText 不产生 keyup；补一次按键后同一查询得 8 条结果，/?q=进程调度 直达也得 8 条。站点中文搜索可用，无需修复。
- 触控目标尺寸（页头图标 40px、搜索清空按钮 24×24、正文锚点 17×42）在桌面鼠标场景下不构成阻断，未单列；如需与 mobile/tablet 对齐可在汇总时并入触控类。
- 字体渲染/PDF、打印样式（@media print）、Firefox/Safari 未覆盖：本机只有 Chromium 141。
- CLS/LCP 为本地无 CDN 环境下的参考值，不代表线上真实网络表现。

## 产物

- 脚本：`qa/scripts/desktop.mjs`（`node qa/scripts/desktop.mjs collect|shots|render`）
- 原始数据：`qa/artifacts/desktop/raw.json`、`probe2..6.json`、`recon.json`
- 截图：`qa/artifacts/desktop/*.png`
