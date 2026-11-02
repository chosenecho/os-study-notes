# 学习资料

自学考试课程的笔记，以及从笔记生成的文档站。手写的东西只有三样：课程笔记、站点源、构建钩子；其余全是生成物或本地资料。

## 目录

| 路径 | 内容 | 纳入版本控制 |
|---|---|---|
| `课程/` | 两门课各六章笔记；插图只有操作系统概论有（`图/`，15 张 SVG），计算机组成原理没有 `图/`，见下文「改笔记」 | 是（31 / 31） |
| `站点/src/` | 手写站点源：`index.md`、`lab/scheduling.md`、`assets/{notes.css,interactions.js,math.js,favicon.svg}`、`_headers`、`robots.txt` | 是 |
| `站点/src/assets/katex/` | **vendored 第三方**：KaTeX 0.16.11，24 文件共 563 KB（`katex.min.js` 275 KB + `katex.min.css` 23 KB + `auto-render.min.js` + 20 个 woff2 + `LICENSE`）。不是手写；版本、来源与升级方式见 `站点/assets-katex-README.md` | 是 |
| `站点/{mkdocs.yml,hooks.py,requirements.txt,overrides/,scripts/}` | 构建入口、构建钩子、主题覆盖（404 页）、调度自测脚本 | 是 |
| `站点/docs/`、`站点/dist/` | 构建期生成物与最终产物，**每次构建整目录重建**（`docs/` 只保留一个 0 字节哨兵 `.gitkeep`） | 否 |
| `qa/` | 站点质量审计：脚本、报告、逐轮记录。`scripts/` 是能跑的检查，`reports/` 是逐设备报告，`rounds/` 是历次上线记录 | 是（89 / 2546；`artifacts/`、`r2/`、`r3/`、`r4/_scratch/` 的截图与原始 JSON 不入库） |
| `资料/` | 教材（含 OCR 复原本）、历年真题 | 否，仅本地 |
| `归档/` | 其他科目，三层：`自考/`（5 门）、`NCRE/`（24 个科目 + `安装包/`）、`校课/`；另有 `_第三方快照/`、`_待归类/` | 否，仅本地（331 个文件，不含 `数据结构-13181/.git`） |

`资料/` 与 `归档/` 占地方又不该发布，已写进 `.gitignore`；它们**不再各自带独立的 `.git`**（2026-11-01 整理时退役，快照见 `Documents\_备份\git-bundle-20261101\`）。唯一还带独立仓库的是 `归档/自考/数据结构-13181/`，它有自己的远端 `data-structure-13181`。

原来的 `esa-deploy/`（部署实验与探针脚本，移出时 39 个文件 / 14.2 MB，现 36 个 / 9.3 MB）已整体移出到 `Documents\studynote-deploy\`：那批文件里有源站 IP、account id 和一个待吊销的明文 Cloudflare token，而本仓库挂着公开远端。`qa/scripts/delivery_net.py` 会先找仓库内、再找那个外部目录，坏不掉。

### 东西该放哪

| 判据 | 放哪 |
|---|---|
| 要发布、要 review、要跨设备同步 | 仓库内（`课程/`、`站点/src/`、`qa/`） |
| 教材、真题、扫描件（大，不发布） | `资料/` |
| 已考完 / 别人的资料 / 一次性下载 | `归档/` |
| 部署、运维、一次性实验 | **不放这个仓库**，放 `Documents\studynote-deploy\` 之类的外部目录 |

根目录只允许出现上面表里的条目。新增任何东西先回答两句：它属于哪一类，它进不进版本控制。两个都不回答，就会变成下一个 `esa-deploy/`。

## 两门课

操作系统概论的笔记依据《操作系统概论（2017 年版）》和书前的自考大纲整理，六章覆盖操作系统简介、进程管理、进程调度与死锁、内存管理、文件系统、I/O 设备管理。

计算机组成原理的笔记依据袁春风《计算机组成原理》（2016 年版）及配套大纲，六章从计算机系统概述一路讲到互连及输入输出组织。

两门课的入口在各自的 README：[操作系统概论](课程/操作系统概论/README.md)、[计算机组成原理](课程/计算机组成原理/README.md)。两门课共用的两份速查在根目录：[术语与缩写表](课程/术语与缩写表.md)、[易错点清单](课程/易错点清单.md)。

## 站点

<https://studynote.chosenecho.dpdns.org/>

站点上放了两门课全部十二章。跟阅读有关的都在这里：章节之间有上一章/下一章与课程首页的跳转，搜索认中文，两门课的章末习题都是**教材原题**、答案默认折起来（组成原理的解答取自书末「附录 部分习题解答」，附录没给答案的题目只列题干），插图点开按原图尺寸显示、手机上可左右拖动，字号能调。每章开头有个「本章已复习」的勾选，首页会显示两门课各自复习到第几章、每章是否已复习，并给出「继续复习」入口。

另外有个进程调度实验，拿 FCFS、非抢占 SPF 和时间片轮转三种算法跑同一组作业，比周转时间。

站点也做了打印样式：`Ctrl+P` 直接打印或另存 PDF，折叠的答案会自动展开、打印完再折回去（`站点/src/assets/notes.css` 的 `@media print` 与 `interactions.js` 的 `beforeprint`）。

### 本地跑起来

需要 Python 3.10 或更高。在仓库根目录：

```sh
python -m pip install -r 站点/requirements.txt
python -m mkdocs serve -f 站点/mkdocs.yml
```

然后打开 `http://127.0.0.1:8000/`。

### 构建

```sh
python -m mkdocs build -f 站点/mkdocs.yml --strict
```

产物在 `站点/dist/`（当前 69 个文件、14 个页面 + 404、sitemap 14 条）。文件数会随 Material 版本和 `hooks.py` 的裁剪规则变，别照抄这个数——构建完自己数一遍。

`site_url` 由环境变量 `SITE_URL` 决定，默认是生产域名 `https://studynote.chosenecho.dpdns.org/`。只有这一个部署目标，构建时也可以显式传一遍：

```sh
SITE_URL=https://studynote.chosenecho.dpdns.org/ python -m mkdocs build -f 站点/mkdocs.yml --strict
```

404 页里的站内链接跟着 `site_url` 走。**不要在源码里写死 `/`**，换域名时会全错。

### 部署

生产是 **Cloudflare Pages 项目 `studynote`，直传**（不做 Git 集成，仓库里不存 Cloudflare 凭据）。两步：

```sh
SITE_URL=https://studynote.chosenecho.dpdns.org/ python -m mkdocs build -f 站点/mkdocs.yml --strict
wrangler pages deploy ".\站点\dist" --project-name=studynote --branch=main
```

`wrangler` 先 `wrangler login`（或设 `CLOUDFLARE_API_TOKEN`）。上传是增量的，只传有变化的文件，通常几十秒完事。

对外域名 `studynote.chosenecho.dpdns.org` 并不直接指向 Pages，而是经 Worker `site-proxy` 代理到 `studynote-42b.pages.dev`。Worker、DNS、证书脚本都在仓库外的 `Documents\studynote-deploy\`。

`站点/src/_headers`（CSP、缓存策略）是 **Cloudflare Pages 的约定文件**，只有走 Pages 才生效。

**GitHub Pages 已下线**：2026-11-01 删除该仓库的 Pages 站点，同时移除 `.github/workflows/pages.yml`。原来的 `chosenecho.github.io/os-study-notes/` 不再更新、也不再可访问；要看那个工作流长什么样，去 git 历史里翻。

### 改笔记

笔记在 `课程/<课程名>/第N章_…_笔记.md`。插图只存在于 `课程/操作系统概论/图/`（15 张，只放 `.svg`）；计算机组成原理**没有** `图/` 目录，加图要先补 `hooks.py` 的复制分支。

构建时 `站点/hooks.py` 先把 `站点/src/` 整目录复制成 `站点/docs/`，再读两门课的笔记：操作系统概论的插图复制到 `站点/docs/assets/figures/`（组成原理当前不搬图，要加图得先补 hooks 里的复制分支）、给每章插上复习勾选与字号选择、把习题整理成折叠答案、加上章末导航，最后写出 `站点/docs/chapters/chapter-N.md` 与 `站点/docs/computer-organization/chapter-N.md`。

图片引用的解析规则是：**引用的文件名是 `.png` 且同名 `.svg` 存在时换成 `.svg`**，宽度高度从 SVG 里读，所以笔记里写 `.svg` 或 `.png` 都能出图——但仓库里只提交 SVG。原来那条「渲位图」的链路（`图/render.ps1`）已于 2026-11-02 删除，`课程/` 下现在没有任何 PNG。

改完源码重新构建。本地 `serve` 开着的话重启一次。

`站点/docs/` 除那个 0 字节哨兵外全是派生的：清空它再构建，产物逐字节不变（哨兵是因为 MkDocs 在跑钩子之前就要求 `docs_dir` 存在）。手写的东西在 `站点/src/` 和 `站点/hooks.py`。复习进度和字号存在浏览器本地，换设备不同步。

### 调度核算

调度实验的答案另用脚本核过一遍。需要 Node，只用于测试，不参与网站构建：

```sh
node 站点/scripts/test-scheduling.mjs
```

脚本假设单 CPU、没有 I/O、切换开销忽略不计。

### 质量审计

`qa/` 里是站点的一套可复现检查，改完站点建议跑一遍：

```sh
python -m mkdocs build -f 站点/mkdocs.yml --strict
node qa/scripts/lead-links.mjs       # 站内链接与锚点；有任何断链就 exit 1
```

`lead-links.mjs` 是纯 Node、零依赖的，直接读 `站点/dist`，**不用起服务器**。它已接进 CI，是唯一会自动变红的检查。

`verify-fixes.mjs` 是 37 项浏览器断言（横向溢出、对比度、点按尺寸等），需要 Playwright + 一个跑在 `127.0.0.1:8123` 的静态服务器：

```sh
python -m http.server 8123 -d 站点/dist
node qa/scripts/verify-fixes.mjs     # 37 项断言，逐条给实际值；有失败就 exit 1
```

它依赖仓库外的 Playwright（`C:\Users\ChosenEcho\node_modules`），**是人跑的门禁，不在 CI 里**。其中 3 条断言（`P1-03`、`P2-08`、`P3-13`）的期望值已随源码演进失真，跑出来失败不代表站点坏了，先对照 `qa/rounds/r5/` 的记录再判断。

缺陷清单与修复记录按轮次放在 `qa/rounds/`。

## 加一门课

1. 新建 `课程/<课程名>/`，放进 `第1章…第6章` 的笔记，文件名必须匹配 `第N章*_笔记.md`。每章必须**恰好一个**匹配文件：多了或少了，构建都会直接报错退出（`hooks.py` 的 `chapter_note()`），不会静默挑一个。要加插图就放这个课程的 `图/` 下（只放 SVG），并补 `hooks.py` 的复制分支。
2. `站点/hooks.py` 里照着现有两门课补一段生成逻辑（现在还是两段硬编码循环，加第三门课要复制一段并改：章数、输出目录、`data-chapter` 前缀、是否复制图）。
3. `站点/mkdocs.yml` 的 `nav` 加 6 条。
4. `站点/src/index.md` 加课程卡片、6 条章节链接和一块进度条。
5. `站点/src/assets/interactions.js` 的课程码列表里加新课程的码，前缀规则跟着改——**漏这一步的症状是「勾选能存、首页进度永远是 0」，不报错**。

上面五步是明面上的，还有五个隐性步骤，漏了都不报错：

| 隐性步骤 | 位置 | 漏了会怎样 |
|---|---|---|
| `CROSS_BOOKS` 映射 | `站点/hooks.py` 的 `CROSS_BOOKS` | 「见《新书》第 N 章」不会变成链接，正文静默留成纯文本 |
| `chapter_nav` 的末章判断 | `站点/hooks.py` 的 `number < 6` | 新书最后一章会生成指向不存在页面的「下一章」 |
| `on_post_build` 的公式注入 | `站点/hooks.py` 的 `site.rglob('chapter-*/index.html')` | 现在按章节页目录自动扫，不用改；只有改了章节页的目录层级才会漏，症状是整章公式不渲染 |
| 「继续复习」入口 | `站点/src/index.md` 的 `data-next-chapter` | 全页只有一处、章号写死操作系统概论，新课没有这个入口 |
| 课程码与前缀 | `站点/src/assets/interactions.js` 的 `["os","co"]` 与 `co-` 前缀 | 勾选能存、首页进度永远 0 |

三门课以上的正确做法是把两段硬编码循环抽成一个 `COURSES` 配置数组（章数、输出目录、`data-chapter` 前缀、是否搬图），一次改完，不必再复制第二段循环。

生成目录不用管：`站点/.gitignore` 是 `/docs/*` 加一条 `!/docs/.gitkeep` 例外，派生内容一律不入库。

教材和真题放 `资料/`，别放进 `课程/`——那里的东西会被提交进仓库。
