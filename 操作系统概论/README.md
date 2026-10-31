# 操作系统概论笔记网站

使用 Material for MkDocs，包含全六章笔记、中文搜索、逐题答案折叠、插图放大、字号与复习记录、调度实验。

站点地址：<https://chosenecho.github.io/os-study-notes/>

## 本地运行

需要 Python 3.10 或更高版本。在仓库根目录执行：

```sh
python -m pip install -r 操作系统概论/笔记网站/requirements.txt
python -m mkdocs serve -f 操作系统概论/笔记网站/mkdocs.yml
```

默认预览地址为 `http://127.0.0.1:8000/`。

## 构建

```sh
python -m mkdocs build -f 操作系统概论/笔记网站/mkdocs.yml --strict
```

产物在 `操作系统概论/笔记网站/dist/`。

## 部署

推送到 `main` 分支后由 GitHub Actions 自动构建并发布，工作流见仓库根目录 `.github/workflows/pages.yml`：
安装 `操作系统概论/笔记网站/requirements.txt`，以 `--strict` 构建，产物目录 `操作系统概论/笔记网站/dist` 上传为 Pages 制品。

Pages 源需设为 “GitHub Actions”，首次启用可执行：

```sh
gh api -X POST repos/chosenecho/os-study-notes/pages -f build_type=workflow
```

站点子路径由 `mkdocs.yml` 的 `site_url` 决定，默认 `https://chosenecho.github.io/os-study-notes/`；工作流中通过 `SITE_URL` 环境变量显式传入。

## 更新笔记

继续编辑课程目录的六份 `第N章_…_笔记.md`。插图放在 `图/` 和 `笔记插图/`。构建钩子 `操作系统概论/笔记网站/hooks.py` 自动同步正文、组织逐题答案并复制插图。更新源文件后重新构建；本地 serve 运行中可重启以同步。

计算机组成原理笔记位于同级目录 `计算机组成原理/`，由同一钩子同步为站点的第二门课程。

网页源文件位于 `操作系统概论/笔记网站/docs/`；样式在 `docs/assets/notes.css`，交互逻辑在 `docs/assets/interactions.js`。`docs/chapters/`、`docs/computer-organization/`、`docs/assets/figures/` 为构建生成物，不纳入版本控制。进度与字号保存在当前浏览器，不跨设备同步。调度实验假设单 CPU、无 I/O、忽略切换开销。

可选调度核算（需要 Node，仅用于测试，不参与网站构建）：

```sh
node 操作系统概论/笔记网站/scripts/test-scheduling.mjs
```
