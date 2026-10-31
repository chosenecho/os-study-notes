# 操作系统概论笔记网站

使用 Material for MkDocs，包含前三章笔记、中文搜索、逐题答案折叠、插图放大、字号与复习记录、调度实验。

## 本地运行

需要 Python 3.10 或更高版本。在仓库根目录执行：

```sh
python -m pip install -r 笔记网站/requirements.txt
python -m mkdocs serve -f 笔记网站/mkdocs.yml
```

默认预览地址为 `http://127.0.0.1:8000/`。

## 构建与部署

```sh
python -m mkdocs build -f 笔记网站/mkdocs.yml --strict
```

产物在 `笔记网站/dist/`。托管平台设置：根目录为仓库根目录；安装命令 `python3 -m pip install -r 笔记网站/requirements.txt`；构建命令 `python3 -m mkdocs build -f 笔记网站/mkdocs.yml --strict`；产物目录 `笔记网站/dist`。平台构建环境需要 Python；只有 Node 的环境需要另选构建环境或上传本地构建产物。

设置环境变量 `SITE_URL` 为正式访问地址（含站点子路径与末尾斜杠）。默认地址为 `https://chosenecho.github.io/os-study-notes/`，此配置不会自动发布 GitHub Pages。

## 更新笔记

继续编辑仓库根目录的三份 `第N章_…_笔记.md`。插图放在 `图/` 和 `笔记插图/`。构建钩子 `笔记网站/hooks.py` 自动同步正文、组织逐题答案并复制插图。更新源文件后重新构建；本地 serve 运行中可重启以同步。

网页源文件位于 `笔记网站/docs/`；样式在 `docs/assets/notes.css`，交互逻辑在 `docs/assets/interactions.js`。进度与字号保存在当前浏览器，不跨设备同步。调度实验假设单 CPU、无 I/O、忽略切换开销。

可选调度核算（需要 Node，仅用于测试，不参与网站构建）：

```sh
node 笔记网站/scripts/test-scheduling.mjs
```
