# 历史质量审计

本目录是迁移前的审计记录与退役脚本归档。文中的旧路径、统计与命令保留当时状态；当前开发入口见[开发约定](../../development.md)。

# qa：站点质量审计

## 能跑的检查（`scripts/`）

| 脚本 | 作用 | 依赖 | 会失败吗 |
|---|---|---|---|
| `lead-links.mjs` | 站内链接、锚点、资源完整性。读 `站点/dist`，**不用起服务器** | 纯 Node | **会**：有断链 / 坏资源 / 丢锚点即 `exit 1`。已接进 CI |
| `verify-fixes.mjs` | 37 项浏览器断言：横向溢出、对比度、点按尺寸、字号 | Playwright + `127.0.0.1:8123` | **会**：有断言失败即 `exit 1`。人工门禁，不进 CI |
| `check-notes.py` | 笔记结构自检 | Python | 会 |
| `verify-revision.py` | 修订前后一致性核对 | Python | 会 |
| `check-build.py` | 构建产物基本统计 | Python | 会 |
| `check-links-dist.py` | `lead-links.mjs` 的 Python 前身 | Python | 会 |

`scripts/_retired/` 是 2026-11-02 退役的一次性探针（上一轮现场调试留下的 `lead-*` 脚本、各轮截图脚本、`check-*` 变体）。留着观察一周再删；**不要跑它们**。

> `verify-fixes.mjs` 有 3 条断言（`P1-03`、`P2-08`、`P3-13`）的期望值已随源码演进失真，失败时先对照 `rounds/r5/` 的记录再判断是站点坏了还是断言旧了。

## 报告（`rounds/`）

按轮次归档，每轮四件套：缺陷报告 / 修复计划 / 修复记录 / 上线记录。

| 目录 | 轮次 | 说明 |
|---|---|---|
| `rounds/r1/` | R1 | 首轮基线审计（36 条缺陷） |
| `rounds/r2/` | R2 | 逐设备深挖，81 条 findings |
| `rounds/r3/` | R3 | 两书风格一致性 + 结构 |
| `rounds/r4/` | R4 | 内容审读（技术 / 考纲 / 结构 / 一致性） |
| `rounds/r5/` | R5 | 12 章笔记口径统一与终校 |
| `rounds/r6/` | R6 | **仓库本体整理**（不是站点审计）：拆假门禁、删死文件、qa 归档、文档对齐 |
| [rounds/r7/](rounds/r7/README.md) | R7 | 笔记概念勘误、页面置换表精简、共用速查表与回查链接优化 |
| [rounds/r8/](rounds/r8/README.md) | R8 | 十二章笔记润色校对、导读与术语对齐、单总线及算法表述修正 |
| [rounds/r9/](rounds/r9/README.md) | R9 | 阅读体验复审、长步骤拆分、术语与口语表述整理、12 章保护区核对 |
| [rounds/r10/](rounds/r10/README.md) | R10 | 细读修订、正文与总结条件对齐、性能推理勘误及手机阅读抽查 |
| [rounds/r11/](rounds/r11/README.md) | R11 | 六类新交互练习、24 道随堂自测、逐步核对与错题重练 |

`reports/` 是逐设备的机器可读报告（`desktop` / `tablet` / `mobile` / `functional` / `delivery`，各 `.md` + `.json`）。

## 不入库的本地快照

`artifacts/`（截图，约 25 MB）、`r2/`（163 MB）、`r3/`（24 MB）、`r4/_scratch/`（50 MB）都是被 `.gitignore` 忽略的原始证据，**换机器就没了**。

写结论时把数字落到 `rounds/` 的报告里——快照会被清理，报告不会。需要复现某条证据就重跑 `scripts/` 里的脚本。

> 唯一不可再生的是 `r3/_pre-fix-backup/`（5 个笔记修复前快照）与 `r4/_scratch/pre-fix/before.patch`——这两个不在任何 git 提交里，已于 2026-11-02 备份到 `Documents\_备份\studynote-archive-20261102\`。
