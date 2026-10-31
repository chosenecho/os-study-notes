# 学习资料

自学考试课程的笔记，以及从笔记生成的文档站。笔记是唯一需要维护的东西；站点每次构建都从笔记重新生成，不手工编辑。

## 目录

| 路径 | 内容 | 纳入版本控制 |
|---|---|---|
| `课程/操作系统概论/` | 六章笔记、插图（`图/`）、课程导航 | 是 |
| `课程/计算机组成原理/` | 六章笔记、课程导航 | 是 |
| `站点/` | MkDocs 配置、样式、构建钩子 | 是 |
| `资产/` | 教材、真题、旧版笔记备份 | 否，仅本地 |
| `归档/` | 其他科目（ncre、数据结构、数据库、高数、毛概） | 否，仅本地 |
| `.github/workflows/pages.yml` | GitHub Pages 构建与发布 | 是 |

`资产/` 和 `归档/` 占地方，又不该发布，已写进 `.gitignore`。

## 两门课

操作系统概论的笔记依据《操作系统概论（2017 年版）》和书前的自考大纲整理，六章覆盖操作系统简介、进程管理、进程调度与死锁、内存管理、文件系统、I/O 设备管理。

计算机组成原理的笔记依据袁春风《计算机组成原理》（2016 年版）及配套大纲，六章从计算机系统概述一路讲到互连及输入输出组织。

两门课的入口在各自的 README：[操作系统概论](课程/操作系统概论/README.md)、[计算机组成原理](课程/计算机组成原理/README.md)。

## 站点

<https://chosenecho.github.io/os-study-notes/>

站点上放了两门课全部十二章。跟阅读有关的都在这里：正文之间可以互相跳转，搜索认中文，教材习题的答案默认折起来，插图点开能放大，字号能调。每章末尾有个「本章已复习」的勾选，首页会显示两门课各自复习到第几章。

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

产物在 `站点/dist/`。

### 部署

推到 `main` 就行，GitHub Actions 会自动构建发布。工作流在 `.github/workflows/pages.yml`：装 `站点/requirements.txt` 里的依赖，带 `--strict` 构建，把 `站点/dist` 传成 Pages 制品。

第一次用得在仓库设置里把 Pages 源选成 "GitHub Actions"，也可以用命令行：

```sh
gh api -X POST repos/chosenEcho/os-study-notes/pages -f build_type=workflow
```

站点挂在 `https://chosenecho.github.io/os-study-notes/` 这个子路径下，由 `mkdocs.yml` 的 `site_url` 决定；工作流里通过 `SITE_URL` 环境变量传进去。

### 改笔记

笔记在 `课程/<课程名>/第N章_…_笔记.md`，插图放课程的 `图/` 目录。

构建时 `站点/hooks.py` 会读两门课的笔记，把相对路径的插图复制到 `站点/docs/assets/figures/`（同名 `.png` 会优先换成 `.svg`），给每章插上复习勾选、字号选择和插图预览，再把教材习题整理成折叠答案。

改完源码重新构建。本地 `serve` 开着的话重启一次。

`站点/docs/chapters/`、`站点/docs/computer-organization/`、`站点/docs/assets/figures/` 都是钩子生成的，不进版本控制。样式和交互分别在 `站点/docs/assets/notes.css` 和 `站点/docs/assets/interactions.js`。复习进度和字号存在浏览器本地，换设备不同步。

### 插图重渲染

`课程/操作系统概论/图/render.ps1` 用 Chrome 的无头模式把 SVG 转成 PNG，输出在同一目录，中间文件写到 `图/_render/`（已忽略）：

```powershell
pwsh 课程/操作系统概论/图/render.ps1
```

### 调度核算

调度实验的答案另用脚本核过一遍。需要 Node，只用于测试，不参与网站构建：

```sh
node 站点/scripts/test-scheduling.mjs
```

脚本假设单 CPU、没有 I/O、切换开销忽略不计。

## 加一门课

新建 `课程/<课程名>/`，放进 `第1章…第6章` 的笔记。文件名要匹配 `第N章*_笔记.md`，否则钩子找不到。插图放这个课程的 `图/` 下。

接着在 `站点/hooks.py` 里照着现有两门课补一段同步逻辑，`站点/mkdocs.yml` 的 `nav` 加上条目，`站点/docs/index.md` 加上课程卡片和章节链接。

教材和真题放 `资产/`，别放进 `课程/`。那里的东西会被提交进仓库。
