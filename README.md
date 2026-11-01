# 学习资料

自学考试课程的笔记，以及从笔记生成的文档站。手写的东西只有三样：课程笔记、站点源、构建钩子；其余全是生成物或本地资料。

## 目录

| 路径 | 内容 | 纳入版本控制 |
|---|---|---|
| `课程/` | 两门课的六章笔记与插图（`图/`，15 张 SVG） | 是 |
| `站点/src/` | 站点手写源：首页、调度实验页、`notes.css`、`interactions.js`、`favicon.svg`、`_headers`、`robots.txt` | 是 |
| `站点/{mkdocs.yml,hooks.py,requirements.txt,overrides/}` | 构建入口、构建钩子、主题覆盖（404 页） | 是 |
| `站点/docs/`、`站点/dist/` | 构建期生成物与最终产物，**每次构建整目录重建**（`docs/` 只保留一个 0 字节哨兵 `.gitkeep`） | 否 |
| `qa/` | 站点质量审计：Playwright 脚本、37 项断言、逐设备报告 | 是（`qa/artifacts/` 的截图不入库） |
| `资料/` | 教材（含 OCR 复原本）、历年真题 | 否，仅本地 |
| `归档/` | 其他科目，三层：`自考/`（5 门）、`NCRE/`（一至四级）、`校课/`；另有 `_第三方快照/`、`_待归类/` | 否，仅本地 |
| `.github/workflows/pages.yml` | GitHub Pages 构建与发布 | 是 |

`资料/` 与 `归档/` 占地方又不该发布，已写进 `.gitignore`；它们**不再各自带独立的 `.git`**（2026-11-01 整理时退役，快照见 `Documents\_备份\git-bundle-20261101\`）。唯一还带独立仓库的是 `归档/数据结构/`，它有自己的远端 `data-structure-13181`。

原来的 `esa-deploy/`（部署实验与探针脚本，39 个文件 / 14.2 MB）已整体移出到 `Documents\studynote-deploy\`：那批文件里有源站 IP、account id 和一个待吊销的明文 Cloudflare token，而本仓库挂着公开远端。`qa/scripts/delivery_net.py` 会先找仓库内、再找那个外部目录，坏不掉。

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

两门课的入口在各自的 README：[操作系统概论](课程/操作系统概论/README.md)、[计算机组成原理](课程/计算机组成原理/README.md)。

## 站点

<https://chosenecho.github.io/os-study-notes/>

站点上放了两门课全部十二章。跟阅读有关的都在这里：章节之间有上一章/下一章与课程首页的跳转，搜索认中文，两门课的教材习题答案默认折起来（组成原理是自测题表，同样折起），插图点开按原图尺寸显示、手机上可左右拖动，字号能调。每章开头有个「本章已复习」的勾选，首页会显示两门课各自复习到第几章、每章是否已复习，并给出「继续复习」入口。

另外有个进程调度实验，拿 FCFS、非抢占 SPF 和时间片轮转三种算法跑同一组作业，比周转时间。

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

产物在 `站点/dist/`（81 个文件、14 个页面 + 404、sitemap 14 条）。

`site_url` 由环境变量 `SITE_URL` 决定，默认是 GitHub Pages 的子路径 `https://chosenecho.github.io/os-study-notes/`。同一份源可以构建到两个部署目标：

```sh
SITE_URL=https://chosenecho.github.io/os-study-notes/ python -m mkdocs build -f 站点/mkdocs.yml --strict
SITE_URL=https://studynote.chosenecho.dpdns.org/ python -m mkdocs build -f 站点/mkdocs.yml --strict
```

404 页里的站内链接跟着 `site_url` 走，所以两个目标都对。**不要在源码里写死 `/`**，那只能对其中一个成立。

### 部署

推到 `main` 就行，GitHub Actions 会自动构建发布。工作流在 `.github/workflows/pages.yml`：装 `站点/requirements.txt` 里的依赖，带 `--strict` 构建，把 `站点/dist` 传成 Pages 制品。

第一次用得在仓库设置里把 Pages 源选成 "GitHub Actions"，也可以用命令行：

```sh
gh api -X POST repos/chosenEcho/os-study-notes/pages -f build_type=workflow
```

站点挂在 `https://chosenecho.github.io/os-study-notes/` 这个子路径下，由 `site_url` 决定；工作流里通过 `SITE_URL` 环境变量传进去。

另有一条 Cloudflare 的线路（自定义域名 `studynote.chosenecho.dpdns.org`，源站是自己的 ECS），脚本与部署记录在仓库外的 `Documents\studynote-deploy\`。注意 `站点/src/_headers`（CSP、缓存策略）是 **Cloudflare Pages 的约定文件**，GitHub Pages 会原样当静态文件发出去、不生效；要它生效必须走 Cloudflare。

### 改笔记

笔记在 `课程/<课程名>/第N章_…_笔记.md`，插图放课程的 `图/` 目录（只放 `.svg`）。

构建时 `站点/hooks.py` 先把 `站点/src/` 整目录复制成 `站点/docs/`，再读两门课的笔记，把插图复制到 `站点/docs/assets/figures/`、给每章插上复习勾选与字号选择、把习题整理成折叠答案、加上章末导航，最后写出 `站点/docs/chapters/chapter-N.md` 与 `站点/docs/computer-organization/chapter-N.md`。

图片引用的解析规则是：**引用的文件名是 `.png` 且同名 `.svg` 存在时换成 `.svg`**，宽度高度从 SVG 里读，所以笔记里写 `.svg` 或 `.png` 都能出图——但仓库里只提交 SVG（`.png` 曾被 `render.ps1` 用来渲位图，那条链路已退役）。

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
python -m http.server 8123 -d 站点/dist
node qa/scripts/verify-fixes.mjs     # 37 项断言，逐条给实际值
node qa/scripts/lead-links.mjs       # 站内链接与锚点
```

缺陷清单与修复记录在 `qa/站点缺陷报告.md`、`qa/修复记录.md`。

## 加一门课

1. 新建 `课程/<课程名>/`，放进 `第1章…第6章` 的笔记，文件名必须匹配 `第N章*_笔记.md`（多一个匹配文件时钩子会报错，不会静默取一个）。插图放这个课程的 `图/` 下，只放 SVG。
2. `站点/hooks.py` 里照着现有两门课补一段生成逻辑（现在还是两段硬编码循环，加第三门课要复制一段并改：章数、输出目录、`data-chapter` 前缀、是否复制图）。
3. `站点/mkdocs.yml` 的 `nav` 加 6 条。
4. `站点/src/index.md` 加课程卡片、6 条章节链接和一块进度条。
5. `站点/src/assets/interactions.js` 的课程码列表里加新课程的码，前缀规则跟着改——**漏这一步的症状是「勾选能存、首页进度永远是 0」，不报错**。

生成目录不用管：`站点/.gitignore` 是 `/docs/*` 加一条 `!/docs/.gitkeep` 例外，派生内容一律不入库。

教材和真题放 `资料/`，别放进 `课程/`——那里的东西会被提交进仓库。
