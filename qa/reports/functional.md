# 功能正确性审计报告（qa-functional）

- 成员：**qa-functional**　被测：本地 `http://127.0.0.1:8123`（MkDocs Material 9.7.7 构建产物），线上 `https://studynote.chosenecho.dpdns.org` 抽查 404 与搜索
- 设备：desktop-1280（主）＋ iPhone SE 375×667（关键交互补测）
- 方法：Playwright 真实点击/键盘/表单；搜索用 `?q=` 直连 + 真实 keydown/keyup（自动化输入中文走 CDP，不触发 keyup，不作为站点缺陷）；调度实验用**独立重写的 FCFS/非抢占 SPF/RR 模拟器**复算（精确分数求平均，不复用站点代码）
- 运行：`node qa/scripts/functional.mjs`（workdir=仓库根目录）→ `qa/reports/functional.json` + `qa/artifacts/functional/*.png`
- 结论：共 **11 条** —— P0 0 / P1 1 / P2 6 / P3 4。主要流程（搜索、进度、字号、插图、习题、调度、导航、历史）整体可用；问题集中在两门课的习题折叠不一致、字号设置只作用于正文、以及若干承诺未落地。
- 判定纪律：每条都有截图 + 量化值 + 可复现步骤；`scope` 区分站点缺陷 / 内容设计取舍 / Material 上游默认。

## 总览

| # | 严重度 | scope | 类别 | 标题 |
|---|---|---|---|---|
| 1 | P1 | 内容/设计取舍 | 内容 | 计算机组成原理六章「教材本章习题」答案完全没折叠：0 个 &lt;details&gt;，答案以表格列直接可见（操作系统概论六章 75 个） |
| 2 | P2 | 站点缺陷 | 内容 | 第三章综合应用题（银行家算法）的资源状态表没有渲染：整张 5 行表格变成一段带竖线的纯文本 |
| 3 | P2 | 内容/设计取舍 | 导航 | 十二章正文里内部链接数为 0，「正文之间可以互相跳转」没有落地（只有侧栏/页脚能走） |
| 4 | P2 | 站点缺陷 | 排版 | 字号 16/18/20 只缩放正文、列表和代码；表格固定 12.8px、标题固定 31/24px、折叠摘要与工具条固定 17.5px |
| 5 | P2 | 站点缺陷 | 交互 | iPhone SE（375px）上点击插图「放大」几乎不放大：正文内图 301px → dialog 内 311px（1.03×） |
| 6 | P2 | Material/上游默认 | 交互 | 搜索对以 s 结尾的缩写做词干化：FCFS / CFS / HTTP(S) 命中 0 条，而 FCF 能搜到 3 条 |
| 7 | P2 | 内容/设计取舍 | 内容 | 首页复习进度只显示「已复习 N / 6 章」，不显示复习到第几章；模板里没有 data-progress-chapter / data-next-chapter 元素，对应代码是死代码 |
| 8 | P3 | 站点缺陷 | 内容 | RR 默认示例的平均带权周转时间显示 2.67，独立复算为 2.675（四舍五入应为 2.68）——toFixed 的二进制截断 |
| 9 | P3 | Material/上游默认 | 交互 | 搜索结果的高亮参数被截断/为空：查「进程调度」只高亮「进程」，查「死锁」的页面级结果落地后 0 处高亮 |
| 10 | P3 | Material/上游默认 | 导航 | 404 页正文只有一行英文「404 - Not found」：无中文说明、无返回首页入口；本地静态服务不返回站点 404 页 |
| 11 | P3 | 内容/设计取舍 | 内容 | 「教材本章习题」标题下挂的是「自测题（自编）」表格，导语却写「答案依据教材附录」——口径自相矛盾 |

## 优先修复顺序（建议）

1. **FUN-01（P1）**：两门课的习题折叠口径不一致，是 README 承诺与产品行为最直白的冲突；改 hooks.py 或改 README 二选一，成本都不高。
2. **FUN-02（P2）**：第三章银行家算法题目里的资源表渲染失败，直接影响做题；hooks.py:22 补一个空行即可。
3. **FUN-04（P2）**：字号三档只对正文生效，表格/标题/摘要比例失真；这是「字号能调」承诺的核心体验。
4. **FUN-05（P2）**：手机上「点击放大」几乎不放大，等于该功能在移动端失效。
5. 其余 P2/P3 属于承诺补充、上游搜索行为或显示细节，可按迭代处理。

## 任务卡清单对照（task-4）

| # | 检查项 | 结论 | 关键证据 |
|---|---|---|---|
| 1 | 搜索（中文/英文/空结果/键盘/索引/落点） | 通过（索引 200、中文命中、空结果提示、键盘可操作、落点未遮挡）；缩写词干化见 FUN-06，高亮截断见 FUN-09 | FUN-06 / FUN-09 / 核查通过第 1-3 项 |
| 2 | 复习进度（持久化/跨章/首页同步/localStorage/清空） | 部分通过：持久化与计数/进度条同步正常；「复习到第几章」承诺未落实 + 死代码 FUN-07 | FUN-07 / 核查通过第 4 项 |
| 3 | 字号 16/18/20（正文/跨页/记忆/表格代码比例） | 正文生效且记忆；表格/标题/摘要/工具条不跟随 → FUN-04 | FUN-04 / 核查通过第 5 项 |
| 4 | 插图 dialog（弹出/清晰度/三种关闭/串图/alt/404） | 通过（SVG 矢量放大、按钮/Esc/背景三种关闭、无串图、alt 完整、0 张 404）；移动端放大幅度不足 → FUN-05 | FUN-05 / 核查通过第 6 项 |
| 5 | 教材习题折叠（OS 六章数量 / CO 为何 0） | 未通过：OS 75 个折叠与源题数一一对应；CO 六章 0 个折叠、33 行答案直接可见 → FUN-01；CO 标题口径 → FUN-11 | FUN-01 / FUN-11 / 核查通过第 7 项 |
| 6 | 交叉链接与导航（首页入口/上下页/TOC 锚点/锚点遮挡/返回滚动） | 导航与锚点通过（250 链接 0 坏链、TOC 锚点 0 缺失、标题 top=68px > 页头 49px、返回恢复滚动）；正文内部链接 0 个 → FUN-03 | FUN-03 / 核查通过第 8-10 项 |
| 7 | 调度实验（FCFS/SPF/RR 独立复算/时间片禁用/非法输入/甘特表一致/重置） | 通过：15 组复算 0 处结构性不一致，仅 RR 平均带权 2.67 vs 2.675 显示差异 → FUN-08 | FUN-08 / 核查通过第 11 项 |
| 8 | JS 异常与 4xx | 通过：14 页 console error 0 / pageerror 0 / requestfailed 0 / 4xx 0 | 核查通过第 13 项 |
| 9 | 404 页（状态码与返回入口） | 状态码 404 正确；线上正文仅英文标题、无返回 CTA，本地服务不返回站点 404 页 → FUN-10 | FUN-10 / 核查通过第 12 项 |
| 10 | 历史记录（前进后退/深浅色切换是否打断滚动） | 通过：前进后退 URL 正确、返回后 scrollY 恢复、切换深色 scrollY 不变 | 核查通过第 12 项 |

## P1（主要流程被卡或明显误导）：1 条

### FUN-01 计算机组成原理六章「教材本章习题」答案完全没折叠：0 个 &lt;details&gt;，答案以表格列直接可见（操作系统概论六章 75 个）

- **严重度**：P1　**scope**：内容/设计取舍　**类别**：内容　**设备**：desktop-1280
- **被测 URL**：http://127.0.0.1:8123/computer-organization/chapter-1/
- **现象**：操作系统概论六章共 75 个 &lt;details&gt;（13/16/13/15/9/9），全部默认收起；计算机组成原理六章共 0 个 &lt;details&gt;，本应折叠的 33 行答案（6 个表格的第二列）直接铺在页面上。
- **复现**：1) 打开 /computer-organization/chapter-1/　2) 滚动到「7 教材本章习题」　3) 对照 /chapters/chapter-2/ 的同名小节
- **期望**：README 承诺「教材习题的答案默认折起来」；两门课共十二章都应默认折叠，点「答案与解析」才展开。
- **量化证据**：
  - `osDetails` = 75
  - `coDetails` = 0
  - `coAnswerRows` = 33
  - `coChapters` = 6
  - `osItems` = 75
  - `coVisibleAnswerTables` = 6
- **根因**：站点/hooks.py:28-34 format_exercises 只识别 `^## .*教材.*习题` 节里的 `**N.` / `**题目：` 题号（hooks.py:32 正则），组成原理的题目是 markdown 表格，0 次匹配；hooks.py:73 对组成原理也只调用同一个 format_exercises，没有表格→details 的转换分支。
- **建议**：给 hooks.py 增加表格形态习题的处理：把 `## N 教材本章习题` 节内表格的每一数据行转成 &lt;section class="exercise-item"&gt; + &lt;details class="exercise-answer"&gt;&lt;summary&gt;答案与解析&lt;/summary&gt;，答案列放 details 内；或在 README/首页明确写「计算机组成原理的习题表答案不折叠」。
- **证据**：[fn-01-co-exercise.png](qa/artifacts/functional/fn-01-co-exercise.png)、[fn-01-os-exercise.png](qa/artifacts/functional/fn-01-os-exercise.png)

## P2（明显影响但有绕法）：6 条

### FUN-02 第三章综合应用题（银行家算法）的资源状态表没有渲染：整张 5 行表格变成一段带竖线的纯文本

- **严重度**：P2　**scope**：站点缺陷　**类别**：内容　**设备**：desktop-1280
- **被测 URL**：http://127.0.0.1:8123/chapters/chapter-3/
- **现象**：题目段落里出现原始竖线文本：题目： 考虑系统某一时刻的状态，资源列顺序为 A、B、C、D。 ⏎ | 进程 | Allocation | Max | Available | ⏎ |---|---|---|---| ⏎ | p0 | (0,0,1,2) | (0,0,1,2) | (；页面内 &lt;table&gt; 0 个、纯文本段落 1 个（约 262 字）。
- **复现**：1) 打开 /chapters/chapter-3/　2) 滚动到「12 教材本章习题 → 综合应用题」最后一道（题目：考虑系统某一时刻的状态…）
- **期望**：「进程 / Allocation / Max / Available」应渲染成 5 行表格，和答案里的 Need 表一样可读。
- **量化证据**：
  - `rawPipeParagraphs` = 1
  - `chars` = 262
  - `tablesInThisItem` = 0
- **根因**：站点/hooks.py:22-25 exercise()：`result = &lt;section markdown="1"&gt;\n\n + question + "\n" + prompt.strip()`，题目行与紧随其后的表格之间只有一个换行；md_in_html 要求块级元素前后有空行，表格因此没被解析。答案里的表格因为 hooks.py:24 用了 `\n\n&lt;details…&gt;\n&lt;summary…&gt;\n\n` 才正常。
- **建议**：把 hooks.py:22 的拼接改成 `question + "\n\n" + prompt.strip()`（或在 prompt 里补 `\n\n`），并给 &lt;section markdown="1"&gt; 内的表格前后保证空行。
- **证据**：[fn-02-ch3-broken-table.png](qa/artifacts/functional/fn-02-ch3-broken-table.png)

### FUN-03 十二章正文里内部链接数为 0，「正文之间可以互相跳转」没有落地（只有侧栏/页脚能走）

- **严重度**：P2　**scope**：内容/设计取舍　**类别**：导航　**设备**：desktop-1280
- **被测 URL**：http://127.0.0.1:8123/chapters/chapter-1/
- **现象**：12 个章节页正文内非永久链接（排除 ¶ headerlink）合计 0 个，有链接的章节页 0/12；首页有 15 个链接（课程卡片+章节列表）、实验页 0 个。正文交叉引用全部是纯文本，例如「具体说明见本章第 4 节」。
- **复现**：1) 打开任意章节页　2) 检查正文（.md-content 内、非标题锚点）里的链接　3) 对照 README「正文之间可以互相跳转」
- **期望**：章节正文中的「见第三章 2.2」「第 4 节」等交叉引用应是可点击链接，能直接跳到对应章节/锚点。
- **量化证据**：
  - `contentLinksInChapters` = 0
  - `chapterPages` = 12
  - `pagesWithLinks` = 0
  - `homeLinks` = 15
  - `brokenLinks` = 0
  - `uniqueInternalLinks` = 250
- **根因**：内容侧：课程/操作系统概论/第N章_笔记.md 与 课程/计算机组成原理/第N章_笔记.md 正文中没有 markdown 链接（`见第三章 2.2` 等为纯文本）；构建侧无自动交叉引用能力（hooks.py 也没有链接重写）。
- **建议**：在源笔记里把「见第 X 章 / 第 N 节」改成 `[第 X 章](../chapter-X.md#锚点)` 形式（MkDocs 会自动转目录 URL 并校验），或在 hooks.py 里做一次关键词→链接替换；README 若不想承诺，可改为「侧栏与页脚导航」。
- **证据**：[fn-03-chapter-no-inbody-links.png](qa/artifacts/functional/fn-03-chapter-no-inbody-links.png)

### FUN-04 字号 16/18/20 只缩放正文、列表和代码；表格固定 12.8px、标题固定 31/24px、折叠摘要与工具条固定 17.5px

- **严重度**：P2　**scope**：站点缺陷　**类别**：排版　**设备**：desktop-1280 / iPhone SE
- **被测 URL**：http://127.0.0.1:8123/chapters/chapter-2/
- **现象**：正文段落 16px / 18px / 20px 随选项变化；但表格单元格始终 12.8px，h2 始终 31px、h3 始终 24px，工具条始终 17.5px；折叠答案摘要按 0.875 系数走（14px / 15.75px / 17.5px），比正文小一档。选「大号」后正文 20px，表格仍是 12.8px（0.64×），折叠答案摘要 17.5px 比正文小 2.5px。
- **复现**：1) 打开章节页　2) 把工具条「字号」依次设为 标准/较大/大号　3) 量 .md-content__inner &gt; p 与 td/th/h2/h3/details summary/.study-toolbar 的 computed font-size
- **期望**：字号选项应让整页正文（含表格、折叠答案、标题层级）按 16/18/20px 缩放，或至少保持相对比例不变。
- **量化证据**：
  - `body` = 16px / 18px / 20px
  - `listItem` = 16px / 18px / 20px
  - `code` = 14.4px / 16.2px / 18px
  - `tableCell` = 12.8px / 12.8px / 12.8px
  - `h2` = 31px / 31px / 31px
  - `h3` = 24px / 24px / 24px
  - `exerciseSummary` = 14px / 15.75px / 17.5px
  - `toolbar` = 17.5px / 17.5px / 17.5px
  - `tableToBodyRatio` = 0.8 / 0.711 / 0.64
- **根因**：站点/docs/assets/notes.css:51 与 151 只把 `--note-font-size` 赋给正文容器；标题在 notes.css:122-124 被显式改回 rem（`h2{font-size:1.55rem}` / `h3{font-size:1.2rem}`，覆盖了 53-54 行的 1.45em/1.15em），root=20px → 31/24px 固定；表格字号来自 Material 的 `.md-typeset table:not([class]){font-size:.64rem}`（12.8px，notes.css:55 的 .9em 因选择器优先级更低没生效）；工具条 notes.css:61 `.875rem`（17.5px 固定）；折叠摘要 notes.css:134/163 `.875em`（永远比正文小 0.125）；interactions.js:131-139 只写 `--note-font-size`。
- **建议**：把标题的 rem 改回相对正文的 em（或让 `--note-font-size` 驱动一个 `--note-scale` 变量同时作用于 h2/h3/表格），表格用 `.md-typeset.chapter-prose table{font-size:.9em}` 并提高优先级（如 `.md-typeset.chapter-prose table:not([class])`），工具条与折叠摘要改用 em；这样 16/18/20 三档才能整体等比缩放。
- **证据**：[fn-04-font-16.png](qa/artifacts/functional/fn-04-font-16.png)、[fn-04-font-20.png](qa/artifacts/functional/fn-04-font-20.png)

### FUN-05 iPhone SE（375px）上点击插图「放大」几乎不放大：正文内图 301px → dialog 内 311px（1.03×）

- **严重度**：P2　**scope**：站点缺陷　**类别**：交互　**设备**：iPhone SE 375x667
- **被测 URL**：http://127.0.0.1:8123/chapters/chapter-2/
- **现象**：inline img 301px（高 110px）→ dialog img 311px（高 114px），只有 1.033×；dialog 宽 353px、高 275px，图片 max-height 远未用满。桌面同一张图 706→1161（1.64×）正常。
- **复现**：1) iPhone SE 打开第四章以外的带插图章节　2) 量正文内 .figure-zoom img 宽度　3) 点开 dialog，量 dialog 内 img 宽度
- **期望**：「点击放大」在手机上应明显大于正文内插图（桌面 706px → 1161px 为 1.64×），至少铺满屏宽或按高度放大。
- **量化证据**：
  - `inlineW` = 301
  - `dialogW` = 311
  - `ratio` = 1.033
  - `desktop` = 1161
  - `closeBtn` = {"w":105,"h":50,"inViewport":true}
- **根因**：站点/docs/assets/notes.css:77-79 `.image-dialog{width:min(94vw,1400px);padding:1rem}` + `.image-dialog img{width:100%;max-height:76dvh}`：375px 屏上 dialog 内容宽 353−40=311px，和正文列宽 301px 基本相同，height 又被 SVG 的固有比例锁住，所以没有放大幅度。
- **建议**：移动端让 dialog 宽度用 100vw/去掉内边距，或让 img 按 `max-height:76dvh; width:auto` 由高度驱动放大；也可加 `transform:scale()` 或允许双指缩放（`touch-action: pinch-zoom`）。
- **证据**：[fn-05-mobile-dialog.png](qa/artifacts/functional/fn-05-mobile-dialog.png)、[fn-05b-dialog-desktop.png](qa/artifacts/functional/fn-05b-dialog-desktop.png)

### FUN-06 搜索对以 s 结尾的缩写做词干化：FCFS / CFS / HTTP(S) 命中 0 条，而 FCF 能搜到 3 条

- **严重度**：P2　**scope**：Material/上游默认　**类别**：交互　**设备**：desktop-1280 / 线上
- **被测 URL**：http://127.0.0.1:8123/?q=FCFS
- **现象**：FCFS → 「没有找到符合条件的结果」0 条；CFS → 0 条；FCF → 3 条；FIFO → 3、LRU → 2、DMA → 3、CPU → 10、RR → 1 正常；HTTP/HTTPS → 0。本地与线上一致（线上 FCFS 0 条、内存管理 5 条）。
- **复现**：1) 在搜索框输入 FCFS 并回车（或直接访问 /?q=FCFS）　2) 再试 FCF / FIFO / CPU　3) 线上同样试一次
- **期望**：搜索「FCFS」应命中有 FCFS 字样的页面（实验页与第三章）。
- **量化证据**：
  - `local` = {"进程调度":8,"内存管理":5,"死锁":1,"先来先服务":2,"FCFS":0,"CFS":0,"FCF":3,"FIFO":3,"CPI":3,"zjq没有这个词":0}
  - `live` = {"FCFS":{"meta":"没有找到符合条件的结果","count":0},"内存管理":{"meta":"5 个符合条件的结果","count":5}}
  - `leadMatrix` = qa/artifacts/lead/search-acronyms.json
- **根因**：Material 9.7.7 内置 lunr 的 Porter 词干化在查询侧把 `fcfs` 词干化成 `fcf`（索引侧未这样切），属于上游搜索库行为；本站 search 配置见 站点/mkdocs.yml:48-50（`search: lang [zh, en]`，未配同义词/自定义分词）。
- **建议**：给搜索加别名兜底：在 mkdocs.yml 的 search 配置里加 `separator`/自定义 `stemmer` 不现实，可用 `search` 插件 + 在实验页与第三章正文里补「FCFS（先来先服务）」多写法（现有正文已有「FCFS · 先来先服务」，但搜索仍按词干匹配失败），或在导航层加「实验」直达入口；至少已知问题记录在 README。
- **证据**：[fn-06-search-fcfs.png](qa/artifacts/functional/fn-06-search-fcfs.png)

### FUN-07 首页复习进度只显示「已复习 N / 6 章」，不显示复习到第几章；模板里没有 data-progress-chapter / data-next-chapter 元素，对应代码是死代码

- **严重度**：P2　**scope**：内容/设计取舍　**类别**：内容　**设备**：desktop-1280 / iPhone SE
- **被测 URL**：http://127.0.0.1:8123/
- **现象**：首页只有「操作系统概论已复习 1 / 6 章」「计算机组成原理已复习 1 / 6 章」与两条进度条；[data-progress-chapter] 徽标 0 个、[data-next-chapter] 0 个——interactions.js:161-180 的「已复习/待复习」徽标与「继续复习 · 第 N 章」永远不会执行。勾选第二章 + 组成原理第一章后首页只显示 1/6 与 1/6，看不出勾的是哪一章。
- **复现**：1) 勾选第二章与组成原理第一章　2) 回首页看「复习进度」区　3) 检查 DOM 里 [data-progress-chapter]/[data-next-chapter]
- **期望**：README：「首页会显示两门课各自复习到第几章」——应能看出复习到哪一章（或哪几章已完成），最好有「继续复习」入口。
- **量化证据**：
  - `counts` = {"k":"os","v":"1"} / {"k":"co","v":"1"}
  - `bars` = {"k":"os","v":1,"max":6} / {"k":"co","v":1,"max":6}
  - `badges` = 0
  - `nextChapterEl` = false
  - `deadCodeLines` = 站点/docs/assets/interactions.js:161-180
- **根因**：站点/docs/index.md:40-50 只有计数 span 与 &lt;progress&gt;，没有 `data-progress-chapter` 徽标和 `data-next-chapter` 按钮；站点/docs/assets/interactions.js:161-180 依赖这两个选择器。
- **建议**：二选一：① 在 index.md 的六章列表项上加 `data-progress-chapter="1"…`（并补 `data-next-chapter` 按钮），让已有 JS 生效；② 若不做，删掉 interactions.js:161-180 的死代码并把 README 改成「显示已复习章数」。
- **证据**：[fn-07-home-progress.png](qa/artifacts/functional/fn-07-home-progress.png)

## P3（细节/可维护性）：4 条

### FUN-08 RR 默认示例的平均带权周转时间显示 2.67，独立复算为 2.675（四舍五入应为 2.68）——toFixed 的二进制截断

- **严重度**：P3　**scope**：站点缺陷　**类别**：内容　**设备**：desktop-1280
- **被测 URL**：http://127.0.0.1:8123/lab/scheduling/
- **现象**：默认示例 RR（q=2）页面输出「平均周转时间 7.00　·　平均带权周转时间 2.67」，即平均带权 2.67；独立复算 (2.2+3+3+2.5)/4 = 2.675，两位小数应为 2.68。逐进程带权 2.20/3.00/3.00/2.50 与平均周转时间 7 均与复算一致；15 组对比中只有这 1 处不一致，其余 14 组的均值、逐进程值与 gantt 片段全部一致。
- **复现**：1) 打开实验页，算法选 RR、时间片 2，点「运行」　2) 读「平均带权周转时间」　3) 用 (11/5+9/3+3/1+5/2)/4 复算
- **期望**：平均带权周转时间 = (2.2+3+3+2.5)/4 = 2.675，保留两位小数应为 2.68。
- **量化证据**：
  - `page` = {"avg":7,"weighted":2.67}
  - `refRounded` = 2.68
  - `refExact` = 2.675
  - `diffRounded` = -0.01
  - `diffExact` = -0.005
  - `comparisons` = 15
  - `rowMismatches` = 0
  - `mismatchedRuns` = 默认示例/rr
- **根因**：站点/docs/assets/interactions.js:37 `weightedAverage: ... / jobs.length` 与 interactions.js:77 `result.weightedAverage.toFixed(2)`；10.7/4 在 IEEE-754 下是 2.674999…，toFixed 得 2.67。
- **建议**：改为十进制四舍五入（如 `Math.round(x * 100 + Number.EPSILON * 100) / 100`，或先加 1e-9 再 toFixed），或保留 3 位小数。
- **证据**：[fn-08-lab-rr.png](qa/artifacts/functional/fn-08-lab-rr.png)

### FUN-09 搜索结果的高亮参数被截断/为空：查「进程调度」只高亮「进程」，查「死锁」的页面级结果落地后 0 处高亮

- **严重度**：P3　**scope**：Material/上游默认　**类别**：交互　**设备**：desktop-1280
- **被测 URL**：http://127.0.0.1:8123/?q=死锁
- **现象**：「进程调度」结果链接是 ?h=进程（只有前两字），落地后正文高亮 5 处「进程」，没有「调度」；「死锁」的页面级结果链接是 ?h=（空），落地 0 处高亮；带锚点的结果（#8-41）落点正确且高亮 43 处。
- **复现**：1) 搜索「进程调度」，看结果链接的 ?h= 参数　2) 点第一条页面级结果，数正文 &lt;mark&gt;　3) 搜索「死锁」，点第一条（无 #）结果，数 &lt;mark&gt;
- **期望**：搜索跳转后应高亮完整查询词，至少高亮命中的词。
- **量化证据**：
  - `query` = 进程调度
  - `hParam` = 进程
  - `pageLevelMarks` = 0
  - `anchorLanding` = {"url":"http://127.0.0.1:8123/chapters/chapter-3/?h=%E6%AD%BB%E9%94%81#8-41","hash":"#8-41","targetFound":true,"targetTop":68,"headerBottom":49,"covered":false,"marksInContent":43,"firstMark":"死锁"}
  - `keyboardAfterEnter` = http://127.0.0.1:8123/chapters/chapter-3/?h=%E6%AD%BB%E9%94%81#8-41
- **根因**：Material 搜索组件的 `?h=` 高亮参数（站点未自定义）；查询词经 lunr zh 分词后只把首个 token 写进 h，页面级结果有时为空。
- **建议**：无法从站点侧改 Material 内部行为；可在 mkdocs.yml 关掉 `search.highlight`（避免半截高亮误导），或升级 Material 观察上游是否修复。
- **证据**：[fn-09-search-highlight-anchor.png](qa/artifacts/functional/fn-09-search-highlight-anchor.png)、[fn-09b-search-panel.png](qa/artifacts/functional/fn-09b-search-panel.png)

### FUN-10 404 页正文只有一行英文「404 - Not found」：无中文说明、无返回首页入口；本地静态服务不返回站点 404 页

- **严重度**：P3　**scope**：Material/上游默认　**类别**：导航　**设备**：desktop-1280
- **被测 URL**：https://studynote.chosenecho.dpdns.org/no-such-page-xyz/
- **现象**：线上：HTTP 404，标题「课程笔记」，h1「404 - Not found」，正文只有「404 - Not found」，正文链接 0 个（只有左侧导航可回首页，移动端要开抽屉）。本地：HTTP 404，正文「Error response Error code: 404 Message: File not found. Erro…」（python http.server 自带英文错误页），完全不是站点 404.html。
- **复现**：1) 直接访问不存在的路径（线上）　2) 看状态码与正文内容/链接　3) 本地同样访问（python http.server）
- **期望**：404 应返回 404 状态码，并给出中文说明和「返回学习首页 / 搜索」入口。
- **量化证据**：
  - `liveStatus` = 404
  - `liveH1` = 404 - Not found
  - `liveContentLinks` = 0
  - `localStatus` = 404
  - `localH1` = Error response
- **根因**：Material 默认 404 模板只输出 `&lt;h1&gt;404 - Not found&lt;/h1&gt;`（站点未提供 404.md 覆盖）；本地评估环境用 `python -m http.server` 服务站点/dist，它对未命中路径返回自己的错误页，不会读 404.html（线上 Cloudflare Pages 会）；钩子/工作流均未生成 404 内容页。
- **建议**：新增 站点/docs/404.md（中文说明 + 返回首页 + 搜索入口），构建后即覆盖 Material 默认模板；本地评估若要复现线上行为，需用能回退 404.html 的静态服务器（如 `npx serve` / mkdocs serve）。
- **证据**：[fn-10-404-live.png](qa/artifacts/functional/fn-10-404-live.png)、[fn-10-404-local.png](qa/artifacts/functional/fn-10-404-local.png)

### FUN-11 「教材本章习题」标题下挂的是「自测题（自编）」表格，导语却写「答案依据教材附录」——口径自相矛盾

- **严重度**：P3　**scope**：内容/设计取舍　**类别**：内容　**设备**：desktop-1280
- **被测 URL**：http://127.0.0.1:8123/computer-organization/chapter-1/
- **现象**：六章全部是「## N 教材本章习题」+ 导语「本节按“单项选择题／填空题／简答题”分节，答案依据教材附录。」，但表格表头是「自测题（自编） / 参考答案与辨析」；组成原理六章根本没有单选/填空/简答分节（subsections 0 个），导语与内容不符。
- **复现**：1) 打开组成原理任意一章，滚动到「N 教材本章习题」　2) 读导语与表头
- **期望**：标题、导语、表头一致：要么是教材原题（答案依据教材附录），要么是自编自测题。
- **量化证据**：
  - `chapters` = 6
  - `headings` = 7 教材本章习题¶ / 12 教材本章习题¶ / 6 教材本章习题¶ / 10 教材本章习题¶ / 8 教材本章习题¶ / 7 教材本章习题¶
  - `headers` = ["自测题（自编）","参考答案与辨析"] / ["自测题（自编）","参考答案与辨析"] / ["自测题（自编）","参考答案与辨析"] / ["自测题（自编）","参考答案与辨析"] / ["自测题（自编）","参考答案与辨析"] / ["自测题（自编）","参考答案与辨析"]
  - `intro` = 本节按“单项选择题／填空题／简答题”分节，答案依据教材附录。
  - `subsectionCount` = 0
- **根因**：内容侧：课程/计算机组成原理/第N章_笔记.md 的习题节标题与导语沿用操作系统概论的模板，但内容改成了自编表（表头「自测题（自编）」）。
- **建议**：把六章的「N 教材本章习题」改为「N 本章自测题（自编）」，导语改成「题目与答案均为自编，用于自测」；或补齐教材原题与附录答案。
- **证据**：[fn-11-co-label.png](qa/artifacts/functional/fn-11-co-label.png)

## 核查通过（做法与数值）

- **搜索索引与中文检索**：search_index.json HTTP 200，237 文档；进程调度 8、内存管理 5、死锁 1、先来先服务 2、CPI 3 条，结果标题与正文均高亮；空查询提示「没有找到符合条件的结果」，0 条。（证据：[fn-09b-search-panel.png](qa/artifacts/functional/fn-09b-search-panel.png)）
- **搜索跳转落点**：带锚点结果 #8-41 落地后目标标题 top=68px &gt; 固定页头底 49px，未被遮挡；正文高亮 43 处。
- **搜索键盘操作**：?q= 打开面板后 ArrowDown×2 聚焦结果链接（focus 命中 1 个），Enter 跳转到 http://127.0.0.1:8123/chapters/chapter-3/?h=%E6%AD%BB%E9%94%81#8-41
- **复习进度持久化**：勾选后 localStorage 键 os-notes:completed:v1 = ["2"]；刷新后 checked=true；第二章与第一章、组成原理第一章互不影响；清空后首页回落 ["0","0"]。
- **字号记忆与跨页**：选 20 后刷新仍为 20，正文 20px；换到第五章仍 20（正文 20px）；iPhone SE 选 20 后正文 20px、无横向溢出（false）。（证据：[fn-04b-mobile-font20.png](qa/artifacts/functional/fn-04b-mobile-font20.png)）
- **插图 dialog 三种关闭方式与不串图**：OS 第一章 8 张插图均包成按钮且 alt 完整（8/8）；点按钮关闭 open=false，Esc 关闭 open=false 且焦点回按钮（figure-zoom focus-visible），点背景关闭 open=false；连点两图预览源不同（true）。warm() 后正文图 0 张 404。（证据：[fn-05b-dialog-desktop.png](qa/artifacts/functional/fn-05b-dialog-desktop.png)）
- **OS 习题折叠完整性**：六章 75 个 details = 源笔记 75 道题，默认展开数 0，空答案 0，摘要统一「答案与解析」；单项选择题解析出 4 个选项（3/4/3/5/3/3 题）。（证据：[fn-01-os-exercise.png](qa/artifacts/functional/fn-01-os-exercise.png)）
- **交叉链接可用性**：250 个内部链接（含 ¶ 锚点）全部 HTTP 200，锚点目标全部存在（坏链 0 个）。
- **TOC 锚点精度**：三页 TOC 共 55 个锚点，缺失 0 个；hash 导航实测 9 次全部 top=68px &gt; 页头底 49px，遮挡 0 次（scroll-margin-top=68px）。
- **页脚上下页**：第一章→…→第六章→组成原理第一章→…→第六章→进程调度实验，上下页链接与文案正确（抽查 6 页全部 200）。
- **调度实验三算法正确性**：5 组数据 × 3 算法共 15 次复算：平均周转时间/逐进程完成与周转值/gantt 片段全部一致（0 处不一致），仅 RR 默认示例平均带权 2.67 vs 2.675 的四舍五入问题（FUN-08）。时间片在 FCFS/SPF 下 disabled=true，「恢复示例」后回到 6.50/3.46。（证据：[fn-08-lab-rr.png](qa/artifacts/functional/fn-08-lab-rr.png)）
- **历史记录与主题切换**：前进后退 URL 正确：首页→第一章，第二章→页脚下一页→第三章；后退回到 http://127.0.0.1:8123/chapters/chapter-2/、前进回到 http://127.0.0.1:8123/chapters/chapter-3/；返回后 scrollY 2000 恢复（true）；深浅色切换 scrollY 1500→1500（scheme=slate）。（证据：[fn-12-dark.png](qa/artifacts/functional/fn-12-dark.png)）
- **JS 异常与资源 4xx**：首页/实验页/12 章共 14 页 diagnostics：console error 0、pageerror 0、requestfailed 0、HTTP 4xx 0。
- **iPhone SE 关键交互**：工具条字号 select 77×44、label 高 44，勾选后刷新保留（true）；实验页表格 402/400、甘特图 311/329，无整页横向溢出（false）；移动端搜索「内存管理」5 条。（证据：[fn-08b-lab-mobile.png](qa/artifacts/functional/fn-08b-lab-mobile.png)）

## 缺口与说明

- 自动化输入中文走 CDP insertText，只触发 input 不触发 keyup，Material 搜索面板不会即时刷新；本报告搜索结论用 `?q=` 直连与真实 keydown/keyup（ArrowDown/Enter）取得，真实 IME 用户不受影响（信息性，不记缺陷）。
- 本地静态服务是 python http.server，未命中路径不返回站点 404.html（线上 Cloudflare Pages 会），FUN-10 已把两者分开写。
- 深色主题只做了一次滚动/布局抽查（fn-12-dark.png），系统深色不生效是已知陷阱（BRIEF 陷阱 1），未重复记为缺陷。

## 备注

- FUN-04 与 qa-desktop 的 DSK-04 部分同源（`.875rem` 在 20px 根字号下 = 17.5px），本报告只从「字号设置能否整体缩放」的角度记一次，未重复 DSK-03/DSK-04 的间距与层级结论。
- FUN-06 / FUN-09 / FUN-10 属 Material 上游行为或部署环境差异，已在 scope 标注，不计入必须修改的站点缺陷。
- 本报告只做功能正确性审计，不含投资/学术结论；所有数值来自上述脚本的实测输出，可用 `node qa/scripts/functional.mjs` 复跑。

（生成时间：2026-11-01T03:52:44.707Z UTC；数据源：qa/reports/functional.json）