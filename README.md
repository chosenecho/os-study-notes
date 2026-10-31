# 学习资料

自学考试课程笔记与配套文档站。笔记正文是唯一真源，网站由构建钩子从笔记自动生成。

## 目录结构

| 路径 | 内容 | 版本控制 |
|---|---|---|
| `课程/操作系统概论/` | 六章笔记、插图（`图/`）与课程导航 | 是 |
| `课程/计算机组成原理/` | 六章笔记与课程导航 | 是 |
| `站点/` | Material for MkDocs 站点配置、样式、构建钩子 | 是 |
| `资产/` | 教材、扫描件、真题、旧版笔记备份 | 否（本地留存） |
| `归档/` | 其他科目资料（ncre、数据结构、数据库、高数、毛概等） | 否（本地留存） |
| `.github/workflows/pages.yml` | GitHub Pages 构建与发布 | 是 |

`资产/` 与 `归档/` 体积大且不作为发布内容，已由 `.gitignore` 排除。

## 课程

### 操作系统概论

依据《操作系统概论（2017 年版）》及其书前自学考试大纲整理，六章：操作系统简介、进程管理、进程调度与死锁、内存管理、文件系统、I/O 设备管理。入口见 [`课程/操作系统概论/README.md`](课程/操作系统概论/README.md)。

### 计算机组成原理

依据袁春风《计算机组成原理》（2016 年版）及配套大纲整理，六章：计算机系统概述、数据的表示和运算、指令系统、中央处理器、存储器层次结构、互连及输入输出组织。入口见 [`课程/计算机组成原理/README.md`](课程/计算机组成原理/README.md)。

## 站点

站点地址：<https://chosenecho.github.io/os-study-notes/>

包含两门课全十二章笔记、中文搜索、逐题答案折叠、插图放大、字号选择、复习进度记录与进程调度实验。

### 本地运行

需要 Python 3.10 或更高版本。在仓库根目录执行：

```sh
python -m pip install -r 站点/requirements.txt
python -m mkdocs serve -f 站点/mkdocs.yml
```

默认预览地址为 `http://127.0.0.1:8000/`。

### 构建

```sh
python -m mkdocs build -f 站点/mkdocs.yml --strict
```

产物在 `站点/dist/`。

### 部署

推送到 `main` 分支后由 GitHub Actions 自动构建并发布。工作流见 `.github/workflows/pages.yml`：安装 `站点/requirements.txt`，以 `--strict` 构建，再把 `站点/dist` 上传为 Pages 制品。

Pages 源需设为 "GitHub Actions"，首次启用可执行：

```sh
gh api -X POST repos/chosenEcho/os-study-notes/pages -f build_type=workflow
```

站点子路径由 `mkdocs.yml` 的 `site_url` 决定，默认 `https://chosenecho.github.io/os-study-notes/`；工作流中通过 `SITE_URL` 环境变量显式传入。

### 更新笔记

编辑 `课程/<课程名>/第N章_…_笔记.md`。插图放在对应课程的 `图/` 目录。构建钩子 `站点/hooks.py` 在每次构建时：

1. 从 `课程/操作系统概论/` 与 `课程/计算机组成原理/` 读取六章笔记；
2. 把相对路径插图复制到 `站点/docs/assets/figures/`（同名 `.png` 优先替换为 `.svg`）；
3. 为每章注入复习勾选、字号选择控件与插图预览对话框；
4. 把教材习题整理为折叠答案结构。

更新源文件后重新构建；本地 `serve` 运行中可重启以同步。

生成物 `站点/docs/chapters/`、`站点/docs/computer-organization/`、`站点/docs/assets/figures/` 不纳入版本控制。样式在 `站点/docs/assets/notes.css`，交互逻辑在 `站点/docs/assets/interactions.js`。进度与字号保存在当前浏览器，不跨设备同步。调度实验假设单 CPU、无 I/O、忽略切换开销。

可选调度核算（需要 Node，仅用于测试，不参与网站构建）：

```sh
node 站点/scripts/test-scheduling.mjs
```

### 插图重渲染

`课程/操作系统概论/图/render.ps1` 用 Chrome headless 把 SVG 渲染为 PNG，输出到同目录，中间产物写入 `图/_render/`（已忽略）：

```powershell
pwsh 课程/操作系统概论/图/render.ps1
```

## 新增课程

1. 建立 `课程/<课程名>/`，放入 `第1章…第6章` 笔记（命名需匹配 `第N章*_笔记.md`）；
2. 插图放 `课程/<课程名>/图/`；
3. 在 `站点/hooks.py` 里参照现有两门课增加一段同步逻辑；
4. 在 `站点/mkdocs.yml` 的 `nav` 增加对应条目；
5. 在 `站点/docs/index.md` 增加课程卡片与章节链接。

新增课程的教材、真题请放 `资产/`，不要放进 `课程/`——否则会被提交进仓库。
