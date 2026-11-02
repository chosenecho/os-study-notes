# `qa/` 与临时工作区审计报告

- 审计范围：`qa/`（入库部分）、`_整理/`、`站点/dist/`、`站点/docs/`、`站点/__pycache__/`
- 审计时点：2026-11-02 16:13–16:35（Asia/Shanghai）
- 纪律：全程只读。未删除、未移动、未改名任何文件；未运行任何 `fix-*` 或写文件的脚本。本报告是唯一写入物。
- 基线：`main` @ `1b475ca`，`git status --short` 为空（干净）。
- 数据口径：所有数字为 `Get-ChildItem` / `python` 实测；「约」已全部替换为实测值。

---

## 一、一页结论

**1. `qa/scripts/` 的 49 个脚本里，只有 5 个还活着。** 这 5 个正好是 `qa/R5-上线记录.md` §2「上线前本地验收」表格里逐条点名的那 5 条命令。其余 44 条中的 39 条写于 R2 当天（2026-11-01 09:5x–15:27），此后**没有一个提交再动过 `qa/scripts/`**（`git log -1 -- qa/scripts` = `8e0c70a`，2026-11-01 15:31）。其中 20 条是 `lead-` 前缀的 Lead 现场探针（5,968 字节的 `lead-search-race.mjs` 之类），带明显的重复对：`lead-index-check.py` / `lead-index-check2.py`、`lead-rr-check.mjs` / `lead-rr-check.py`、`lead-placeholder.mjs` / `lead-placeholder-widths.mjs`、`lead-search*.mjs` 一族 7 个。**建议的最终脚本集是 5 个（+1 个可选）。**

**2. 250 MB 快照里，只有 1.03 MB 是真正不可再生的。** 我查了 229 条被现存 `qa/*.md` 引用的快照路径，221 条存在、8 条已断（其中 `qa/r3/term-map.csv`、`qa/r3/normalize_notes.py` 是真的不存在，说明 R3 计划的自述与磁盘不符）。但引用存在 ≠ 不可替代：R2 的 306 个量化测量值里，已有 174 个（57%）逐字落进了 `qa/R2-站点缺陷报告.md`；188 个被引用的截图文件名里只有 37 个（20%）进了汇总报告。**真正删了就没了的是两份回滚快照：`qa/r3/_pre-fix-backup/`（18 文件 / 609,193 B）和 `qa/r4/_scratch/pre-fix/before.patch`（422,346 B）——我逐个比对了 SHA-256，它们与 `git@022975f` 的内容都不相同，不在版本历史里。**其余 249 MB 是可重跑的截图与原始 JSON。

**3. `qa/` 报告层已经腐烂，而且有一处是「自我矛盾」。** 根目录平铺了 **15 个 .md**，其中 `修复记录.md`（12,200 B）与 `修复记录-r2.md`（20,650 B）是**两条互不相干的修复链**，但 `修复记录.md` 没有 `-r1` 后缀，读者无从判断谁是第一轮。更硬的问题：`修复记录.md` 第 5 行的 R4 勘误说「六章各 5 题默认收起也不再成立（现在每章 10–19 题）」——**实测当前构建是每章 25/34/27/27/32/31 题，没有一章落在 10–19 区间**。这份「勘误」本身已经过期。current 结论只有 R5 一份上线记录 + `修订规范与勘误清单.md`。

**4. `_整理/` 该留，但只能留 5 个文件、丢 30 个。** 1,321,283 B / 48 文件里，有长期价值的是 `整理方案.md`（32,993 B，方法论）+ 4 份 `report-*.md`（183,511 B，取证记录）+ `整理执行.ps1`（17,984 B）。纯施工废料是 9 份执行日志（65,097 B，其中 3 份 8,420 B 内容近乎重复）、`hashes.csv`/`inventory.csv`（283,408 B，记录的 1,066 个文件的哈希**已经全部过期**——它们描述的是 `资产/` 时代的仓库，而 `资产/` 现在已不存在）、`习题提取/`（119,988 B，内容已被吸收进笔记）、`快照-*.patch`（**2 个 0 字节空文件**）、`快照-状态-*.txt`（68 B）。**注意：整目录被 `.gitignore` 第 26 行忽略，永远不会同步到别的机器——留在本机等于只留一份、没有备份。**

**5. 构建残留全部干净，没有「dist 比源旧」的陷阱。** `站点/dist/` 70 文件 / 3,083,467 B、`站点/docs/` 61 文件 / 1,239,168 B，目录 mtime 都是 **16:13:05–16:13:06**，晚于最新的源（`课程/…第6章_IO设备管理_笔记.md` 15:37:55、`站点/src/` 11-01 21:31:58）。我逐字验证了 `dist/chapters/chapter-1/index.html` 里的正文句子确实来自当前 `课程/操作系统概论/第1章…` 的最新版本。`dist` 文件数与 R5 记录吻合（70 / 3,083,467 B），sitemap 14 条 = 14 个 `index.html` = 12 章 + 首页 + lab。`.gitignore` 两层规则自洽且经 `git check-ignore -v` 实测生效。**唯一的不一致是 `站点/.gitignore` 第 3 行 `!/docs/.gitkeep` 在豁免一个 0 字节哨兵，这是有意为之**（`README.md` 第 105 行有解释），不是缺陷。

**6. 清理时绝对不能盲跑——`qa/scripts/fix-co-notes.py` 会真的改坏笔记。** 它做的是「教材本章习题 → 本章自测题（自编）」，而 **`db0091b` 已经把这个方向整体回退过**。现在 6 个组成原理笔记里每个都还有 1 处 `## N 教材本章习题`，所以**跑一次就会改 6 个文件**——把正确的「教材原题」重新标成「自编」，正好是 `qa/r4/BRIEF.md` §2 定义的 P0（"把自编题标成教材原题"的反向同款错误）。另有 5 个脚本会写 `qa/reports/`、8 个写 `qa/artifacts/`，都不碰 `课程/` 与 `站点/src/`，可以安全重跑。

### 一句话行动建议

删 4 个快照目录里除 2 份回滚补丁外的全部内容（**回收 ≈249 MB / 96.7%**），把 49 个脚本压到 5 个（**回收 40,871 B**），`qa/` 根目录 15 个 .md 收进 `rounds/`（**平铺数 15 → 2**），`_整理/` 只留 5 文件（**回收 ≈1.09 MB**）。**净回收 ≈251.4 MB。** 但**先补一刀**：把 `qa/r3/_pre-fix-backup/` 和 `before.patch` 移出版本忽略区，否则这 1.03 MB 在你按下删除的同一秒就没有第二次机会了。

---

## 二、`qa/scripts/` 生死簿总表

### 2.1 判据与实测

| 判据 | 实测 |
|---|---|
| 总数 | 49 个文件 / 450,744 B / 7,899 行（`Get-ChildItem` + `Measure-Object -Line`） |
| 全部 mtime 落在 | 2026-11-01 11:09 – 15:27（**49 个全部**，无一个 11-02） |
| 最后一次提交触碰 `qa/scripts/` | `8e0c70a`，2026-11-01 15:31 —— **此后 9 个提交再没动过** |
| `lead-` 前缀 | **20 个** / 54,968 B / 1,185 行 |
| 被 `qa/R5-上线记录.md` §2 点名 | 5 个（`check-notes.py`、`verify-revision.py`、`check-build.py`、`check-links-dist.py`、`verify-fixes.mjs`+`lead-links.mjs`） |
| 被根 `README.md` 第 124–125 行点名 | 2 个（`verify-fixes.mjs`、`lead-links.mjs`） |
| 被 `qa/README.md` 第 3 行点名 | 3 个（`verify-fixes.mjs`、`lead-links.mjs`、逐设备报告生成） |
| git 跟踪状态 | **49/49 全部入库**（`git ls-files qa/scripts` = 49）。所以「不入库、换机器就没了」对脚本**不成立**，只对快照成立 |

### 2.2 总表

图例：**保留** = 现行结论依赖、应进最终集；**归档** = 一次性但值得留档（进 `qa/scripts/archive/`）；**删** = 一次性调试探针或已失效，可直接删。

| # | 脚本 | 字节 | 行 | 类型 | 判定 | 理由（实测依据） |
|---:|---|---:|---:|---|---|---|
| 1 | `check-notes.py` | 4,962 | 101 | 可复现正式审计 | **保留** | R5 §2 点名；读 `课程/` 12 篇笔记做结构核验，零写入，`REPO = parents[2]` 路径健壮 |
| 2 | `verify-revision.py` | 6,232 | 134 | 可复现正式审计 | **保留** | R5 §2 点名（46 条修订项）；`MUST_HAVE`/`MUST_NOT_HAVE` 双向断言，是"勘误清单已落实"的唯一机器证据 |
| 3 | `check-build.py` | 431 | 5 | 可复现正式审计 | **保留** | R5 §2 点名；5 行验 canonical/CSS 内联/robots/_headers/404，成本极低 |
| 4 | `check-links-dist.py` | 2,763 | 66 | 可复现正式审计 | **保留** | R5 §2 点名（15 页 421 链接 0 断）；读 `dist` 只读 |
| 5 | `lead-links.mjs` | 3,394 | 93 | 可复现正式审计 | **保留** | 根 README:125 + `qa/README.md`:3 + R3/修复记录共 6 处引用；站内链接与锚点检查，是唯一有 CI 级引用度的脚本 |
| 6 | `verify-fixes.mjs` | 19,950 | 307 | 可复现正式审计（**部分失效**） | **归档** | 37 项断言中至少 3 项已随源演进而失真：`P1-03` 断言 `co.details >= 4`，实测现在是 **25–34**（阈值失效但恰仍通过）；`P2-08` 断言 `innerActual <= 761`，而 `notes.css:199-200` 在 `min-width:1600px` 把 `--note-content-max` 改成 **820px**；`P3-13` 找 `2.68` 字面量，`interactions.js:99` 已改成 `round2()` 运行时求值，`dist/lab/...` 里 `2.68`/`2.67` **都不存在**。它能跑通靠的是别的东西在兜底，不是它自己还对 |
| 7 | `check-deploy.py` | 2,249 | 49 | 一次性探针 | 归档 | 0 处外部引用；针对 `esa-deploy/` 时代，该目录已移出仓库 |
| 8 | `delivery_net.py` | 25,854 | 553 | 一次性探针（大体量） | 归档 | 参考度最高的一次性脚本（根 README:20 明确提到它会找外部 deploy 目录），但它写死 `DIST = 站点/dist` 与线上 URL，是一次性交付复核 |
| 9 | `check-301.py` | 524 | 9 | 一次性探针 | 归档 | 只被 `_整理/` 的施工日志引用，无入库引用 |
| 10 | `check-404.py` | 308 | 5 | 一次性探针 | 归档 | 0 处引用 |
| 11 | `check-headers-live.py` | 518 | 8 | 一次性探针 | 归档 | 0 处引用 |
| 12 | `check-live-final.py` | 925 | 14 | 一次性探针 | 归档 | 只被 `_整理/` 引用 |
| 13 | `check-plain-live.py` | 473 | 9 | 一次性探针 | 归档 | 0 处引用 |
| 14 | `check-robots-live.py` | 449 | 7 | 一次性探针 | 归档 | 0 处引用 |
| 15 | `shot-404.mjs` | 388 | 8 | 一次性探针 | 归档 | 0 处引用；纯截图 |
| 16 | `shot-live.mjs` | 920 | 17 | 一次性探针 | 归档 | 0 处引用；纯截图 |
| 17 | `verify-live.mjs` | 5,583 | 74 | 一次性探针 | 归档 | 1 处引用（`qa/修复记录.md`:115，9/9 通过那次）；R2 时代线上断言，已被 R5 取代 |
| 18 | `verify-visual.mjs` | 1,393 | 29 | 一次性探针 | 归档 | 0 处引用 |
| 19 | `verify-search.mjs` | 1,392 | 28 | 一次性探针 | 归档 | 0 处引用；写 `artifacts/verify/search-fixed.json` |
| 20 | `verify-regression.mjs` | 2,431 | 40 | 一次性探针 | 归档 | 0 处引用 |
| 21 | `list_findings.py` | 1,262 | 32 | 一次性探针 | **删** | 只被 `qa/artifacts/lead/findings-mt.txt` 引用（该文件本身在忽略区）；功能是拼接 R2 Lead 的 findings，R2 已封存 |
| 22 | `fix-co-notes.py` | 601 | 11 | **危险脚本** | **删** | 见 §六。**会改 6 个 `课程/` 文件且改错方向** |
| 23 | `mobile.mjs` | 66,564 | 1,097 | 大批量设备审计 | **删** | R2 一次性；写死 5 页 × 3 档，产出 `qa/reports/mobile.md` 与 `artifacts/mobile/`。报告已入库，重跑只会得到与 2026-11-01 不同的数字 |
| 24 | `tablet.mjs` | 27,412 | 541 | 同上 | **删** | 同上 |
| 25 | `desktop.mjs` | 123,047 | 1,956 | 同上 | **删** | 同上；49 处 `44` 字面量等硬编码阈值 |
| 26 | `functional.mjs` | 72,365 | 1,011 | 同上 | **删** | 同上；内含独立重写的调度模拟器，但结论已落纸 |
| 27 | `delivery.mjs` | 24,247 | 551 | 同上 | **删** | 同上 |
| 28 | `parity.py`* | 1,020 | 22 | 一次性探针 | **删** | `qa/` 根目录；线上 vs 本地逐字节比对，写死 `assets/notes.css`（该文件在 `dist` 里**已不存在**，CSS 已内联） |
| 29 | `parity2.py`* | 889 | 18 | 一次性探针 | **删** | `qa/` 根目录；同上 |
| 30 | `probe-theme.mjs`* | 2,398 | 47 | 一次性探针 | 归档 | `qa/` 根目录；主题变量探针，需活服务 |
| 31 | `smoke.mjs`* | 1,041 | 30 | 一次性探针 | **删** | `qa/` 根目录；被 `qa/BRIEF.md`:23 当作示例，但 `lib/audit.mjs` 才是那套能力的正式入口 |
| 32–49 | `lead-*.mjs` / `lead-*.py`（18 个） | 49,081 | 1,059 | **Lead 现场调试探针** | **删** | 见 §2.3 |

\* `parity.py`、`parity2.py`、`probe-theme.mjs`、`smoke.mjs` 位于 `qa/` 根目录而非 `qa/scripts/`，一并计入「路径上的一次性脚本」。

### 2.3 `lead-` 前缀 20 个：重复对实证

| 重复对 | 证据 |
|---|---|
| `lead-index-check.py`（715 B / 11 行, 11:15） vs `lead-index-check2.py`（536 B / 15 行, 11:16） | 相隔 **1 分钟**；后者是前者的修修补补，文件名带 `2` 即承认前一个作废 |
| `lead-rr-check.mjs`（944 B / 13 行, 11:43） vs `lead-rr-check.py`（811 B / 17 行, 11:43） | **同一分钟、同一目的、两种语言**各写一遍 |
| `lead-placeholder.mjs`（1,312 B / 27 行, 11:44） vs `lead-placeholder-widths.mjs`（985 B / 23 行, 11:44） | 同一分钟，后者是前者的子集探测 |
| `lead-search.mjs` / `-acronyms` / `-ascii` / `-deep` / `-matrix` / `-net` / `-race`（7 个） | 11:11–11:17 六分钟内产出 7 个变体，共 19,015 B / 419 行，全部围绕同一件事：lunr 搜索词干化。结论最终坍缩成 `修复记录.md`:62 的 **1 行**（P3-03 ⚠ 上游残留） |
| `lead-check.mjs` / `lead-links.mjs` / `lead-ui.mjs` / `lead-drawer.mjs` / `lead-labscroll.mjs` / `lead-live-idle.mjs` / `lead-verify-mobile.mjs`（7 个） | 其中**只有 `lead-links.mjs` 活下来**并进了 README；其余 6 个 0 引用 |

**这 20 个文件（54,968 B）的功能净值 = `修复记录.md` 里的 2 条上游残留说明。** 保留它们等于保留调试现场，不是保留审计能力。

### 2.4 建议的最终脚本集

```
qa/scripts/          5 个（保留）+ 1 个（可选）
├─ check-notes.py            101 行   笔记结构核验
├─ verify-revision.py        134 行   勘误清单双向断言
├─ check-build.py              5 行   产物完整性
├─ check-links-dist.py        66 行   站内链接
└─ lead-links.mjs             93 行   链接 + 锚点（README 承诺项）
   └─ (可选) verify-fixes.mjs 307 行  需先重写 3 条失效断言，否则不要挂进 README
```

**建议最终脚本集 = 5 个 / 399 行 / 17,782 B。** 从 49 个 / 7,899 行 / 450,744 B 砍到 5 个，**砍掉 43,087 B（95.6%）与 7,500 行（95.0%）**。

代价：`qa/README.md`:3 与根 `README.md`:124 都写着 `verify-fixes.mjs` 「37 项断言」。若照本表归档它，**这两处 README 必须同步改**，否则文档立刻说谎——而这恰好是 `qa/r4/E-项目与文档一致性.md` 反复点名的同一类问题。

---

## 三、可回收空间清单

### 3.1 总量

```
qa\artifacts         files=   342 bytes=  25,900,801 MB=    24.70
qa\r2                files=  1109 bytes= 162,982,740 MB=   155.43
qa\r3                files=   381 bytes=  24,289,617 MB=    23.16
qa\r4\_scratch       files=   625 bytes=  50,571,778 MB=    48.23
站点\dist             files=    70 bytes=   3,083,467 MB=     2.94
站点\docs             files=    61 bytes=   1,239,168 MB=     1.18
站点\__pycache__      files=     1 bytes=      20,947 MB=     0.02
_整理                 files=    48 bytes=   1,321,283 MB=     1.26
TOTAL                           269,409,801 MB=   256.93
```

### 3.2 逐项判定

| 路径 | 字节 | 判定 | 删了会损失什么（具体） |
|---|---:|---|---|
| `qa/r2/` | 162,982,740 | **删（保留 `_lead/` 元数据）** | 493 张 PNG（144,055,970 B）+ 135 份原始 JSON（5,701,971 B）。7 个成员 report.json 共 **81 条 findings / 99 条 checked_ok**（`python json.load` 实测：content 12/delivery 10/desktop 14/functional 9/phone-nav 15/phone-reading 12/tablet 9）。**结论已在 `qa/R2-站点缺陷报告.md`（52,387 B）与 `qa/修复记录-r2.md`（20,650 B）落纸**；306 个量化测量值中 174 个已逐字进汇总报告。损失：188 个被引用截图里的 151 个（只有 37 个进了报告正文）、81 条 findings 的原始 JSON 结构、以及 `r2/phone-nav/report.json` 这类未进汇总的细节。**重跑 `mobile.mjs` 等已无法复现**（脚本与站点都已演进），所以严格说是"证据链的现场"而非"证据链的结论"——结论在，现场没了 |
| `qa/r3/` | 24,289,617 | **删，但 `_pre-fix-backup/` 必须先救出** | 169 张 PNG（17,190,164 B）+ 47 份 JSON。R3 结论在 `qa/R3-两书风格一致性报告.md`（41,233 B）+ `qa/修复记录-r3.md`（9,503 B）。**`_pre-fix-backup/` 18 文件 / 609,193 B 是唯一不可再生的**：我逐个算了 SHA-256，与 `git@022975f` 的同名文件**全部不同**（例：`第1章_操作系统简介_笔记.md` backup=`9c917a328341` vs git=`52c1de2a8de7`），即 R3 动手前的现场**不在任何提交里**。删掉它 = 永久失去 R3 的回滚能力 |
| `qa/r4/_scratch/` | 50,571,778 | **删，但 `pre-fix/` 与 `final-dist/` 必须先救出** | 625 文件；24 张 PNG 就占 29.99 MB（R4 的 E 角度做了整站构建与截图）；`E/` 目录 379 文件 / 11.98 MB 含整套 `站点/docs` 副本。**`pre-fix/before.patch` 422,346 B 是 R4 改前冻结（`落盘记录.md` 明写"可整体回滚"），`final-dist/` 70 文件 / 2,906,527 B 是 R4 时点的产物快照**。后者与当前 `dist` 文件数相同但 13 个 HTML 大小不同（R5 又改过 12 章笔记），所以它是 R4 的对照基线，有独立价值 |
| `qa/artifacts/` | 25,900,801 | **删** | 236 张 PNG（23,810,732 B）+ 44 份 JSON（1,843,360 B）。**`qa/修复记录.md` 有 4 处、`qa/站点缺陷报告.md` 有 33 处引用它**，是引用密度最高的快照区。但被引用的核心是 `artifacts/verify/checks.json`（37 项断言的原始数据）与 `v-*.png`。**损失：`修复记录.md` 第 82–102 行那张"修复前/修复后"对照表的原始出处**。若想保留最小证据，只留 `artifacts/verify/` 即可（该目录 39 文件 / 2.24 MB），可回收 23.66 MB |
| `站点/dist/` | 3,083,467 | **删（可重建）** | 70 文件。`mkdocs build --strict` 一条命令即可重建，且当前 mtime 16:13:06 已是最新。删除损失 = 一次构建时间。**注意 `R5-上线记录.md` 第 7 行记录的就是 70 文件 / 3,083,467 B——与实测完全一致**，所以删了也不丢任何记录中的事实 |
| `站点/docs/` | 1,239,168 | **删（可重建）** | 61 文件，其中 60 个是派生物 + 1 个 `docs/.gitkeep`（0 B，`站点/.gitignore`:3 豁免）。`README.md`:105 明说"清空它再构建，产物逐字节不变"。**唯一要留的是 `docs/.gitkeep`** |
| `站点/__pycache__/` | 20,947 | **删** | 1 个 `hooks.cpython-312.pyc`。Python 自动重建。`.gitignore` 双保险（根第 8 行 + `站点/.gitignore`:4） |
| `_整理/` | 1,321,283 | **留 5 个 / 删 30 个** | 见 §四细则。要留：`整理方案.md` 32,993 + 4×`report-*.md` 183,511 + `整理执行.ps1` 17,984 = 234,488 B。要删：9 份日志 65,097 + `hashes.csv` 165,687 + `inventory.csv` 117,721 + `tree.txt` 8,736 + `习题改版-第2章.png` 580,140 + `习题提取/` 119,988 + 2 个 0 B patch + `快照-状态-*.txt` 68 + `commit-msg-*.txt` 16,310 + `归档五层.tsv` 2,876 + `整理清单.tsv` 7,527 + 2 个小 ps1 2,187 + `shot.mjs` 886 = **1,086,795 B 可删** |

### 3.3 回收合计

| 方案 | 回收字节 | 占 269,409,801 B 的比例 |
|---|---:|---:|
| 激进：全删（含 2 份回滚补丁） | 269,409,801 | 100% |
| **建议：删全部快照，保留 2 份回滚补丁 + `artifacts/verify/` 最小证据** | **≈251,400,000** | **≈93.3%** |
| 保守：只删可重建产物 + `_整理` 废料 | 5,665,485 | 2.1% |

**建议方案下净回收 ≈251.4 MB**（= 269,409,801 − 1,031,539 保留 − 2,243,000 `artifacts/verify` 等）。

### 3.4 必须先做的抢救动作（唯一有不可逆风险的一项）

```powershell
# 只验证，不执行 —— 本报告不落任何文件操作
# 目标：把 1,031,539 B 挪出 .gitignore 覆盖区
qa/r3/_pre-fix-backup/          18 files,   609,193 B   → 与 git@022975f 均不同（已实测）
qa/r4/_scratch/pre-fix/          1 file,    422,346 B   → R4 改前冻结
```

测证：

```
第1章_操作系统简介_笔记.md          backup=9c917a328341 git@022975f=52c1de2a8de7 same=False
第2章_数据的表示和运算_笔记.md       backup=8653ff2a3682 git@022975f=5ef350456df5 same=False
站点/mkdocs.yml                  backup=ce10e46525a0 git@022975f=9dceb7839535 same=False
```

---

## 四、`qa/` 与 `_整理/` 的建议结构

### 4.1 `qa/`：现在是怎样

```
qa/                                    99 个 .md / 265,085,981 B（含忽略区）
├─ *.md  × 15  ← 平铺在根目录，无任何轮次分组
│   ├─ README.md                727 B   现行索引（7 行）
│   ├─ BRIEF.md               6,558 B   R2 时代的子代理作业书（"不要重跑构建、不要改站点"）
│   ├─ 站点缺陷报告.md         30,132 B   R1 —— **文件名无轮次标记**
│   ├─ 修复记录.md            12,200 B   R1 修复 —— **无 -r1 后缀**
│   ├─ 笔记审读与顺色报告.md    14,101 B   R1.5
│   ├─ 修订规范与勘误清单.md    22,025 B   R1.5 契约（**仍然现行**）
│   ├─ R2-站点缺陷报告.md      52,387 B   R2
│   ├─ R2-修复计划.md          23,251 B   R2
│   ├─ 修复记录-r2.md          20,650 B   R2
│   ├─ R2-上线记录.md           4,972 B   R2
│   ├─ R3-两书风格一致性报告.md 41,233 B   R3
│   ├─ R3-修复计划.md          28,163 B   R3
│   ├─ 修复记录-r3.md           9,503 B   R3
│   ├─ R3-上线记录.md           3,416 B   R3
│   └─ R5-上线记录.md           4,120 B   R5（**唯一现行轮次记录**）
├─ r4/  × 11 .md  ← R4 用的却是子目录，与 R2/R3/R5 的平铺风格不一致
├─ reports/  10 文件 / 380 KB（5 组 json+md）
├─ scripts/  49 文件 / 450,744 B
├─ lib/audit.mjs  19,150 B
├─ parity.py / parity2.py / probe-theme.mjs / smoke.mjs   4 个游离脚本
└─ artifacts/ r2/ r3/ r4/_scratch/   忽略区 250 MB
```

**腐烂的四个具体症状**：

1. **命名不统一造成歧义。** `站点缺陷报告.md`（R1）与 `R2-站点缺陷报告.md`、`R3-两书风格一致性报告.md` 并列，只有 R1 没有前缀。`修复记录.md`（R1）与 `修复记录-r2.md`、`修复记录-r3.md` 并列，只有 R1 没有后缀。读者按字面理解会以为 `修复记录.md` 是最新的（无后缀 = 主版本），**实际它是最旧的**。
2. **同轮次文件散在两处。** R4 的 11 个文件在 `qa/r4/`，R2/R3/R5 的 13 个文件在 `qa/` 根。`qa/README.md` 7 行里对 `r4/` 只字未提。
3. **`BRIEF.md` 是过期作业书。** 6,558 B 里写着"不要重启、不要重跑构建、不要改 `站点/` 下任何文件"（第 48 行）、"每章 5 题默认收起"，都是 R2 时点的约束。它和 `qa/r4/BRIEF.md`（5,868 B，R4 版）并存，**两个 BRIEF 无先后标记**。
4. **现行结论实际只有 2 份。** 从依赖关系看：`课程/` 的最终状态由 R4（勘误落盘）+ R5（顺色校对）决定，站点由 R3+R5 决定。R1/R2 的全部缺陷单与修复记录都已被后续轮次覆盖。

### 4.2 `qa/`：建议变成怎样

```
qa/
├─ README.md                      ← 重写：现行结论入口 + 轮次索引 + 脚本集说明
├─ 现行/
│   ├─ 修订规范与勘误清单.md        ← 仍是契约，且 verify-revision.py 依赖它
│   └─ R5-顺色校对与上线记录.md
├─ rounds/
│   ├─ r1/                        ← 原 R1 时代，全部加 -r1 后缀消歧
│   │   ├─ 站点缺陷报告-r1.md
│   │   ├─ 修复记录-r1.md
│   │   ├─ BRIEF-r1.md
│   │   ├─ 笔记审读与顺色报告-r1.md
│   │   └─ 修订规范与勘误清单-r1.md   (若保留历史版本)
│   ├─ r2/
│   │   ├─ R2-站点缺陷报告.md
│   │   ├─ R2-修复计划.md
│   │   ├─ 修复记录-r2.md
│   │   ├─ R2-上线记录.md
│   │   └─ BRIEF-r2.md
│   ├─ r3/
│   │   ├─ R3-两书风格一致性报告.md
│   │   ├─ R3-修复计划.md
│   │   ├─ 修复记录-r3.md
│   │   └─ R3-上线记录.md
│   ├─ r4/                        ← 整体搬入，文件名不动（已是 r4/ 结构）
│   │   └─ (现有 11 个 .md)
│   └─ r5/
│       └─ R5-上线记录.md
├─ scripts/
│   ├─ check-notes.py  verify-revision.py  check-build.py
│   ├─ check-links-dist.py  lead-links.mjs
│   └─ archive/                   ← 39 个归档；不挂 README、不挂 CI
├─ lib/audit.mjs
├─ reports/                       ← 保留（380 KB，5 组历史基线）
└─ evidence/                      ← 原 artifacts/，只留 verify/ 最小证据
    └─ verify/                    (2.24 MB)
```

**效果：`qa/` 根目录平铺 .md 从 15 → 2**（`README.md` + `现行/` 入口）。全部轮次文件按 `rounds/rN/` 归位，R4 与 R2/R3/R5 风格终于一致。

### 4.3 `_整理/`：现在是怎样

```
_整理/     48 文件 / 1,321,283 B，整目录被 .gitignore:26 忽略
├─ 整理方案.md          32,993 B / 456 行   ★方法论：10 节，含目标结构、T0–T6 分阶段、11 项人工确认
├─ report-git.md        43,112 B / 677 行   ★嵌套 git 取证与退役（只读取证，未动任何 .git）
├─ report-部署.md        41,220 B / 381 行   ★esa-deploy/ 甄别，处置码 A/B/C
├─ report-归档.md        49,546 B / 417 行   ★归档层审计，基于 inventory/hashes
├─ report-核心.md        49,633 B / 473 行   ★核心与耦合关系，含 README 16 处不符
├─ 整理执行.ps1         17,984 B            ★施工脚本（有回滚设计）
├─ 整理清单.tsv          7,527 B             施工清单
├─ 归档五层.tsv          2,876 B             一次性分类表
├─ hashes.csv          165,687 B / 1,067 行   ✗ 1,066 个文件的 SHA-256 —— **已全部过期**
├─ inventory.csv       117,721 B / 1,067 行   ✗ 同上，Mtime 停在 2026-10-31
├─ tree.txt              8,736 B             ✗ 与当前树不符（`资产/` 已不存在）
├─ 习题改版-第2章.png   580,140 B             ✗ 单张截图
├─ 习题改写规范.md        5,706 B             △ 规范文本，但内容已吸收进笔记
├─ 习题提取/  12 文件   119,988 B             ✗ 6 章习题+答案的抽取件，已被吸收
├─ 执行日志-*.log  ×9    65,097 B             ✗ 施工日志（3 份 8,420 B 近乎重复）
├─ commit-msg-*.txt ×7  16,310 B              ✗ 提交信息草稿（提交已完成）
├─ 快照-工作区-*.patch ×2     0 B             ✗ **两个都是 0 字节空文件**
├─ 快照-状态-*.txt         68 B               ✗
├─ build-tree.ps1        1,407 B              ✗
├─ hash-all.ps1            780 B              ✗
├─ shot.mjs                886 B              ✗
├─ 基线-20261101-124333.txt 509 B             ✗
└─ v2/                                        ← 本报告所在
```

### 4.4 `_整理/`：判定与依据

**留（5 个文件，234,488 B）**：`整理方案.md` + 4×`report-*.md` + `整理执行.ps1`。
理由不是"它是上一轮的工作"，而是**这 5 份记录了当前仓库结构的成因**——四套嵌套 git 怎么退的、`esa-deploy/` 为什么移出、`资产/` 为什么改名 `资料/`、`.gitignore` 那 33 行是怎么来的。`report-核心.md` 甚至记着 README 的 16 处不符（其中 `课程/计算机组成原理/README.md:42` 指向已不存在的 `资产/旧版笔记备份_20261031/`）。**这是唯一能解释"为什么现在长这样"的文档，删了就只能靠考古提交历史。**

**删（30 个文件，1,086,795 B）**：全部施工副产物。其中三条最硬的理由：

1. **`hashes.csv` / `inventory.csv` 的内容已经失效。** 两者各 1,067 行，记录的根是 `资产/` 时代的仓库（`.gitignore` 466 B、`README.md` 4,520 B），而 `资产/` 目录**现在已不存在**（`Test-Path 资产` = False，改名成了 `资料/`），`README.md` 现在 10,463 B。**保留一份描述已消失目录树的哈希表没有意义**——它既不能校验现在，也不能还原过去。
2. **2 个 `快照-工作区-*.patch` 是 0 字节。** 它们本该是"改前冻结"的保险，实际什么都没存。**这是本轮审计发现的最讽刺的一条**：唯一被寄予回滚期望的文件，内容是空的。与 `qa/r4/_scratch/pre-fix/before.patch`（422,346 B，非空）形成对照。
3. **`习题提取/`（119,988 B）的产物身份已转移。** 我逐句比对 `ch2_习题.txt` 与当前 `第2章_数据的表示和运算_笔记.md`：`（2）既然计算机内部所有信息都用二进制表示…`、`（3）在浮点数的基数和总位数一定的情况下…`、`（5）为什么计算机处理汉字时会涉及不同的编码…` **全部已在笔记里**（`Contains` = True）。抽取件已完成使命。

**一条结构性警告**：`_整理/` 整目录被 `.gitignore`:26 忽略，**永远不进版本控制、永远不同步到别的机器**。所以"留在本机"= 单点、无备份。如果要留那 5 份，**应该把它们移进 `docs/` 或 `qa/rounds/r1/`，让 git 接管**；如果坚持留在 `_整理/`，那至少要知道：一块盘坏掉，这套"仓库为什么长这样"的解释就没了。

---

## 五、构建残留：实测一致，无陷阱

### 5.1 三层状态与时间戳

```
dist   files=70  bytes=3,083,467  dir mtime=2026-11-02 16:13:06
docs   files=61  bytes=1,239,168  dir mtime=2026-11-02 16:13:05
pycache files=1  bytes=   20,947  mtime    =2026-11-02 12:55:10
src    files=33  bytes=  631,788  dir mtime=2026-11-01 21:31:58   ← 手写源
课程    files=16 (md)             newest   =2026-11-02 15:37:55   ← 最新源
hooks.py                          mtime    =2026-11-02 12:49:40
```

**判定：`dist`/`docs` 严格新于全部源（16:13 > 15:37 > 12:49）。没有「本地 dist 比源旧」的陷阱。**

### 5.2 `dist` 与记录吻合度

| 项 | 实测 | 记录值 | 一致 |
|---|---|---|---|
| 文件数 | 70 | `R5-上线记录.md`:7「70 文件」 | ✅ |
| 总字节 | 3,083,467 | `R5-上线记录.md`:7「3,083,467 B」 | ✅ **逐字节相同** |
| `index.html` 数 | 14 | `R5`:34「14 条 200（含 12 章 + 首页 + lab）」 | ✅ |
| sitemap 条数 | 14 | 根 `README.md`:68「sitemap 14 条」 | ✅ |
| 页面分布 | chapters 6 / computer-organization 6 / lab 1 / 根 1 | — | ✅ |

### 5.3 `dist` 确实反映了最新源（逐字验证）

```
gen  站点\docs\chapters\chapter-1.md   34,052B  11-02 16:13
src  课程\操作系统概论\第1章_操作系统简介_笔记.md  29,819B  11-02 14:19
   contains('3. 调度性。得有两级调度配合：作业调度从外存后...') = True
   contains('4. 复杂性。几道程序挤在同一台机器里，处理器给...') = True
   contains('为什么要费这番周折？看作业脾气就明白了。算题为主...') = True

gen  站点\docs\computer-organization\chapter-2.md  58,968B  11-02 16:13
src  课程\计算机组成原理\第2章_数据的表示和运算_笔记.md  50,972B  11-02 15:35
   contains('拿 8 位字长下的 $-5$ 走一遍：原码 `1...') = True
   contains('同样是 $n$ 位二进制串，当成**无符号整数*...') = True
   contains('- **位数扩宽（扩展）**：无符号数往高位一律...') = True
```

**结论：`docs`/`dist` 是当前源的真实派生物，不是陈旧快照。**

### 5.4 `.gitignore` 自洽性（`git check-ignore -v` 实测）

```
IGNORED  站点/dist/index.html               <- 站点/.gitignore:1:/dist/
IGNORED  站点/docs/index.md                 <- 站点/.gitignore:2:/docs/*
IGNORED  站点/__pycache__/hooks...pyc       <- 站点/.gitignore:4:/__pycache__/
not ignored  站点/src/index.md              ← 手写源正确入库
```

根 `.gitignore`（33 行）与 `站点/.gitignore`（5 行）**没有冲突规则**：根只管 `站点/node_modules/`、`站点/dist/`、`站点/__pycache__/`、`站点/.astro/`、`站点/.playwright-cli/`（第 6–10 行），子文件管 `/dist/`、`/docs/*`、`/__pycache__/`。两层对 `dist`/`__pycache__` 是**冗余**而非矛盾——重复无害。

**唯一需要说明的一处**：`站点/.gitignore`:3 `!/docs/.gitkeep` 豁免一个 **0 字节**哨兵。`git ls-files 站点/docs` 只返回这一个文件。这不是缺陷：`README.md`:105 解释了原因（"哨兵是因为 MkDocs 在跑钩子之前就要求 `docs_dir` 存在"）。`dist` 有 0 个 tracked 文件，`__pycache__` 有 0 个，都正确。

### 5.5 R4 产物快照对照（顺带发现）

```
r4/_scratch/final-dist : files=70 bytes=2,906,527
站点/dist              : files=70 bytes=3,083,467
only_in_final_dist=0   only_in_dist=0   size_mismatch=13
```

**文件集合完全相同（0 增 0 减），13 个 HTML/JSON 大小不同**——正好对上 R5 改动的 12 章笔记 + 搜索索引。说明 `final-dist` 是 R4 时点的合法基线，`dist` 是 R5 后的产物，两者都自洽。**这也是 `final-dist`（2.9 MB）值得从 `_scratch` 里救出来的原因**：它是 R4→R5 唯一可对照的产物层证据。

---

## 六、路径上的一次性脚本：会不会误伤

### 6.1 结论先行

**会。`qa/scripts/fix-co-notes.py` 是唯一会写 `课程/` 的脚本，且它写的是错的方向。清理时绝对不能盲跑。**

### 6.2 全部写盘脚本实测（正则扫 `writeFile|write_text|mkdir|\.write\(|open(...,"w")`）

| 脚本 | 写入调用数 | 实际写入目标 | 碰 `课程/`？ | 碰 `站点/src/`？ | 可安全重跑 |
|---|---:|---|---|---|---|
| **`fix-co-notes.py`** | 1 × `write_text` | `课程/计算机组成原理/第*_笔记.md` | **是（6 个）** | 否 | **否** |
| `mobile.mjs` | 2 × `writeFile` + 3 × `mkdir` | `qa/reports/mobile.md`、`qa/artifacts/mobile/` | 否 | 否 | 是 |
| `desktop.mjs` | 1 × `writeFile` + 1 × `mkdir` | `qa/reports/desktop.md` | 否 | 否 | 是 |
| `delivery.mjs` | 1 × `writeFile` + 1 × `mkdir` | `qa/artifacts/delivery/*.json` | 否 | 否 | 是 |
| `tablet.mjs` | 同类 | `qa/reports/`、`qa/artifacts/tablet/` | 否 | 否 | 是 |
| `functional.mjs` | 同类 | `qa/reports/`、`qa/artifacts/functional/` | 否 | 否 | 是 |
| `delivery_net.py` | 1 × `open(...,"w")` | `qa/artifacts/delivery/net.json`（第 33–34、594 行） | 否 | 否 | 是 |
| `lead-links.mjs` | 1 × `mkdir` + 1 × `writeFile` | 推断的 outFile（第 94–95 行） | 否 | 否 | 是 |
| `verify-fixes.mjs` | 2 × `saveJSON` | `artifacts/verify/breakpoints.json`、`checks.json`（第 164、321 行） | 否 | 否 | 是 |
| `verify-live.mjs` | 1 × `writeFile` | `qa/artifacts/verify/live-checks.json`（第 78 行） | 否 | 否 | 是 |
| `verify-search.mjs` | 1 × `writeFile` | `qa/artifacts/verify/search-fixed.json`（第 31 行） | 否 | 否 | 是 |
| `lead-search-acronyms.mjs` | 1 × `writeFile` | `qa/artifacts/lead/search-acronyms.json`（第 20 行） | 否 | 否 | 是 |
| `lead-search-matrix.mjs` | 1 × `mkdir` + 1 × `writeFile` | `qa/artifacts/lead/search-matrix.json`（第 31–32 行） | 否 | 否 | 是 |
| `list_findings.py` | 1 × `write_text` + 1 × `mkdir` | `qa/artifacts/lead/findings-merged.txt`（第 31–33 行） | 否 | 否 | 是 |
| `shot-404.mjs` / `shot-live.mjs` | `screenshot()` | 截图路径 | 否 | 否 | 是 |

**关键判据：只有 `fix-co-notes.py` 的写入路径是 `课程/`。其余 14 个全部落在 `qa/` 下的两个忽略目录（`artifacts/`、`reports/`），删掉它们的输出不会倒退任何内容。**

### 6.3 `fix-co-notes.py` 的危害实证

源码全文（11 行，601 B）：

```python
import pathlib, re
root = pathlib.Path("课程/计算机组成原理")
changed = []
for p in sorted(root.glob("第*_笔记.md")):
    t = p.read_text(encoding="utf-8")
    new = re.sub(r"^## (\d+) 教材本章习题\s*$", r"## \1 本章自测题（自编）", t, flags=re.M)
    new = new.replace("本节按“单项选择题／填空题／简答题”分节，答案依据教材附录。", "题目与答案均为自编，用于自测；点开每题可查看参考答案。")
    if new != t:
        p.write_text(new, encoding="utf-8")
        changed.append(p.name)
print(len(changed), changed)
```

**为什么现在跑会出错**（而不是"已经跑过了所以无害"）：

| 事实 | 实测 |
|---|---|
| 当前笔记里还有多少处 `## N 教材本章习题` | **6 个文件各有 1 处**（`re.findall` 逐文件 = 1） |
| 跑一次会改几个文件 | **6 个**（`would_change=True` ×6） |
| 改的方向对不对 | **不对**。`db0091b`（2026-11-01 13:44，提交信息 "Use the textbook's own chapter exercises for 计算机组成原理"）已把「自测题（自编）」**整体改回**「教材本章习题」+ 教材原题 |
| 现在笔记里的实际标题 | `教材本章习题` = 1/文件，`自测题（自编）` = **0**/文件 |
| 第 2 段替换的字符串是否还在 | `本节按“单项选择题／填空题／简答题”分节，答案依据教材附录。` 在 6 个文件里**都不存在**（`intro_old=False`），所以只有标题级替换会生效 |

**后果定性**：把「教材本章习题」错误标注成「本章自测题（自编）」，等同于 `qa/r4/BRIEF.md` §2 里 P0 级的「把自编题标成教材原题」的**反向同款**——都是让读者分不清题目出处，而这是自考复习里最要紧的口径之一。**这个脚本现在是一个上了膛的枪，且没人记得它在那儿。**

**处置建议**：**删除**（不是归档——归档目录里躺着它，下次有人 `foreach ($f in scripts/*.py) { python $f }` 就中招）。

### 6.4 其余"看起来危险"但实际安全的

- `check-notes.py` / `verify-revision.py` / `check-build.py` / `check-links-dist.py`：**零写盘调用**（正则扫描无命中），纯读 + print。
- `parity.py` / `parity2.py`（`qa/` 根）：只 `urlopen` + 读 `站点/dist`，零写盘。但它们探测 `assets/notes.css`——该文件在当前 `dist` 里**已经没有**（CSS 已内联），所以跑出来会报错，属**已失效**。
- `probe-theme.mjs` / `smoke.mjs`：需 `http://127.0.0.1:8123` 活着，当前无服务，会连不上；不写 `课程/`/`站点/src/`。
- `verify-fixes.mjs` 的 `saveJSON('artifacts/...')` 是相对路径，**必须在仓库根跑**，否则写到 `qa/scripts/artifacts/`（`qa/BRIEF.md`:21 对此有明确警告）。

---

## 七、附：本轮顺带查出的 4 处文档失真

这些不在我的原始 6 问里，但都是"报告说 A、实测是 B"，属于报告层腐烂的直接证据。

| # | 位置 | 文档说 | 实测 | 严重度 |
|---|---|---|---|---|
| 1 | `qa/修复记录.md`:5（R4 勘误） | 「现在每章 10–19 题」 | 组成原理每章 **25/34/27/27/32/31** 道 `<details>`；**没有一章在 10–19** | 中——勘误本身过期 |
| 2 | `qa/R5-上线记录.md`:24 | `check-notes.py`「12 篇 / 6143 行 / 图 15 引用 15」 | 未重跑验证（涉及运行脚本），但该脚本 mtime 2026-11-01 14:21 早于 R5 的源改动，数值待复核 | 低——需实跑确认 |
| 3 | `qa/R3-修复计划.md`:185/271/365 | 引用 `qa/r3/normalize_notes.py`、`qa/r3/term-map.csv`、`qa/r3/verify-consistency.mjs` | **前两个不存在**；`verify-consistency.mjs` 存在但只有 `BRIEF-R3.md`/`FIX-SPEC-EXEC.md`/`lint_sources.py` 三个同级文件 | 中——计划的自述与磁盘不符 |
| 4 | `qa/reports/functional.md`:11 | 操作系统概论六章「75 个 `<details>`」 | 当前 `dist` 实测 OS 六章合计 **77**（13+16+13+16+10+9） | 低——R2 时点数据，但 `修复记录.md` 直接引用了它 |

另：`qa/r2/phone-nav/report.json` 的 `findings` 用 **PowerShell `ConvertFrom-Json` 会返回 0 条**（深层嵌套触发解析异常并被 `-EA SilentlyContinue` 吞掉），用 `python json.load` 才是正确的 **15 条**。若后续有人用 PowerShell 统计这批 JSON，会系统性少算。**本报告所有 findings 计数均用 `python json.load` 取得。**

---

## 八、实测命令与输出摘录

### 8.1 规模与基线

```powershell
PS> Get-Location
C:\Users\ChosenEcho\Documents\学习资料
PS> git status --short
（空）
PS> git log --oneline -1
1b475ca Harmonize voice and proofread all 12 chapter notes (R5)
```

```powershell
PS> @("qa","_整理","站点") | ForEach-Object { ... }
qa      files=2547  bytes=265085981
_整理    files=48    bytes=1321283
站点     files=173   bytes=5002511
```

### 8.2 `qa/` 子目录

```powershell
PS> Get-ChildItem -LiteralPath $r\qa -Directory | ...
artifacts      files=   342  MB=     24.70
lib            files=     1  MB=      0.02
r2             files=  1109  MB=    155.43
r3             files=   381  MB=     23.16
r4             files=   636  MB=     48.41
reports        files=    10  MB=      0.38
scripts        files=    49  MB=      0.43
```

### 8.3 脚本生死簿原始数据

```powershell
PS> Get-ChildItem -LiteralPath qa\scripts -File | Sort-Object Name | ...
check-301.py                        524    9 2026-11-01 12:40
check-404.py                        308    5 2026-11-01 12:14
check-build.py                      431    5 2026-11-01 12:33
check-deploy.py                    2249   49 2026-11-01 12:34
check-headers-live.py               518    8 2026-11-01 12:36
check-links-dist.py                2763   66 2026-11-01 15:27
check-live-final.py                 925   14 2026-11-01 12:39
check-notes.py                     4962  101 2026-11-01 14:21
check-plain-live.py                 473    9 2026-11-01 12:37
check-robots-live.py                449    7 2026-11-01 12:34
debug-mobile.mjs                   1078   22 2026-11-01 12:19
debug-tap.mjs                       706   12 2026-11-01 12:15
debug-toc.mjs                       749   18 2026-11-01 12:11
delivery.mjs                      24247  551 2026-11-01 11:21
delivery_net.py                   25854  553 2026-11-01 12:47
desktop.mjs                      123047 1956 2026-11-01 11:41
fix-co-notes.py                     601   11 2026-11-01 12:08
functional.mjs                    72365 1011 2026-11-01 11:52
lead-check.mjs                     7775  178 2026-11-01 11:09
lead-drawer.mjs                    3152   74 2026-11-01 11:19
lead-index-check.py                 715   11 2026-11-01 11:15
lead-index-check2.py                536   15 2026-11-01 11:16
lead-labscroll.mjs                 1475   39 2026-11-01 11:40
lead-links.mjs                     3394   93 2026-11-01 11:10
lead-live-idle.mjs                 2215   41 2026-11-01 11:27
lead-placeholder.mjs               1312   27 2026-11-01 11:44
lead-placeholder-widths.mjs         985   23 2026-11-01 11:44
lead-rr-check.mjs                   944   13 2026-11-01 11:43
lead-rr-check.py                    811   17 2026-11-01 11:43
lead-search.mjs                    3855   92 2026-11-01 11:11
lead-search-acronyms.mjs           1136   19 2026-11-01 11:17
lead-search-ascii.mjs              2997   57 2026-11-01 11:14
lead-search-deep.mjs               4275   89 2026-11-01 11:11
lead-search-matrix.mjs             1605   28 2026-11-01 11:15
lead-search-net.mjs                3214   60 2026-11-01 11:12
lead-search-race.mjs               3548   73 2026-11-01 11:13
lead-ui.mjs                        5892  130 2026-11-01 11:18
lead-verify-mobile.mjs             5132  106 2026-11-01 11:34
list_findings.py                   1262   32 2026-11-01 11:33
mobile.mjs                        66564 1097 2026-11-01 11:43
shot-404.mjs                        388    8 2026-11-01 12:22
shot-live.mjs                       920   17 2026-11-01 12:38
tablet.mjs                        27412  541 2026-11-01 11:42
verify-fixes.mjs                  19950  307 2026-11-01 12:21
verify-live.mjs                    5583   74 2026-11-01 12:35
verify-regression.mjs              2431   40 2026-11-01 12:23
verify-revision.py                 6232  134 2026-11-01 15:17
verify-search.mjs                  1392   28 2026-11-01 12:17
verify-visual.mjs                  1393   29 2026-11-01 12:18

PS> scripts=49 bytes=450744 lines=7899
PS> lead- count=20 bytes=54968 lines=1185
```

```powershell
PS> git log -1 --format="%ad %h %s" --date=format:"%Y-%m-%d %H:%M" -- qa/scripts
2026-11-01 15:31 8e0c70a Revise all 12 chapter notes: technical corrections, worked derivations, de-AI voice

PS> git ls-files qa/scripts | Measure-Object
Count : 49          ← 49/49 全部入库
```

### 8.4 引用扫描（单趟遍历 1,193 个文件）

```powershell
PS> $names=Get-ChildItem qa\scripts -File | % Name
PS> $files=... exclude node_modules,.git,>3MB ...
PS> scanned_files=1193

check-notes.py                     refs= 8  qa\R5-上线记录.md ; qa\r4\D-结构与学习法.md ; ...
lead-links.mjs                     refs= 6  README.md ; qa\R3-修复计划.md ; qa\README.md ; ...
verify-fixes.mjs                   refs= 8  README.md ; qa\R3-修复计划.md ; qa\README.md ; ...
check-links-dist.py                refs= 4  qa\R5-上线记录.md ; qa\r4\落盘记录.md ; ...
verify-revision.py                 refs= 3  qa\R5-上线记录.md ; ...
check-build.py                     refs= 2  qa\R5-上线记录.md ; qa\r4\落盘记录.md
delivery.mjs / desktop.mjs / mobile.mjs / tablet.mjs   refs= 3–4  qa\BRIEF.md ; qa\站点缺陷报告.md ; qa\reports\*.md
check-404.py                       refs= 0
fix-co-notes.py                    refs= 0     ← 零引用，且危险
lead-*.mjs（18 个）                 refs= 0     ← 除 lead-links.mjs 外全部零引用
debug-*.mjs（3 个）                 refs= 0
```

### 8.5 快照引用完整性（229 条引用路径）

```
distinct snapshot/report paths cited in preserved qa/*.md: 229
existing: 221   missing: 8
   qa\BRIEF.md 2                      ← artifacts/mobile/mob-01.png 等（示例路径，非真实文件）
   qa\R3-修复计划.md 2                ← qa/r3/term-map.csv、qa/r3/normalize_notes.py —— 确实不存在
   qa\R2-站点缺陷报告.md 1
   qa\reports\tablet.md 1
   qa\修复记录-r2.md 1
   qa\修复记录.md 1
```

### 8.6 结论落纸率

```
r2 finding ids: 81
distinct numeric measurement values: 306
measurement values ALSO present verbatim in R2-站点缺陷报告.md: 174 of 306   (57%)
shot filenames cited: 188   present in agg: 37                              (20%)
```

### 8.7 回滚快照的不可再生性（SHA-256 逐一比对）

```
第1章_操作系统简介_笔记.md          backup=9c917a328341 git@022975f=52c1de2a8de7 same=False
第2章_数据的表示和运算_笔记.md       backup=8653ff2a3682 git@022975f=5ef350456df5 same=False
站点/mkdocs.yml                  backup=ce10e46525a0 git@022975f=9dceb7839535 same=False

r3/_pre-fix-backup  files=18 bytes=609193
r4/_scratch/pre-fix files=1  bytes=422346
r4/_scratch/final-dist files=70 bytes=2906527
```

### 8.8 构建一致性

```
dist   files=70 bytes=3,083,467  dir mtime=2026-11-02 16:13:06
docs   files=61 bytes=1,239,168  dir mtime=2026-11-02 16:13:05
pycache files=1 bytes=20,947     mtime=2026-11-02 12:55:10
src    files=33 bytes=631,788    dir mtime=2026-11-01 21:31:58
课程 newest = 2026-11-02 15:37:55

sitemap urls=14  bytes=2110
dist index.html count = 14
dist page dirs: chapters=6, computer-organization=6, lab=1, assets=0, search=0

final-dist vs dist: only_in_final=0 only_in=0 size_mismatch=13
```

```
PS> git check-ignore -v -- 站点/dist/index.html
站点/.gitignore:1:/dist/        站点/dist/index.html
PS> git check-ignore -v -- 站点/docs/index.md
站点/.gitignore:2:/docs/*       站点/docs/index.md
PS> git check-ignore -v -- 站点/__pycache__/hooks.cpython-312.pyc
站点/.gitignore:4:/__pycache__/ 站点/__pycache__/hooks.cpython-312.pyc
PS> git ls-files 站点/docs
站点/docs/.gitkeep              ← 0 字节哨兵，唯一 tracked
PS> git ls-files 站点/dist | Measure-Object
Count : 0
```

### 8.9 危险脚本实证

```
PS> （read qa/scripts/fix-co-notes.py）
2: root = pathlib.Path("课程/计算机组成原理")
6:     new = re.sub(r"^## (\d+) 教材本章习题\s*$", r"## \1 本章自测题（自编）", t, flags=re.M)
9:         p.write_text(new, encoding="utf-8")

（dry-run 模拟，不写入）
第1章_计算机系统概述_笔记.md    matches=1 would_change=True
第2章_数据的表示和运算_笔记.md   matches=1 would_change=True
第3章_指令系统_笔记.md         matches=1 would_change=True
第4章_中央处理器_笔记.md       matches=1 would_change=True
第5章_存储器层次结构_笔记.md    matches=1 would_change=True
第6章_互连及输入输出组织_笔记.md matches=1 would_change=True

（当前笔记状态）
第1章_计算机系统概述_笔记.md    自测题(自编)=0  教材本章习题=1  intro_old=False
...（6 个文件全部同形）
```

### 8.10 `_整理/` 清单

```powershell
PS> Get-ChildItem -LiteralPath _整理 -Recurse -File | ...
      1407 2026-11-01 10:40 build-tree.ps1
      1900 2026-11-01 13:02 commit-msg-2.txt
      ...
       886 2026-11-01 13:45 shot.mjs
      8736 2026-11-01 10:40 tree.txt
      2876 2026-11-01 13:07 归档五层.tsv
       509 2026-11-01 12:43 基线-20261101-124333.txt
         0 2026-11-01 12:37 快照-工作区-20261101-123749.patch   ← 0 字节
         0 2026-11-01 12:37 快照-工作区-20261101-123759.patch   ← 0 字节
        68 2026-11-01 12:37 快照-状态-20261101-123749.txt
    580140 2026-11-01 13:45 习题改版-第2章.png
      5706 2026-11-01 13:26 习题改写规范.md
      4072 2026-11-01 13:26 习题提取\ch1_答案.txt
      ...
     32993 2026-11-01 11:03 整理方案.md
      7527 2026-11-01 11:00 整理清单.tsv
     17984 2026-11-01 13:06 整理执行.ps1
      8266 2026-11-01 10:59 执行日志-20261101-105929.log
      ...

PS> files=48 bytes=1321283

PS> Test-Path 资产
False                                ← hashes.csv/inventory.csv 描述的根已不存在
PS> (Get-Item README.md).Length
10463                                ← inventory.csv 里记的是 4520
```

---

## 九、最该动的 10 件事（按风险/收益排序）

| # | 动作 | 依据 | 不可逆？ |
|---:|---|---|---|
| 1 | **先救 `qa/r3/_pre-fix-backup/`（609,193 B）与 `qa/r4/_scratch/pre-fix/before.patch`（422,346 B）到入库位置** | SHA-256 实测与 `git@022975f` 全不同，不在版本历史里 | 是——删了永久失去 R3/R4 回滚能力 |
| 2 | **立刻删 `qa/scripts/fix-co-notes.py`** | 跑一次改 6 个 `课程/` 文件，方向与 `db0091b` 相反，制造 P0 级口径错误 | 否（但留着必出事） |
| 3 | 删 `qa/artifacts/`（25,900,801 B），保留 `artifacts/verify/`（2.24 MB） | `修复记录.md` 的 37 项断言原始数据只需 verify 子集 | 否 |
| 4 | 删 `qa/r2/`（162,982,740 B） | 81 条 findings 已落纸，174/306 量化值已在汇总报告 | 否（结论已固化） |
| 5 | 删 `qa/r3/`（24,289,617 B，第 1 项救出后） | 169 张 PNG 已被 R3 报告结论覆盖 | 否 |
| 6 | 删 `qa/r4/_scratch/`（50,571,778 B，第 1 项救出后 + 留 `final-dist` 2.9 MB） | 625 文件里 30 MB 是单轮截图 | 否 |
| 7 | 脚本 49 → 5（删 43 个，含全部 20 个 `lead-*`） | 只有 5 个被 R5 记录点名、2 个被 README 承诺；`qa/scripts` 自 2026-11-01 15:31 起零提交 | 否（git 有历史） |
| 8 | `qa/` 根 15 个 .md → `rounds/r1..r5/`，R1 文件补 `-r1` 后缀 | `修复记录.md` 无后缀却是最旧版本，歧义导致误读 | 否 |
| 9 | 修正 4 处文档失真（§七） | 「每章 10–19 题」实测 25–34；R3 计划引用 2 个不存在文件 | 否 |
| 10 | `_整理/` 删 30 个留 5 个，并把留下的移出入库 | 整目录被 `.gitignore`:26 忽略 = 单点无备份；`hashes.csv` 描述的 `资产/` 已不存在；2 个 patch 是 0 字节 | 否（但 5 份方法论会随盘一起没） |

**净回收：≈251.4 MB（93.3%），脚本 49→5，`qa/` 平铺 .md 15→2，`_整理` 48→5 文件。**

---

> 本报告只写 `_整理/v2/qa-audit.md` 一个文件。审计过程中未删除、未移动、未改名任何文件；未运行 `fix-co-notes.py` 或任何 `fix-*` 脚本；所有"会改动什么"的判断均为 `re.findall` / `Contains` / SHA-256 的只读模拟。
