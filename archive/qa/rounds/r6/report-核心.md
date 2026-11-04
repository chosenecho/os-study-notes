# 版本控制核心与耦合关系审计（task-2）

审计范围：`课程/`、`站点/`、`资产/`、`.github/`、`README.md`、`.gitignore`（不含任何 `.git` 内部；不动 `归档/`、`esa-deploy/`）。
本报告是本次唯一写入物，仓库内其它文件未移动、未删除、未改名。

## 0. 基线与方法

| 项 | 值 | 依据 |
|---|---|---|
| 磁盘文件总数（不含 `.git`） | 1066 | `_整理/inventory.csv` |
| 被跟踪文件 | **44** | `git ls-files` 实测 |
| 未跟踪 | `esa-deploy/`、`_整理/` | `git status --porcelain` 实测（背景材料只说 `esa-deploy/`，`_整理/` 是审计新建的） |
| HEAD | `0836fc7` 2026-10-31 21:39:11 `Remove CSS for the retired homepage layout` | `git log -1` |
| 提交总数 / 首次提交 | 16 / `56d1acd` 2026-10-31 09:55:03 `Add operating systems notes and Starlight website` | `git rev-list --count`、`git log --reverse` |
| 站点/dist 构建时间 | 审计开始时（10:41）为 2026-10-31 21:36:39（79 个文件同一时刻）；**2026-11-01 10:43–10:50 期间被并行进程重建过两次**，见 §2.2 备注 | 目录 mtime 逐文件核对 + `hashes.csv` 对比 |

被跟踪 44 个的分布：根文件 2（`.gitignore`、`README.md`）+ `.github` 1 + `课程` 30 + `站点` 11。

审计过程中发现：有并行进程在本任务开工时跑了一次 `mkdocs build`，产物落在 `_整理/_buildcheck/`（10:43:24）——同一动作把 `站点/docs/` 下 27 个生成物的 mtime 刷新为 **2026-11-01 10:43:23**，但逐文件 SHA-256 与 10:41:36 生成的 `_整理/hashes.csv` **完全一致**（27/27）。这说明 `hooks.py` 的输出是确定的（不含时间戳），也说明**当前 dist 与当前源仍然等价**（见 §2.2）。该目录不是本次任务的产物，我未改动它。

---

## 1. 课程/ 结构审计

### 1.1 两门课清单（38 文件，0.64 MB）

| 课程 | 文件数 | 体积 | 构成 |
|---|---|---|---|
| `课程/操作系统概论/` | 31 | 0.57 MB | README.md 1 + 笔记 6 + `图/` 16（15 SVG + render.ps1）+ `图/` 8 PNG |
| `课程/计算机组成原理/` | 7 | 0.07 MB | README.md 1 + 笔记 6；**无 `图/`，无任何图片引用** |

### 1.2 命名一致性

`第N章_<章名>_笔记.md` 模式在两门课 12 个文件上 **100% 一致**，且 `hooks.py:43/67` 的 `第{n}章*_笔记.md` 通配在 12 处各自**只匹配 1 个文件**（逐章实测，无重名、无 `副本` 文件）。

不一致的地方只有两处，且都不影响构建：

1. `图/` 内部两套命名并存：8 个文件用 `图N-M_标题.svg`（第 1 章），7 个用 `标题.svg`（`PIT逻辑结构.svg`、`进程三态.svg`、`单重中断流程.svg`、`生产者消费者.svg`、`轮转调度时间轴.svg`、`死锁资源环.svg`、`银行家安全性检查.svg`，第 2、3 章）。图号只存在于 alt 文本里（如 `![图3-2 银行家算法安全性检查](图/银行家安全性检查.svg)`），文件名里没有，按图号检索文件是做不到的。
2. `第6章_IO设备管理_笔记.md` 用 `IO`，README 与 `mkdocs.yml:38` 写 `I/O`。

### 1.3 图/ 的 SVG/PNG 配对矩阵

| SVG（15，全部被 git 跟踪） | 有同名 PNG | PNG 是否被 md 引用 |
|---|---|---|
| 图1-1、图1-3、图1-6、图1-7、图1-8、图1-9、图1-10、图1-11（8 个） | ✅ 8 个，全部 2026-10-30 20:31 生成 | ✅ 第 1 章 8 处 `<img src="图/…png">` |
| PIT逻辑结构、单重中断流程、生产者消费者、进程三态、轮转调度时间轴、死锁资源环、银行家安全性检查（7 个） | ❌ 无 PNG | — （第 2/3 章直接用 `.svg` 链接） |

PNG 全部被根 `.gitignore:13`（`**/图/*.png`）忽略，**8 个 PNG 一个都没进版本控制**——`课程/` 目录 38 个文件里只有 30 个被跟踪，差的就是这 8 个。

### 1.4 render.ps1 的 PNG 链路还在不在用

`课程/操作系统概论/图/render.ps1`（42 行）用 Chrome `--headless=new --force-device-scale-factor=2` 把同目录每个 `*.svg` 渲成同名 PNG（先删旧 PNG 再截，`render.ps1:24-25`），中间 HTML 写 `图/_render/`。

现状判定：

- 最后一次成功运行是 **2026-10-30 20:31:23–20:31:28**，产出 8 个 PNG（`图1-*`，SVG 源 mtime 20:30:52–20:31:18，紧跟其后）。另外 7 个 SVG 的 mtime 是 10-30 23:47:25 至 10-31 09:01:17，**全部晚于那次渲染**——不论它们是新增还是改动，这 7 个都没有对应 PNG。
- `图/_render/` 现在不存在（磁盘上搜不到该目录）。
- **站点构建根本不需要 PNG**：`hooks.py:48-49` 的逻辑是「引用的值是 `.png` 且同名 `.svg` 存在 → 换成 `.svg`」，8 个被引用的 PNG 都有同名 SVG，所以构建时读到的一直是 SVG，PNG 文件连打开都没发生。
- 结论：PNG 链路**已经死了但脚本还能跑**。删掉 8 个 PNG，`mkdocs build --strict` 依然成功（唯一后果：直接看 `第1章…_笔记.md` 原文时那 8 个 `<img>` 会裂图，因为渲染链只发生在钩子里）。
- 15 个 SVG 全都有 `width="整数" height="整数"`，`render.ps1:11-12` 的正则可以取到尺寸，脚本本身没有坏。

---

## 2. 站点/ 三分类表（122 文件 4.19 MB）

### 2.1 分类结果

判定依据统一为三条：① 是否被 `git ls-files` 跟踪；② `hooks.py` 是否向该路径写过；③ `git check-ignore -v` 是否命中站点内层忽略规则。

| 类别 | 文件数 | 体积 | 具体文件 | 判定依据 |
|---|---|---|---|---|
| **手写源** | 11 | 0.04 MB | `.gitignore`、`mkdocs.yml`、`requirements.txt`、`hooks.py`、`docs/index.md`、`docs/lab/scheduling.md`、`docs/assets/notes.css`、`docs/assets/interactions.js`、`docs/assets/favicon.svg`、`scripts/scheduling.mjs`、`scripts/test-scheduling.mjs` | 全部 11 个 = `git ls-files` 里 `站点/` 的全部内容；`hooks.py` 不向这些路径写 |
| **hooks.py 生成物** | 27 | 0.27 MB | `docs/chapters/chapter-1..6.md`（6）、`docs/computer-organization/chapter-1..6.md`（6）、`docs/assets/figures/{PIT逻辑结构,单重中断流程,进程三态,轮转调度时间轴,生产者消费者,死锁资源环,图1-1_,图1-3_,图1-6_,图1-7_,图1-8_,图1-9_,图1-10_,图1-11_,银行家安全性检查}.svg`（15） | 写入点 = `hooks.py:39/61`（chapters）、`hooks.py:40/50`（figures）、`hooks.py:64/73`（computer-organization）；15 个 SVG 与 `课程/操作系统概论/图/` 同名文件 **SHA-256 全等**（逐个比对，15/15 SAME）；被 `站点/.gitignore:6-8` 忽略 |
| **构建产物** | 79 | 3.55 MB | `dist/` 全树：页面 15（`index.html`、`404.html`、`chapters/*/index.html` ×6、`computer-organization/*/index.html` ×6、`lab/scheduling/index.html`）+ `search/search_index.json` 1 + `sitemap.xml` 与 `.gz` 2 + `assets/` 61（figures 15、`images/favicon.png` 1、`favicon.svg` 1、`interactions.js` 1、`notes.css` 1、`javascripts/bundle.d7400e89.min.js`+map 2、`javascripts/lunr/**` 34、`javascripts/workers/**` 2、`stylesheets/main|palette` 4） | mkdocs 从 `docs/` 编译产生；`site_dir: dist`（`mkdocs.yml:4`）；`站点/.gitignore:1` 忽略；审计开始时 79 个文件 mtime 全为 2026-10-31 21:36:39，今天被并行重建过（§2.2 备注），文件数/体积不变 |
| **历史残留** | 5 | 0.33 MB | `banker-diagram.png`、`chapter.png`、`homepage.png`、`mobile.png`、`__pycache__/hooks.cpython-312.pyc` | 4 个 PNG 被 `.gitignore:17`（`站点/*.png`）忽略且无跟踪；pycache 由 `站点/.gitignore:2` 忽略；四张 PNG 是已退役的 Astro 站点截图（见 §3） |

补充：`站点/` 122 个文件里被跟踪的只有 11 个，README:8 那张表给 `站点/` 打的「纳入版本控制 = 是」至少需要限定语。

### 2.2 dist 与 docs 是不是当前 mkdocs 的产物

**是。dist 是当前 mkdocs+当前 hooks 的产物，且内容与当前源等价。**五条硬证据：

1. **构建器指纹**：`dist/index.html:24` = `<meta name="generator" content="mkdocs-1.6.1, mkdocs-material-9.7.7">`，与 `站点/requirements.txt` 的三行钉版（mkdocs==1.6.1 / mkdocs-material==9.7.7 / pymdown-extensions==11.0.1）逐字对应。
2. **mkdocs 独有产物齐全**：`dist/sitemap.xml`（14 个 `<loc>`，= index + 6 章 + 6 章 + lab，与 `mkdocs.yml:31-47` nav 条数完全一致）、`dist/404.html`、`dist/search/search_index.json`（`"lang":["zh","en"]` 对齐 `mkdocs.yml:50`，237 条 location）、`sitemap.xml.gz`、`assets/stylesheets/main.*.min.css` + `palette.*.min.css`、`assets/javascripts/bundle.*.min.js` + `workers/search.*.min.js` —— 这套哈希命名文件是 mkdocs-material 的签名。
3. **hooks 的注入痕迹全在**：`dist/chapters/chapter-1/index.html` 里 `study-toolbar`、`data-chapter="1"`、`image-dialog`、`data-complete`、`data-reading-size`、`exercise-item/options/answer` 全部命中，且 `assets/figures/` 引用 8 处（= 第 1 章 8 张图）。
4. **逐页标题数对齐**：12 个页面的「md 里 `^## ` 行数」与「dist html 里 `<h2` 个数」**全部相等**（11/16/14/16/12/14 与 10/15/9/13/11/10），说明 dist 吃的就是今天这份 `docs/*.md`。
5. **源文件不会比 dist 更新**：以审计开始时的构建（21:36:39）为参照，被跟踪文件**没有一个晚于它**；`docs/assets/notes.css`、`interactions.js`、`favicon.svg` 与 `dist/assets/` 同名文件 SHA-256 相同。今天 10:49 那次重建同理——被跟踪文件在 10:41 之后没有再改动过（mtime 全部 ≤ 2026-10-31 21:36，实测逐个比对）。

唯一需要留意的口径：`docs/` 生成物 mtime 是 2026-11-01 10:43:23（比 `dist/` 晚），但内容哈希没变，属于重跑不改内容，不是「dist 过期」。**风险形态是**：只要改了 `课程/` 里的笔记，`dist/` 就会立刻落后，而 `dist/` 不在版本控制里、也没有任何检查提示它过期——本地预览会看到旧页面。

**备注：审计期间 `dist/` 被并行进程重建过。** 这是本次审计里唯一一个我没法给出稳定单一数字的对象，记录如下，供后续核对：

- 审计开始时（10:41–10:44）`dist/` 是 2026-10-31 21:36:39 的构建，`index.html` SHA-256 = `A182C536B3…`，与 `_整理/hashes.csv` 记录一致。
- 10:43:24 出现了另一份完整构建在 `_整理/_buildcheck/`（79 文件 3.55 MB，不是本次任务产物），其 `rel="canonical"` 指向 `https://studynote.chosenecho.dpdns.org/`（即 `esa-deploy/` 那套 EdgeOne 域名）。
- 10:49:42 `站点/dist/` 被重建；此后我又观察到它再一次被改写。两份构建**逐文件对比只差 site_url 带来的 5 个字节**（`https://chosenecho.github.io/os-study-notes/` 44 字符 vs `https://studynote.chosenecho.dpdns.org/` 39 字符）：`index.html` 26338↔26333、`404.html` 19387↔19012、`sitemap.xml` 2180↔2110，每页 html 差 5 字节，`assets/**` 完全相同。
- 结论不受影响：两种 canonical 变体都是**当前源 + 当前 mkdocs 版本**的产物（generator 相同、sitemap 14 个 `<loc>`、12 页 `<h2>` 数与 `docs/*.md` 的 `^## ` 数全等、`search_index.json` 的 `lang` 与 237 条记录一致）。差异只来自 `SITE_URL` 环境变量（`mkdocs.yml:3` 的 `!ENV` + `pages.yml:35`），不是源不一致。
- 这条同时说明另一个真实风险：**`dist/` 是多人/多任务共用的可写目录**，谁都能重建，且重建结果随 `SITE_URL` 变——`sitemap.xml` 的 `lastmod` 现在是 `2026-11-01`，与仓库里任何提交都对不上。

### 2.3 docs/ 是不是当前 hooks.py 的产物

**是，且只有 3 个目录是。** `docs/` 根下 5 个条目里：

- 生成：`docs/chapters/`（6）、`docs/computer-organization/`（6）、`docs/assets/figures/`（15）——恰好是 `hooks.py:39`、`hooks.py:64`、`hooks.py:40` 三个 `mkdir` 目标，没有多余文件、没有陈旧残留（figures 里 15 个文件与 `图/` 的 15 个 SVG 一一对应，没有已删 SVG 的孤儿副本）。
- 手写：`docs/index.md`、`docs/lab/scheduling.md`、`docs/assets/{notes.css,interactions.js,favicon.svg}`。

也就是说 `docs/` 是**手写源与生成物混居**的目录——这正是后面耦合表的根源。

### 2.4 docsify / astro 痕迹

| 检查项 | 结果 |
|---|---|
| 全库搜 `docsify` / `$docsify` / `_sidebar.md` | **0 命中**；磁盘上也没有任何 `_sidebar.md` |
| `dist/assets/javascripts/lunr/**`（34 个文件）算不算 docsify 痕迹 | **不算**。这是 mkdocs-material 自带的中文分词搜索（`lunr.zh.min.js`、`tinyseg.js`、`wordcut.js`）+ `workers/search.*.min.js`，与 docsify 无关。docsify 的特征是「无构建产物、靠 `docsify.min.js` + `_sidebar.md` 运行时渲染」，这里两者都没有，且有完整 mkdocs 构建产物 |
| astro 痕迹 | 磁盘上**无** `站点/.astro/`、无 `node_modules/`、无 `.astro` 组件、`dist` 里无 `/_astro/` 资产。但**历史与文本层面留着 4 处**：① 根 `.gitignore:9`（`站点/.astro/`）、`.gitignore:10`（`站点/.playwright-cli/`）；② `站点/.gitignore:3`（`.playwright-cli/`）、`:5`（`.astro/`）；③ `站点/docs/assets/interactions.js:3` 注释 `// 笔记网站/src/scripts/scheduling.mjs`、`:40` 注释 `// 笔记网站/src/scripts/scheduler.ts`、`:113` 注释 `// 笔记网站/migration-entry.ts`（`笔记网站/` 这个 Astro 工程已在 10-31 19:19 的 `69de56b Reorganize repo into 课程 / 站点 / 资产 / 归档` 里整体删除）；④ `站点/.gitignore:4`（`node_modules/`）与根 `.gitignore:6`——Node 现在只用于一个 `scripts/*.mjs` 测试，无 `package.json` |
| git 历史里的前身 | 首提交 `56d1acd` 的树是 Starlight/Astro：`笔记网站/astro.config.mjs`、`笔记网站/package.json`、`笔记网站/src/components/{NoteContent,Scheduler,StudyHome}.astro`、`笔记网站/scripts/{browser-smoke,ui-review}.cjs`，另有 `edgeone.json`、`esa.jsonc`（EdgeOne Pages 部署）。这三类东西现在**一个都不在磁盘上** |

---

## 3. 站点根 4 个 PNG 定性

四张图都未被任何 md / yml / html / 源码引用——全仓库 grep `banker-diagram|chapter\.png|homepage\.png|mobile\.png` 只命中 `_整理/{inventory,hashes}.csv` 两个审计中间产物，**0 处真实引用**；也都不被 git 跟踪（`.gitignore:17`）。mtime 全部落在 2026-10-31 09:02–09:08。

| 文件 | 体积 / 尺寸 | 内容 | 引用 | 判定 |
|---|---|---|---|---|
| `homepage.png` | 100,336 B / 1440×1000 | 退役首页：品牌「操作系统概论」（不是现在的「课程笔记」）、侧栏「章节笔记」只有 **01/02/03 三章**、「已复习 0/3 章」、三张卡片带「待复习」徽标、「开始阅读 →」按钮、青绿主色 | 0 | **过期，删**。三章 = 首提交时代只有第 1–3 章；`0836fc7` 提交信息就是 `Remove CSS for the retired homepage layout`，`notes.css` 里已无 `study-home/hero/course-card` 任何选择器，当前首页是 `docs/index.md`（58 行、两门课各 6 章 + 进度条） |
| `chapter.png` | 142,961 B / 1440×1000 | 退役章节页：第 2 章进程管理，右侧「本页内容」浮动目录、青绿高亮、「本章已复习 / 展开答案 / 收起答案」三按钮横排 | 0 | **过期，删**。现行 Material 布局是左侧 nav + 右侧 toc，复习控件在 `study-toolbar` 里且是「勾选 + 字号下拉」 |
| `mobile.png` | 35,389 B / 390×844 | 移动端调度实验页（同一青绿主题） | 0 | **过期，删**。只证明曾经的响应式效果，与当前 Material 主题无关 |
| `banker-diagram.png` | 59,738 B / 1440×1000 | 银行家算法安全性检查流程图，**带深色遮罩 + 「关闭 · Esc」按钮 + 底部题注「图3-2银行家算法安全性检查」**——是站点插图预览弹窗的整屏截图 | 0 | **过期，删** |

**`banker-diagram.png` 是不是 `课程/操作系统概论/图/银行家安全性检查.svg` 的位图版？** —— **是同一张图，但不是可用的位图版**。两者流程图结构逐节点一致（`Work = Available / 所有 Finish[i] = false` → 菱形「能否找到未完成且 Need[i] ≤ Work 的进程？」→ 是/否 → `Work = Work + Allocation[i] / Finish[i] = true` → 菱形「所有进程均已完成？」→ 安全/不安全，底部同一条 `Need 与 Work 逐资源比较…`）。但 `banker-diagram.png` 是**在站点弹窗里截的屏**：1440×1000 的浏览器视口、四周深色遮罩、右上角是 `hooks.py:60` 生成的关闭按钮、下方是 `interactions.js:205` 用 `img.alt` 填的题注。它既不是 `render.ps1` 的输出（那套是纯白底 2× 渲染、尺寸等于 SVG 的 2 倍），也从来没落在 `图/` 下（`图/` 里没有 `银行家安全性检查.png`）。若确实需要位图，正确做法是跑 `render.ps1` 得到 `图/银行家安全性检查.png`（1000×650 → 2000×1300），而不是把弹窗截图塞在 `站点/` 根。

---

## 4. 硬编码耦合表

### 4.1 路径与内容契约（一行一项）

严重度：**S1** = 构建直接失败；**S2** = 静默出错（页面/产物错但不报错）；**S3** = 仅文档/维护性问题。

| # | 移动 / 重命名什么 | 必须同时改哪个文件的哪一行 | 不改会怎样 | 级 |
|---|---|---|---|---|
| 1 | 把 `站点/` 挪出仓库根下一级（如 `站点/website/`） | `站点/hooks.py:7` `REPO = ROOT.parent`（ROOT 由 `:6` 从 `__file__` 推出） | `REPO` 变成 `站点/` 自己，`:8` 的 `COURSES` 指到 `站点/课程` → 找不到 | S1 |
| 2 | 重命名 `课程/` | `hooks.py:8` `COURSES = REPO / '课程'` | `:43`/`:67` 的 `next(...)` 抛 `StopIteration`，`--strict` 构建失败 | S1 |
| 3 | 重命名 `课程/操作系统概论/` | `hooks.py:9` `SOURCE = COURSES / '操作系统概论'` | 同 #2 | S1 |
| 4 | 重命名 `课程/计算机组成原理/` | `hooks.py:63` `composition_source = COURSES / '计算机组成原理'` | 同 #2 | S1 |
| 5 | 把 `hooks.py` 移到 `站点/scripts/` 之类 | `hooks.py:6` `ROOT = Path(__file__).resolve().parent`；`ROOT` 同时决定输出目录（`:38` `docs = ROOT / 'docs'`） | 生成物写到 `站点/scripts/docs/`，mkdocs 看不到 → nav 里 12 个 md 全 404 | S1 |
| 6 | 重命名 `站点/docs/chapters/` | `hooks.py:39` `(docs/'chapters').mkdir`、`:61` `docs/f'chapters/chapter-{n}.md'`，**且** `mkdocs.yml:33-38` 的 6 条 nav | 旧目录残留 + 新目录不在 nav → `--strict` 下 6 条 nav 指向不存在的 md，构建失败 | S1 |
| 7 | 重命名 `站点/docs/computer-organization/` | `hooks.py:64` `docs/'computer-organization'`、`:73`，**且** `mkdocs.yml:40-45` | 同上 | S1 |
| 8 | 改 `站点/docs/assets/figures/` 的名字 **或改章节 md 的输出深度** | `hooks.py:40`（mkdir）、`:50`（`shutil.copyfile` 目标）、`:56` 写死 `../../assets/figures/` | `../../` 是按「md 在 `docs/chapters/chapter-N.md` → 页面在 `/chapters/chapter-N/`」算出来的两级；改一层深度，12 页 15 张图全裂（构建不报错，静态资源 404） | S2 |
| 9 | 改 `mkdocs.yml:4` `site_dir: dist` | `.github/workflows/pages.yml:39` `path: 站点/dist`、根 `.gitignore:7`、`站点/.gitignore:1` | 工作流传空目录 → Pages 发布成空白站（`upload-pages-artifact` 不会因空目录失败） | S2 |
| 10 | 改 `站点/mkdocs.yml` 的文件名/位置 | `pages.yml:33` `-f 站点/mkdocs.yml`；`README.md:40`、`:48`、`:55` | CI 构建失败；README 三处命令失效 | S1/S3 |
| 11 | 改 `站点/requirements.txt` 的路径 | `pages.yml:27` `cache-dependency-path`、`pages.yml:30` `-r 站点/requirements.txt` | pip 找不到文件 → 构建失败；或缓存键失效（每次都冷装） | S1 |
| 12 | 重命名 `站点/` 整个目录 | `pages.yml:27/30/33/39`（4 处）+ `README.md:11/39/40/48/51/55/69/73/88/97`（10 处，逐行 grep `站点/` 得到）+ 根 `.gitignore:6/7/8/9/10/17`（6 处） | CI 全挂 + 文档全错 | S1 |
| 13 | 改章数（6 → 7，或某门课只写 5 章） | `hooks.py:42` 与 `:66` 两个 `range(1, 7)`；`mkdocs.yml:33-38/40-45`；`docs/assets/interactions.js:169` 的 `[1,2,3,4,5,6]`、`:175` 的 `["1"..."6"]`；`docs/index.md:42`、`:46` 的 `／ 6` | 第 7 章不生成（`range` 少一次）；或进度分母仍写 6、`第7章` 在 nav 里 404 | S1/S2 |
| 14 | 新增第三门课 | ① `hooks.py`（要复制一整段，见 4.2）；② `mkdocs.yml:30-47` nav；③ `docs/index.md`（卡片 + 6 条链接 + 进度条）；④ **`docs/assets/interactions.js:166` 的 `["os","co"]` 与 `:167` 的 `course === "os" ? "" : "co-"`**；⑤ **`站点/.gitignore:6-8`（新生成目录）** | 漏 ④：勾选能保存但首页进度永远 0（`.study-toolbar` 的 `data-chapter` 前缀匹配不上）；漏 ⑤：新目录的生成物被 `git add` 进仓库。**README:97 只提了 ①②③，漏了 ④⑤** | S2 |
| 15 | 改 `hooks.py:58` 的 `data-chapter="{n}"` 或 `:71` 的 `data-chapter="co-{n}"` | `interactions.js:167` 的 prefix 推导、`:169` 的计数过滤、`:145` 读 `toolbar.dataset.chapter` | 复习勾选写进 localStorage 的 key 与首页统计用的 key 不同 → 勾了不记账，无任何报错 | S2 |
| 16 | 调换 `hooks.py:60`（或 `:72`）对话框里两个元素的顺序 | `interactions.js:184` `dialog.querySelector("button")` | 位置选择器绑到第一个 `<button>`；顺序一变，关闭按钮失灵（Esc 仍可用，所以很难发现） | S2 |
| 17 | 改 `hooks.py:51` 的 `alt = m.group(1) or asset.stem` | `interactions.js:205` `dialog.querySelector("p").textContent = img.alt` | 预览弹窗题注变空或变成文件名 | S3 |
| 18 | 改 `notes.css` 里的 `.study-toolbar/.image-dialog/.exercise-*` 类名 | `hooks.py:58/60/71/72` 输出的 class 硬编码 | 无构建报错，UI 掉样式；本项已核对：hooks 输出的 8 个 class（`study-toolbar`、`reading-size`、`save-status`、`image-dialog`、`close-dialog`、`exercise-item`、`exercise-options`、`exercise-answer`）在 `notes.css`（164 行）里**全部**是真实选择器（依次出现 6/3/2/5/4/13/6/15 次）；反向也成立——`.figure-zoom` 由 `interactions.js:192` 运行时创建，不是孤儿样式 | S2 |
| 19 | 改 `docs/lab/scheduling.md` 的 DOM 契约（`[data-scheduler]`、`name="algorithm|quantum|arrival-N|burst-N"`） | `interactions.js:42`、`:48-57` | 实验页不跑或读错字段，无报错 | S2 |
| 20 | 改 `站点/scripts/scheduling.mjs` | **不需要改别的**；但**改了也只影响 Node 测试，站点不变** | 站点算法与测试算法是两份代码（见 4.3） | S2 |
| 21 | 改 `站点/docs/assets/interactions.js` 里的 `schedule()`（第 4-38 行） | 无（没有测试覆盖它） | `node 站点/scripts/test-scheduling.mjs` 依旧全绿，而线上算法已错——README:85-91 声称的「答案另用脚本核过一遍」对站点**不成立** | S2 |
| 22 | 删 `课程/操作系统概论/图/*.png`（8 个） | 理想情况下同步改 `第1章_操作系统简介_笔记.md:27/63/142/147/152/163/172/196` 的 `<img src="…png">` 为 `→ .svg` | 站点不受影响（`hooks.py:48-49` 换 svg）；只有直接读原始 md 的人会看到裂图 | S3 |
| 23 | 删 `课程/操作系统概论/图/render.ps1` | `README.md:75-81` 整节「插图重渲染」 | 文档描述一个不存在的脚本 | S3 |
| 24 | `hooks.py:69` 的 `re.sub(r'\[([^\]]+)\]\(教材/chapters/[^)]+\)', …)` | 现在两门课笔记里 **0 处**匹配（实测 grep） | 死代码；它唯一的用途是当年笔记直链 `资产/教材/…/chapters/*.md` 时把链接降级成纯文本（因为 `资产/` 不进仓库、链出去是死链）。现在删掉无副作用 | S3 |
| 25 | 移动/重命名 `资产/` 下任何子目录 | `课程/操作系统概论/README.md:33`、`:35`；`课程/计算机组成原理/README.md:16`、`:17`、`:42`（5 条 `资产/…` 路径） | 构建不受影响（钩子不读 `资产/`），但两门课的课程 README 出现死链 | S3 |
| 26 | 移动 `esa-deploy/` | 无任何文件引用它（全库 grep 0 命中） | 唯一影响是 `git status` 少一行 `?? esa-deploy/` | S3 |

### 4.2 hooks.py 两个 for 循环的复制粘贴结构

| 段 | 行 | 对 操作系统概论 | 对 计算机组成原理 | 差异 |
|---|---|---|---|---|
| 目录准备 | `:38-41` | `docs/chapters`、`docs/assets/figures` | — | 只有 OS 建 figures |
| 循环 1 | `:42-61` | 6 章：读笔记 → 重写图片引用（含 `../../assets/figures/`）→ 插 toolbar → `format_exercises` → 写 `chapters/chapter-N.md` | — | 独有 `image()`（`:45-57`）与 `format_exercises` |
| 循环 2 | `:63-73` | — | 6 章：读笔记 → 正则去掉 `教材/chapters` 链接（`:69`）→ 插 toolbar（前缀 `co-`）→ `format_exercises` → 写 `computer-organization/chapter-N.md` | 无图片逻辑；toolbar 多一个 `co-` 前缀 |

后果：加第三门课不是「照着补一段」这么简单——两个循环里 `range(1, 7)`、输出目录名、`co-` 前缀、是否复制图、是否改写 `<img>`，共 5 个差异点散在 30 行里，README:97 把这描述成「照着现有两门课补一段」。

两个 `next()`（`:43`、`:67`）都**没有排序也没有唯一性检查**：放进一个 `第1章_…_笔记 - 副本.md` 就会静默取到不确定的那个（NTFS 枚举顺序），症状是「改了半天没生效」。

### 4.3 同一套调度算法存在两份实现

| 位置 | 用途 | 谁在跑 |
|---|---|---|
| `站点/docs/assets/interactions.js:4-38`（`function schedule`，注释 `// 笔记网站/src/scripts/scheduling.mjs`） | 浏览器端，经 `extra_javascript`（`mkdocs.yml:68-69`）打进 `dist/assets/interactions.js` | 站点访客 |
| `站点/scripts/scheduling.mjs:2-35`（`export function schedule`） | Node 侧测试 | 只有 `scripts/test-scheduling.mjs` |

两份逻辑目前**逐行等价**（转译差异：双引号、`\uXXXX` 转义、`if/else` 写成三元），但没有任何机制保证它们同步；测试只 import `./scheduling.mjs`。这是「测试全绿 ≠ 站点正确」的典型结构。

### 4.4 站点/.gitignore 与根 .gitignore：重叠与矛盾

**重叠（同一规则写两遍，实测 5 组全部由站点内层胜出）** —— `git check-ignore -v --no-index` 逐条验证：

| 规则 | 根 `.gitignore` | `站点/.gitignore` | 实测生效方 |
|---|---|---|---|
| dist | `:7` `站点/dist/` | `:1` `dist/` | `站点/.gitignore:1` |
| __pycache__ | `:8` `站点/__pycache__/` | `:2` `__pycache__/` | `站点/.gitignore:2` |
| .playwright-cli | `:10` `站点/.playwright-cli/` | `:3` `.playwright-cli/` | `站点/.gitignore:3` |
| node_modules | `:6` `站点/node_modules/` | `:4` `node_modules/` | `站点/.gitignore:4` |
| .astro | `:9` `站点/.astro/` | `:5` `.astro/` | `站点/.gitignore:5` |

深层 `.gitignore` 优先，所以根那 5 行**目前在起作用的概率为零**——它们只在「`站点/.gitignore` 被删/被改名」时才生效。这种写法最坏的结果不是多写，而是：改根那 5 行的人会以为改动生效了。

**矛盾 1：`站点/.gitignore:1` 的 `dist/` 没锚定。** 实测 `站点/docs/dist/x.html` 被 `站点/.gitignore:1` 忽略，而根 `.gitignore:7` 的 `站点/dist/` 不会。也就是说内层规则的实际覆盖范围比字面意思大一层，一旦有人在 `docs/` 下建 `dist/`（或用 `docs_dir: dist` 之类的另类布局），会被无声忽略。

**矛盾 2：生成物清单靠人工镜像。** `站点/.gitignore:6-8` 逐条列了 `docs/chapters/`、`docs/computer-organization/`、`docs/assets/figures/`，而这三项正是 `hooks.py:39`、`:64`、`:40` 的三个 mkdir 目标。`hooks.py` 一旦多写一个目录（加课就是这种情况），`.gitignore` 不会跟着变 → 生成物进仓库。

**矛盾 3：根 `.gitignore:17` 的 `站点/*.png` 只覆盖一层。** 4 张截图被挡住了，但把截图放到 `站点/docs/lab/shot.png` 就不会被忽略（`站点/.gitignore` 也没有 png 规则）。而 `docs/` 下真正常见的 png 位置（`docs/assets/figures/`）恰好被 `:8` 挡住，纯属巧合。

**矛盾 4：孤儿规则。** 根 `.gitignore:20` `_整理计划.md` 指向一个已不存在的文件（该文件在提交 `9b55011 Fix .gitignore encoding; untrack plan doc` 后消失）；根 `.gitignore:6/9/10` 与 `站点/.gitignore:3/4/5` 指向四种已不存在的目录形态（Astro/Playwright/Node 时代）。

**缺口：** `_整理/`（本次审计目录）和 `esa-deploy/`（37 文件 14.06 MB）都不在任何忽略规则里，所以 `git status` 会一直带着这两行未跟踪记录。

---

## 5. 资产/ 现状

### 5.1 目录构成（530 文件 113.03 MB，另有 `.git` 64 文件 0.74 MB）

| 路径 | 文件数 | 体积 | 内容 |
|---|---|---|---|
| `资产/教材/操作系统概论/` | 150 | 14.02 MB | `操作系统概论（2017年版）.{epub,pdf,md,print.html}`（epub 13.42 MB / pdf 16.02 MB / md 497 KB / html 864 KB）+ `images/` 143 张 jpg（`fig_001.jpg` …，14.02 MB）+ `构建报告.md`、`校对报告.md`、`读我.md` |
| `资产/教材/计算机组成原理/` | 372 | 30.05 MB | 见 5.3 |
| `资产/真题/操作系统概论/` | 4 | 5.47 MB | `操作系统概论202410真题.pdf`、`操作系统概论202504真题.pdf`、`第1章时间周期真题.pdf`、`PV信号量练习题_第2章操作系统概论.docx` |
| `资产/真题/计算机组成原理/` | 3 | 3.76 MB | `计算机组成原理202410真题.pdf`、`计算机组成原理202504真题.pdf`、`第一章自测卷_计算机组成原理.docx` |
| `资产/.gitignore` | 1 | — | 15 行 = 1 条注释 + 14 条规则，只让 `.md` 入库：`:2-12` 逐个扩展名挡掉 `*.pdf/*.docx/*.epub/*.png/*.jpg/*.jpeg/*.html/*.csv/*.json/*.txt/*.doc`，`:13` `assets/figures/`、`:14` `assets/tables/`、`:15` `教材/计算机组成原理/assets/`（`:14` 是 `:13` 之外的必要补充，`:15` 与 `:13`+`:14` 完全重复） |

### 5.2 旧版笔记备份_20261031：磁盘上已经不在

- `资产/旧版笔记备份_20261031/` **磁盘上不存在**（`Test-Path` 为假，全盘按 `*备份*` 搜目录 0 命中）。
- `资产/.git` 的索引里**仍有 3 条记录**，`git status` 报 3 个 ` D`（工作区删除、未暂存）：

| # | D 条目（仍是 tracked 状态） |
|---|---|
| 1 | `旧版笔记备份_20261031/第1章_计算机系统概论_笔记.md` |
| 2 | `旧版笔记备份_20261031/第2章_数据的表示与运算_笔记.md` |
| 3 | `旧版笔记备份_20261031/第3章_存储系统_笔记.md` |

这 3 份是**计算机组成原理的旧版草稿**，章名与现行版不同（旧「计算机系统概论 / 数据的表示与运算 / 存储系统」vs 现行 `第1章_计算机系统概述` / `第2章_数据的表示和运算` / `第5章_存储器层次结构`），也印证了 `课程/计算机组成原理/README.md:42` 的说法「旧第三章题名为存储系统，与本书第三章不同；本套存储内容放第五章」。**内容只存在于 `资产/.git` 对象库**——删掉 `资产/.git` 就彻底没有（详细取证与 bundle 方案属 task-4）。

`课程/计算机组成原理/README.md:42` 现在指向一个不存在的目录，是本次审计发现的最硬的一处死链。

### 5.3 教材/计算机组成原理 的 chapters / index / figures / tables 关系

这是一条 OCR 复原流水线（`README_制作说明.md`）的产物，四者是「成品 → 拆分 → 素材 → 机读账本」的关系：

| 目录 | 数量 | 角色 | 与其它目录的关系 |
|---|---|---|---|
| `book.md` | 671 KB | **母版**（一切格式由它生成） | `chapters/*.md` 是它的按章切分；pdf/docx/epub/html 由它 pandoc 转出 |
| `chapters/` | 20 个 md | 按章/按前言后记切分的正文（`00_第一部分…` 到 `19_后记`） | 20 个中只有 `11_`–`16_` 是六章正文，是笔记的对读对象 |
| `assets/figures/` | 271 个文件 22.0 MB | 从原图裁出的插图 | 被 `book.md` 与 `chapters/*.md` 以相对路径引用 |
| `assets/tables/` | 59 个文件 8.1 MB | 复杂表格按原图贴入（合并单元格无法 Markdown 化） | 同上 |
| `index/` | 9 个文件 | 机读账本：`figures.csv`（图题↔图文件）、`pages.csv`（每面字数/来源照片）、`photo_to_page.csv`、`pages_text.json`(692 KB)、`page_audit.json`、`dropped_lines.json`、`risky_paragraphs.json`、`sentence_ends.json`、`bleed_pages.json` | 记录 figures/tables 的出处，用于校对而不是渲染 |

`资产/.git` 只跟踪 34 个文件：`.gitignore` 1 + 教材根目录 md 10（操作系统概论 4：教材 .md、构建报告、校对报告、读我；计算机组成原理 6：book.md、README_制作说明、审核报告_全量、报告_缺页与页码对照、补拍处理结果、逐页校对报告）+ `chapters/` 20 + 已删备份 3。figures/tables/index 与所有 pdf/docx/epub 均不入库。

顺带发现 `README_制作说明.md` 的成品清单与磁盘有偏差（同属「文档与现实不符」，但文件不在我的核对清单里，仅记录）：称 figures 214 张 / 表格 53 张，磁盘 271 / 59；称 pdf 10 MB、docx 19 MB、epub 19 MB、html 750 KB、book.md 683 KB，磁盘为 7.5 / 9.2 / 9.2 MB、797 KB、656 KB。

---

## 6. README 与现实不符清单

行号以当前 `README.md`（99 行）为准。

| # | README 行 | 原文要点 | 现实 |
|---|---|---|---|
| 1 | `7-14` | 目录表逐行列出 `课程/ 站点/ 资产/ 归档/ .github/` | 表里缺 `esa-deploy/`（37 文件 14.06 MB，`git status` 里明晃晃一行 `?? esa-deploy/`）与 `_整理/`。**交接给下一个人时最先被问的就是「esa-deploy 是什么」** |
| 2 | `9`、`10`、`11` | 「纳入版本控制 = 是」 | 三个目录都不是字面意义的「整目录入库」：`课程/` 38 文件只 30 个被跟踪（8 个 PNG 被忽略）；`站点/` 122 文件只 11 个被跟踪；`课程/计算机组成原理/` 完全没有 `图/` |
| 3 | `12` | `资产/` = 「教材、真题、旧版笔记备份」 | `旧版笔记备份_20261031` **磁盘上已不存在**，只剩 `资产/.git` 里 3 个 D 条目 |
| 4 | `16` | 「`资产/` 和 `归档/` 占地方，又不该发布，已写进 `.gitignore`」 | 忽略属实（根 `:2`、`:3`），但没写出来的是：两者**各自还有一个独立 `.git`**（`资产/.git`、`归档/.git`，另有 `归档/数据结构/.git`）。所以它们不是「纯本地杂物」，而是「根仓库看不见的第二套版本控制」——`git status` 看不到它们的脏状态 |
| 5 | `3` | 「笔记是唯一需要维护的东西；站点每次构建都从笔记重新生成，不手工编辑」 | 与 `站点/docs/` 的现状冲突：`docs/index.md`（58 行，13 个手写章节链接 + 两块进度条）和 `docs/lab/scheduling.md`（18 行手写 HTML 表单）**就在 docs/ 里手写维护**，且 `interactions.js`/`notes.css` 也是手写源。真正的「生成物」只有 3 个目录 |
| 6 | `30` | 「站点上放了两门课全部十二章」 | 属实（nav 12 条、sitemap 14 个 URL、12 个页面标题数与源一致） |
| 7 | `51` | 「产物在 `站点/dist/`」 | 路径属实，但 `dist/` 是「谁都能重建的目录」：审计开始时它是 2026-10-31 21:36:39 的构建，今天 10:43 与 10:49 被并行进程重建两次（只随 `SITE_URL` 变 canonical）。没有任何机制提醒 dist 过期——改笔记后本地看到旧页面是常态（§2.2 备注） |
| 8 | `67` | 「插图放课程的 `图/` 目录」 | 只对操作系统概论成立；计算机组成原理没有 `图/`，也没有一处图片引用，`hooks.py:63-73` 那段分支**根本没有复制图的代码** |
| 9 | `69` | 「把相对路径的插图复制到 `站点/docs/assets/figures/`（同名 `.png` 会优先换成 `.svg`）」 | 方向说反了容易误读：实际规则是「**引用的是 `.png` 且同名 `.svg` 存在**才换成 `.svg`」（`hooks.py:48-49`）。而且复制范围是 `图/` 里**全部 15 个 SVG**（`hooks.py:50` 无条件 copy），不止被引用的那些 |
| 10 | `73` | 「`docs/chapters/`、`docs/computer-organization/`、`docs/assets/figures/` 都是钩子生成的，不进版本控制」 | 三个目录判断正确。但那句话掩盖了「手写源和生成物同住 `docs/`」这个事实，而 `.gitignore` 的生成物清单是**手工镜像** `hooks.py` 的三处 mkdir——加课就失配（见 4.4 矛盾 2） |
| 11 | `75-81` | 「插图重渲染：`render.ps1` 用 Chrome 无头把 SVG 转成 PNG，输出同目录，中间文件写 `图/_render/`（已忽略）」 | 脚本存在且行为属实，但**这条链对站点已经无用**：8 个 PNG 全被忽略、全不被构建读取，且只有 8/15 个 SVG 有 PNG（最后一次渲染 2026-10-30 20:31，之后 7 个 SVG 再没渲过）；`图/_render/` 现在不存在 |
| 12 | `85-91` | 「调度实验的答案另用脚本核过一遍…`node 站点/scripts/test-scheduling.mjs`」 | 脚本存在，但只覆盖 `scripts/scheduling.mjs`；浏览器跑的是 `docs/assets/interactions.js:4-38` 里的**另一份拷贝**，测试对它零覆盖（4.3） |
| 13 | `95` | 「文件名要匹配 `第N章*_笔记.md`，否则钩子找不到」 | 属实（12/12 唯一命中），但没提反方向的坑：多一个匹配文件（如 `- 副本.md`）时 `hooks.py:43/:67` 的 `next()` 会**静默**取其中一个 |
| 14 | `97` | 「在 `站点/hooks.py` 里照着现有两门课补一段同步逻辑，`站点/mkdocs.yml` 的 nav 加条目，`站点/docs/index.md` 加上课程卡片和章节链接」 | **漏两项**：`docs/assets/interactions.js:166-167`（课程码列表与 `co-` 前缀，漏了首页进度永远是 0）；`站点/.gitignore:6-8`（新生成目录，漏了新生成物被提交） |
| 15 | `39-40`、`48`、`55`、`63` | 命令与环境（Python ≥3.10、`-f 站点/mkdocs.yml`、`--strict`、`SITE_URL` 环境变量） | 全部与 `pages.yml:25/27/30/33/35` 一致（3.12、4 处路径、SITE_URL）。`__pycache__/hooks.cpython-312.pyc` 也印证本地是 3.12。**这一组无需修改** |
| 16 | `99` | 「教材和真题放 `资产/`，别放进 `课程/`。那里的东西会被提交进仓库」 | 结论对（`课程/` 会被提交），但措辞容易读成「`资产/` 里的东西会被提交」；实际 `资产/` 整目录被忽略、内层只跟踪 34 个 md |

无问题的部分也点一下，避免误伤：`28`/`63` 的站点地址与 `mkdocs.yml:3`、`pages.yml:35` 三处一致；`24` 两个课程 README 链接都存在；`32` 的调度实验页确实在 `docs/lab/scheduling.md`。

---

## 7. 目标结构与精确改动点

### 7.1 目标结构（`课程/` `站点/` `资产/`）

原则：**手写源与生成物物理分离**，`docs/` 变成 100% 派生目录；课程清单从「复制粘贴两段代码」变成「一张表」。

```
学习资料/
├─ 课程/                        ← 唯一内容源（手写）
│  ├─ 操作系统概论/{README.md, 第1..6章_*_笔记.md, 图/*.svg}
│  └─ 计算机组成原理/{README.md, 第1..6章_*_笔记.md}
├─ 站点/                        ← 只放构建入口
│  ├─ mkdocs.yml  requirements.txt  hooks.py  .gitignore
│  ├─ src/                      ← 手写站点源（唯一手写位置）
│  │  ├─ index.md
│  │  ├─ lab/scheduling.md
│  │  └─ assets/{notes.css, interactions.js, favicon.svg}
│  ├─ scripts/{scheduling.mjs, test-scheduling.mjs}
│  ├─ docs/                     ← 全量生成（.gitignore 整目录）
│  └─ dist/                     ← 构建产物（.gitignore 整目录）
├─ .github/workflows/pages.yml
├─ .gitignore  README.md
└─ （资产/、归档/、esa-deploy/ 移出仓库根 → task-1/3/4）
```

`资产/` 的目标（本任务只给建议，不动手）：要么整体移出 `学习资料/` 变成同级目录 `D:\学习资料资产\`，要么保留但把内层 `.git` 退役成普通目录（task-4 给 bundle 方案）。**只要它还留在仓库根，根 README 就必须交代它自带 `.git` 这件事。**

### 7.2 改动点（文件:行号 → 新内容）

**A. `站点/hooks.py`**

| 位置 | 现状 | 改为 |
|---|---|---|
| `:6-9` | `ROOT / REPO / COURSES / SOURCE` 四个常量 | 见下方代码块：保留 `ROOT/REPO/COURSES`，删 `SOURCE`，加 `SRC`/`DOCS`/`COURSE_SPECS` |
| `:37-41` | `docs = ROOT/'docs'` + 两处 mkdir | 先 `shutil.rmtree(DOCS)`（存在时）再 `shutil.copytree(SRC, DOCS)`，然后按 `COURSE_SPECS` 建目录：`docs/` 变成整目录派生（这一步是「把 docs 从混居改成纯派生」的关键，也是 `.gitignore` 能收成一条 `/docs/` 的前提） |
| `:42-61` | 操作系统概论专用循环 | 交由通用循环处理 |
| `:63-73` | 计算机组成原理专用循环（含死正则 `:69`） | 删除，由通用循环覆盖；`教材/chapters` 降级正则可保留为可选开关，否则删 |

```python
ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
COURSES = REPO / '课程'
SRC = ROOT / 'src'          # 手写站点源
DOCS = ROOT / 'docs'        # 全量派生

COURSE_SPECS = (
    {'dir': '操作系统概论',   'out': 'chapters',               'prefix': '',     'figures': True,  'chapters': 6},
    {'dir': '计算机组成原理', 'out': 'computer-organization', 'prefix': 'co-',  'figures': False, 'chapters': 6},
)


def on_pre_build(config):
    if DOCS.exists():
        shutil.rmtree(DOCS)
    shutil.copytree(SRC, DOCS)          # 手写源 → docs
    for spec in COURSE_SPECS:
        source = COURSES / spec['dir']
        out = DOCS / spec['out']
        out.mkdir(parents=True, exist_ok=True)
        figures = DOCS / 'assets/figures'
        if spec['figures']:
            figures.mkdir(parents=True, exist_ok=True)
        for n in range(1, spec['chapters'] + 1):
            matches = sorted(source.glob(f'第{n}章*_笔记.md'))
            if len(matches) != 1:                       # 修 #6：唯一性检查
                raise SystemExit(f'{spec["dir"]} 第{n}章的笔记应恰好 1 个，实得 {len(matches)}')
            text = matches[0].read_text(encoding='utf-8')
            if spec['figures']:
                text = rewrite_images(text, source, figures)      # 现 :45-57
            text = re.sub(r'\[([^\]]+)\]\(教材/chapters/[^)]+\)', r'\1', text)
            title, body = text.split('\n', 1)
            (out / f'chapter-{n}.md').write_text(
                title + '\n\n' + toolbar(n, spec['prefix']) + '\n\n'
                + format_exercises(body.strip()) + '\n\n' + DIALOG,
                encoding='utf-8')
```

配套：`toolbar(n, prefix)` 把现 `:58`/`:71` 两份 f-string 合成一处；`rewrite_images` 里的 `../../assets/figures/`（现 `:56`）保持不动（`docs/<out>/chapter-N.md` 仍是两级深）。

**B. `站点/mkdocs.yml`**

| 位置 | 改动 |
|---|---|
| `:4` | `site_dir: dist` 保留；**新增一行** `docs_dir: docs`（显式声明，别依赖默认推断） |
| `:30-47` | nav 保持不动（mkdocs 不支持钩子生成 nav）。若采纳表驱动课程，加一条 CI 断言即可（见 D） |
| `:66-69` | `assets/notes.css`、`assets/interactions.js` 不变（`src/assets/` 会被复制到 `docs/assets/`） |

**C. `站点/.gitignore`（8 行 → 4 行）**

```gitignore
/dist/
/docs/
/__pycache__/
/scripts/node_modules/
```

:1 `dist/` → `/dist/`（锚定，消除 4.4 矛盾 1）；:6-8 三行合并成 `/docs/`；:3 `.playwright-cli/`、:5 `.astro/` 删除（无对应目录）。

**D. 根 `.gitignore`（20 行 → 15 行：9 条规则 + 注释空行）**

```gitignore
# 本地大件资产（迁移前暂留）
资产/
归档/
esa-deploy/
_整理/

# 站点产物：详细规则见 站点/.gitignore
站点/dist/

# 插图：只保留 SVG 源成品与渲染脚本；PNG 是 render.ps1 的产物
**/图/*.png
**/图/_render/

# 站点截图（本地预览用，非发布内容）
站点/**/*.png
```

删除 `:6-10`（与 `站点/.gitignore:1-5` 完全重复且被深层规则遮蔽，实测）；`:17` `站点/*.png` → `站点/**/*.png`（补 4.4 矛盾 3 的缺口）；`:20` `_整理计划.md` → `_整理/`（原文件已不存在）。若采纳 7.1 的目标结构，`**/图/*.png` 与 `**/图/_render/` 也可一并删除（那时 PNG 链路已退役）。

**E. `站点/docs/assets/interactions.js`**

| 位置 | 现状 | 改为 |
|---|---|---|
| `:3`、`:40`、`:113` | 注释指向已删除的 `笔记网站/…` | 改成 `站点/docs/assets/interactions.js`（注释里别再指死路径） |
| `:161-165` | `[data-progress-chapter]` 徽标逻辑 | 当前**无任何页面产出该属性**（全库 grep 只命中本文件）→ 删；或恢复首页卡片徽标 |
| `:166-172` | `for (const course of ["os","co"])` + `course === "os" ? "" : "co-"` + `[1,2,3,4,5,6]` | 改为按 DOM 反推课程码，份数用 `<progress max>`：见下 |
| `:173-180` | `[data-next-chapter]` / `[data-next-label]` | 同样**无任何页面产出**（那是退役首页「开始阅读 →」按钮的残留）→ 删 |

```js
// 替换 :166-172
for (const el of document.querySelectorAll("[data-progress-count]")) {
  const course = el.dataset.progressCount;
  const prefix = course === "os" ? "" : `${course}-`;   // 唯一还要写死的一条
  const pattern = new RegExp(`^${prefix}\\d+$`);        // 注意不能用 startsWith("")，那会把另一门课的 id 也算进来
  const done = readProgress().filter((id) => pattern.test(id)).length;
  el.textContent = String(done);
  const bar = document.querySelector(`[data-study-progress="${course}"]`);
  if (bar) bar.value = done;                            // 分母由 <progress max> 决定
}
```

这样「加课」只需要动 `hooks.py` 的 `COURSE_SPECS` + `mkdocs.yml` nav + `docs/index.md`；`interactions.js` 与 `.gitignore` 不用再改（prefix 规则可进一步用 `hooks.py` 输出的 `data-chapter` 反查省略）。

**F. 退役与清理（不含 ticket 外的仓库改动，仅建议）**

| 对象 | 动作 | 依据 |
|---|---|---|
| `站点/{banker-diagram,chapter,homepage,mobile}.png` | 删除 | 无引用、未跟踪、布局已退役（§3） |
| `站点/__pycache__/` | 删除 | `hooks.cpython-312.pyc`，`.gitignore` 已挡 |
| `课程/操作系统概论/图/*.png`（8） | 先把 `第1章…_笔记.md:27/63/142/147/152/163/172/196` 的 `.png` 改 `.svg`，再删 PNG；随后连 `render.ps1` 一起退役 | PNG 对构建零贡献（§1.4） |
| `站点/dist/` | 保留（本地预览）或删（CI 重建）；无论哪种，README:51 后加一句「dist 不随笔记自动更新」 | §2.2 风险 |
| `esa-deploy/`、`_整理/` | 移出仓库根，或进 `.gitignore` | 见 D 段 |

**G. 建议加一条 CI 断言（防 §4 的静默错）**

`.github/workflows/pages.yml` 在 `:33` 构建前插入一步（或用 pre-commit），成本极低、能挡住 4.4 矛盾 2 与 4.2 的复制粘贴失配：

```yaml
      - name: Coupling guards
        run: |
          python - <<'PY'
          import re, pathlib, sys
          root = pathlib.Path('.')
          hooks = (root/'站点/hooks.py').read_text(encoding='utf-8')
          nav   = (root/'站点/mkdocs.yml').read_text(encoding='utf-8')
          specs = len(re.findall(r"'dir':", hooks))
          pages = len(re.findall(r'^\s+- .*\.md\s*$', nav, re.M))
          assert specs == 2, f'COURSE_SPECS={specs}，mkdocs nav 需同步'
          assert pages >= 12, f'nav 条目 {pages} 少于 12'
          PY
      - name: Generated tree must be ignored
        run: test -z "$(git status --porcelain 站点/docs 站点/dist)"
```

---

## 8. 结论与风险排序

1. **`站点/docs/` 是手写与生成的混居目录**（11 个手写 + 27 个生成 + 79 个构建产物 + 5 个残留，122 文件里只 11 个入库）。这是所有忽略规则重复/矛盾的根因：内层 `.gitignore` 被迫手工镜像 `hooks.py` 的三个 mkdir，加课必失配。
2. **加一门课实际要改 5 个文件**（`hooks.py`、`mkdocs.yml`、`docs/index.md`、`interactions.js:166-167`、`站点/.gitignore:6-8`），README:97 只说了 3 个。漏 `interactions.js` 的症状是「勾选能存、首页进度永远 0」，不报错。
3. **两门课 30 行逻辑被复制成两份**（`hooks.py:42-61` vs `:63-73`），5 个差异点靠人脑记；两个 `next()` 无唯一性检查，副本文件会静默取胜。
4. **调度算法有两份实现**，测试只覆盖 Node 那份，站点那份无人测（4.3）。
5. **Astro 时代的残留分散在 6 处**：4 张截图（站点根）、`interactions.js:3/40/113` 三行指向已删路径的注释、`interactions.js:161-180` 两段死代码、根 `.gitignore:9/10` 与 `站点/.gitignore:3/5` 四行规则、`.gitignore:6`/`站点/.gitignore:4` 两行 node_modules。代码层面的残留比文件层面的更容易被当成「还在用」。
6. **构建产物本身是健康的**：dist 与当前源逐页对齐（12 页标题数全等、14 个 sitemap URL、generator = mkdocs-1.6.1 / material-9.7.7），今天重跑 hooks 内容哈希不变。真正缺的不是重建，而是**重建的提示**。
7. **`dist/` 是一个无主的共享可写目录**：审计期间被并行进程重建两次，且结果随 `SITE_URL` 变（`站点/dist` 与 `_整理/_buildcheck` 只差 canonical 的 5 字节）。同一时刻两份「都正确」的产物并存，说明「哪份是对外发布的」这件事现在没有任何记录——`sitemap.xml` 的 `lastmod` 已经是 `2026-11-01`，与仓库里最后一次提交（10-31 21:39）对不上。
