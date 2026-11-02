# 项目与文档一致性：审阅报告

> 角度：接手维护这套仓库的工程师。审阅对象是**工作区当前状态**（HEAD = `022975f`，另有 8 篇笔记 + 8 个站点文件未提交）。日期 2026-11-02。

## 一句话结论

构建是真的、站点是真的、37 项断言也是真的；但 README 的数字停在两轮之前（81 应为 70），「钩子会报错」是假承诺，生产站点由未提交工作区构建，174 MB 证据目录随时会被 `git add -A` 写进公开历史。

## 旧账落实情况

只列与项目/文档层相关的条目；笔记内容类勘误归 A/B。

| 勘误条目 | 状态 | 当前证据 | 备注 |
|---|---|---|---|
| `qa/rounds/r5/修订规范与勘误清单.md:20` 习题节标题不许改名 | 已落实 | 12/12 章均 `## N 教材本章习题`，`hooks.py:33` 能匹配 | — |
| 同上 `:21` 题号必须行首 `**N. ` | 已落实 | 165 处；另有 4 处 `**题目：**`/`**教材原题：**` 由 `hooks.py:155` 兼容 | — |
| 同上 `:22` 答案起始三种形式 | 部分落实 | 源里还有 `答案：**一**。` 1 处（`答案：` 后紧跟 `**`），靠 `hooks.py:52` 兜住；`**参考答案：**` 完全不认 | 见 E14 |
| 同上 `:24` 图/ 下「已存在的 14 个 SVG」 | 未落实（数字错） | 实测 `课程/操作系统概论/图/` 有 **15** 个 SVG，且 15 个全被引用；README:9 写的 15 才对 | 见 E1 表 |
| 同上 `:25` 组成原理「一个图都不许加」 | 已落实 | `hooks.py:280-298` 的 CO 循环确无图像分支；但 README:97 说两门课都搬图，与之矛盾 | 见 E5 |
| `qa/rounds/r1/修复记录.md:9` PASS 37/37 | 已落实 | `verify-fixes.mjs` 37 个 `add()`、37 个不同 id | ✓ |
| `qa/rounds/r1/修复记录.md:41` CO 表格折叠、每章 5 题 | 未落实（已成死代码） | `table_exercises()` 永不触发；CO 每章实际 10/19/12/12/17/16 题 | 见 E9 |
| `qa/rounds/r1/修复记录.md:69` CO 六章改「自测题（自编）」 | 已反向 | 全部 12 篇均为「教材本章习题」+ 教材原题（`db0091b` 反转） | 见 E9 |
| `qa/rounds/r1/修复记录.md:31` 未改动 `.github/workflows/pages.yml` | 已失效 | 文件与整个 `.github/` 在 `022975f` 删除 | 见 E8 |
| `qa/rounds/r1/修复记录.md:119` Actions 工作流 disabled_manually | 已失效 | 工作流已删，不再是"禁用"而是"不存在" | 见 E8 |
| `README.md:66` 产物 81 个文件 | 未落实 | 实测 70；R2 上线记录当时已记 70 | 见 E1 |

## 发现清单

口径说明：本角度按工程后果映射 BRIEF 的严重度——P0 = 照文档做必错且不报错/构建必失败；P1 = 会静默产生错误状态、不可复现或不可逆；P2 = 明显不一致、维护性缺口；P3 = 打磨。构建实测：`--strict` **exit 0，0.83 s，70 个文件**，仅 1 条 `print()` 告警（见 E11）。
（操作修正：`--site-dir` 是相对 `站点/mkdocs.yml` 解析的，任务里给的相对路径会落到 `站点/qa/…`；本轮已清掉该误生成目录，改用绝对路径重建，未触碰 `站点/dist`。）

### P0
无。构建通过，未发现从项目/文档角度会直接导致"学了会错"的问题。

### P1

#### E1. README 的构建产物数字比现状多 11 个文件（81 vs 70），且这不是第一次漂
- 位置：`README.md:66`
- 原文：「（81 个文件、14 个页面 + 404、sitemap 14 条）」
- 问题：实测 70。同一个数字在同一批文档里有三个版本：`_整理/整理方案.md:48`「产物 79 个文件，12 个页面」→ `qa/rounds/r2/站点缺陷报告.md:45`「结果：**81 个文件 / 4,515,799 B**」→ `qa/rounds/r2/上线记录.md:5`「→ 70 文件 / 2,689,667 B（含自托管 KaTeX 23 个文件）」。README 抄的是中间那个。
- 重算/核对：81 → 70 的差额可以用未提交改动逐项对上——产物新增 24 个（KaTeX 23 + `assets/math.js` 1）+ 2 个（`favicon.ico`、`apple-touch-icon.png`）= +26；`hooks.py:347-369` 新增的裁剪删掉 37 个（lunr 语言包 34−3 保留 = 31、`.map` 4、`notes.css` 1、`favicon.png` 1）。26 − 37 = **−11**，81 − 11 = 70，与实测一致。`站点/dist/` 现存目录也是 70 个文件，不是我这一台机器的偶发。
- 建议：改成 70，并加一句"文件数随 Material 版本与裁剪规则变化，别照抄"；更适合的做法是在 README 写"构建后 `Get-ChildItem 站点/dist -Recurse -File | Measure-Object` 现场数"。
- 置信度：确定

**数字声称 vs 实测全表**（构建到 `qa/r4/_scratch/E/dist`，SITE_URL 取默认生产域）

| 声称 | 出处 | 实测 | 判定 |
|---|---|---|---|
| 81 个文件 | `README.md:66` | **70**（2,710,478 B） | ✗ 差 11 |
| 14 个页面 + 404 | `README.md:66` | 14 个 `index.html` + `404.html` | ✓ |
| sitemap 14 条 | `README.md:66` | 14 个 `<loc>` | ✓ |
| 37 项断言 | `README.md:13`、`:122` | `add(` 37 处，id 37 个 | ✓（脚本头注释却写「36 个缺陷」，属自述不齐） |
| 15 张 SVG | `README.md:9` | `图/` 15 个 `.svg`，产物 `assets/figures/` 15 个 | ✓ |
| 六章 ×2 门 | `README.md:35`、`:37` | OS 6 篇 + CO 6 篇 | ✓ |
| 产物逐字节不变 | `README.md:103` | 连建两次，70 个文件 SHA256 **0 差异** | ✓ |
| 部署两步命令 | `README.md:80-83` | 静态核对通过；本环境 `wrangler` 起不来（node spawn EPERM，沙箱限制） | 待核 |
| `book.md` 5631 行 | `课程/计算机组成原理/README.md:16` | 5632 行 | 差 1，量法未写（建议"约 5 600 行"） |
| 插图 271 张 | `课程/计算机组成原理/README.md:17` | 271 | ✓ |
| 79 个文件 | `_整理/整理方案.md:48` | 70 | 已过期（历史基线） |

#### E2. 「多一个匹配文件时钩子会报错」是假承诺；真正的行为是静默取一个
- 位置：`README.md:130`；`站点/hooks.py:245`、`:281`
- 原文：「多一个匹配文件时钩子会报错，不会静默取一个」
- 问题：代码是 `file = next(SOURCE.glob(f'第{n}章*_笔记.md'))`。`next()` 在**多个**匹配时返回第一个（顺序取决于文件系统扫描），不抛异常；只有**零个**匹配才 `StopIteration` 崩构建。我在 `_scratch/E/globtest/` 放了两个匹配文件复现：`next()` 正常返回第一个，无异常。同理 `for n in range(1, 7)`（`hooks.py:244`、`:280`）意味着第 7 章起的笔记**静默不进站点**，也不报错——这正是"加一门课"最容易踩的坑（章数 ≠ 6 时，多出来的章凭空消失）。
- 建议：README 改成实际语义；代码侧把 `next(...)` 换成 `sorted(glob(...))` + `if len(matches) != 1: raise SystemExit(...)`，把静默变响。这一步不改，README 那句"不会静默取一个"就是在骗下一个维护者（也可能是三个月后的你）。
- 置信度：确定

#### E3. 线上站点由未提交工作区构建，关键资产根本没入库——HEAD 不可复现，换机即降级
- 位置：`qa/rounds/r2/上线记录.md:69`；`git status`
- 原文：「`站点/` 与 `课程/` 的修复仍是 working tree 改动」
- 问题：R2 上线（2026-11-01）就是拿工作区构建的，今天仍如此：8 个站点文件、8 篇笔记是 modified，另有 5 项 **untracked**——`站点/overrides/main.html`、`站点/src/assets/katex/`（23 文件 546 KB）、`站点/src/assets/math.js`、`站点/src/favicon.ico`、`站点/src/apple-touch-icon.png`。其中两项是硬依赖：`站点/mkdocs.yml:72` 的 `assets/katex/katex.min.css` 与 `hooks.py:384-386` 注入的 `katex.min.js`。任何人从远端 clone 这一版 `mkdocs.yml` 却拿不到未跟踪的 KaTeX，组成原理六章 355 个公式会整体退回源码状态（`.arithmatex` 不渲染），**构建不报错**。`overrides/main.html` 也没有入库，它是 `404.html:1` 的父模板，同时承担 localStorage 被禁时的内存 shim。
- 重算/核对：`hooks.py` 的产物侧取证——12 个章节页里 CO 六页 `katex_js=True`、OS 六页 `False`；`grep class="arithmatex"` 在 CO 六章合计 33/74/27/56/89/76 = 355，与 R2 上线记录的 355 一致。
- 建议：先把这 5 项 `git add` 再谈其它改动；`git status --porcelain` 非空就别部署（`_整理/整理方案.md:265` 早就提过这个断言，只是没人落地——见 E15）。
- 置信度：确定

#### E4. `qa/r2` + `qa/r3` 共 1412 个文件 / 173.7 MB 未跟踪，且 `.gitignore` 没管——一次 `git add -A` 就永久写进公开历史
- 位置：`.gitignore:20`；`git status`
- 原文：「qa/artifacts/」（`.gitignore` 里与 qa 有关的唯一一条）
- 问题：实测 `qa/r2` 1109 个文件 155.4 MB、`qa/r3` 303 个文件 18.3 MB，全部未跟踪、未忽略，`git status` 里就一行 `?? qa/r2/`、`?? qa/r3/`（外加 `?? qa/r4/`）。README 说"本仓库挂着公开远端"（`:20`），而 `.gitignore:22-23` 连 `esa-deploy/` 都单独标明"含真实服务器信息与凭据，绝不入库"——却漏了这两坨最大的本地证据目录。真发生了 `git add -A && push`，174 MB 进历史后想清干净只能 `filter-repo` 重写 + 强推。
- 建议：`.gitignore` 加 `qa/r2/`、`qa/r3/`、`qa/r4/_scratch/` 三条；`qa/r4/_scratch/` 是我本轮的唯一写区，也必须一起忽略。另外给 `qa/README.md` 写一句"r2/r3/r4 是证据快照，本地保留、不入库"，免得下一个人以为是漏提交。
- 置信度：确定

### P2

#### E5. README 把 hooks 的能力说大了一圈：两门课都搬图、docs/ 是手写目标
- 位置：`README.md:97`
- 原文：「再读两门课的笔记，把插图复制到 `站点/docs/assets/figures/`」
- 问题：`hooks.py:248-261` 的图像替换只在**操作系统概论**循环里；组成原理循环（`:280-298`）连 `image()` 函数都不调。`qa/rounds/r5/修订规范与勘误清单.md:25` 说得很清楚：「构建管道只给操作系统概论搬图，加图必成裂图」。今天 CO 零张图所以看不出症状，一旦给 CO 加一张图就是裂图且不报错。README 与勘误清单两份文档互相矛盾，代码只站后者。
- 建议：README:97 加"（仅操作系统概论；组成原理当前不搬图，加图需先补 hooks.py 的 copy 分支）"。
- 置信度：确定

#### E6. 「加一门课」五步能跑通，但漏 4 个隐性步骤；其中 2 个静默失败、1 个会把页面变成孤儿
- 位置：`README.md:128-137`；`站点/hooks.py:163-207`、`:229-298`、`:375-376`
- 逐步实测（漏了会怎样）：

| 步骤 | README 说法 | 实际要动的代码 | 漏了会怎样 |
|---|---|---|---|
| 1 建目录、`第N章*_笔记.md` | 文件名必须匹配；多一个会报错 | `hooks.py:245`、`:281` | **静默**：多出来的章不生成；少一章 `StopIteration` 才崩。README 的"报错"是假的（E2） |
| 2 补一段生成逻辑 | 「照着现有两门课补一段…章数、输出目录、`data-chapter` 前缀、是否复制图」 | 还要补 `CROSS_BOOKS`（`:163-166`，否则跨书链接指不到新书）、`chapter_nav` 的 `number < 6`（`:219`，最后一章会生成"下一章"死链）、`on_post_build` 的 KaTeX 白名单（`:375-376` 只列了 `chapters` 与 `computer-organization`，新课的公式页**不会注入 KaTeX**） | 静默：公式不渲染、章末死链 |
| 3 `mkdocs.yml` nav 加 6 条 | 加 6 条 | — | **响**：`--strict` 下"docs 里有页面但不在 nav"直接报错 |
| 4 `index.md` 加卡片/6 链接/进度块 | 加 | 还要加 `data-next-chapter`（`:44` 全局只有一处） | 静默：首页没有入口，读者找不到课 |
| 5 `interactions.js` 课程码 | 「漏这一步的症状是『勾选能存、首页进度永远是 0』」 | `:166` 的 `["os","co"]`、`:167` 的前缀规则、`:175-176` 的 `["1"…"6"]` | 静默：正是 README 说的那样；但只提到"进度 0"，没说"继续复习"也永远停在 OS |

- 建议：把上表直接搬进 README 第 5 节；`hooks.py` 侧把三门课抽成 `COURSES = [{...}]` 配置数组（`_整理/整理方案.md:265` 已经设想过 `'dir':` 计数断言），一步到位消掉"复制一段再改"。
- 置信度：确定

#### E7. 首页只有一个「继续复习」入口，且写死为操作系统概论
- 位置：`站点/src/index.md:44`；`站点/src/assets/interactions.js:173-181`
- 原文：`data-next-chapter href="chapters/chapter-1/"`
- 问题：`renderProgress()` 里 `document.querySelector("[data-next-chapter]")` 全页只有一个，候选章号写死 `["1"…"6"]`，语义是 OS 的章码（CO 是 `co-N`）。所以组成原理没有"继续复习"，勾完 CO 六章后首页那个按钮仍显示 OS 的进度。README:45 说"首页会显示两门课各自复习到第几章…并给出「继续复习」入口"，读起来是两门课都有。
- 建议：README 改成"操作系统概论有「继续复习」，组成原理从章节列表进入"；或给 CO 也发一个 `data-next-chapter` 并让 JS 按课程参数化。
- 置信度：确定

#### E8. 修复记录的"改了哪些文件"整表指向派生目录，照着改会改到生成物
- 位置：`qa/rounds/r1/修复记录.md:19-26`
- 原文：「`站点/docs/assets/notes.css`」
- 问题：`551d061`（拆分 `站点/src/`、`docs/` 纯派生）之后，`站点/docs/` 每次构建被 `hooks.py:229-240` 整目录清空重建。按这张表去 `站点/docs/assets/notes.css` 改样式，改动会在下次构建消失，症状是"改了没效果"。当前真实源在 `站点/src/assets/notes.css`。同表还有 `站点/docs/index.md`、`站点/docs/robots.txt`、`站点/docs/_headers` 三行，全部错位。`qa/rounds/r2/修复记录.md:205` 反而写对了（「`站点/docs/`、`站点/dist/` 为派生产物，未手改」）——两份修复记录自相矛盾。
- 建议：给 `qa/rounds/r1/修复记录.md` 顶部加一行勘误"本表路径按 `551d061` 之前记，实际源在 `站点/src/`"；长期做法是把修复记录里所有 `站点/docs/` 批量替换为 `站点/src/` 并补一句"docs/ 是派生物"。
- 置信度：确定

#### E9. 修复记录有三条"已修"经不起当前代码核对：一条被后续 commit 反向，一条机制已成死代码
- 位置：`qa/rounds/r1/修复记录.md:41`、`:69`；`站点/hooks.py:107-113`、`:151-152`
- 原文：「hooks 增加表格习题折叠；六章各 5 题默认收起（原 0 个）」
- 问题：
  1. `table_exercises()` 只在"该节没有 `**N.` 题号"时被调用（`:151-152`），而 12 章的习题节**都有** `**N.` 题号（实测每节 9–19 个），函数因此永不触发——死代码，docstring 里的「Only used for exercise sections that contain no ``**N.`` questions」已成绝响。
  2. 折叠本身没坏，但走的是 `exercise()` 的编号路径；CO 每章实际 10/19/12/12/17/16 题，不是"各 5 题"。
  3. P3-12「6 个源文件标题与导语改为「自测题（自编）」」被 `db0091b` 整体反向，现在 12 篇全是「教材本章习题」+ 教材原题。这条"已修"今天读起来正好是反的。
- 建议：删掉 `table_exercises()` 与 `TABLE_RULE`（省 40 行），或在 docstring 里注明"保留给未来的表格题；当前 0 处调用"；修复记录该两条加"已被 db0091b 推翻"。
- 置信度：确定

#### E10. 无 CI、无 lint、无链接检查入流程；质量审计脚本依赖仓库外的 Playwright
- 位置：仓库根（无 `.github/`）；`qa/scripts/verify-fixes.mjs:2`、`qa/lib/audit.mjs`
- 原文：`import { session, PAGES, goto, warm, shot, saveJSON } from '../lib/audit.mjs';`
- 问题：`.github/` 在 `022975f` 删除后仓库没有任何 CI；README:117-124 让人手跑三条命令，但仓库里**没有 `package.json`**，`playwright` 是从 `C:\Users\…\node_modules\playwright` 解析到的（用户级安装），换机/新 clone 直接 `ERR_MODULE_NOT_FOUND`。拼写与词表检查在 `qa/` 里也没有对应脚本（`check-notes.py` 只查结构）。结果就是：37 项断言、链接检查、构建这三件最该自动跑的事，全靠"记得跑"。
- 建议：加一个最小的 GitHub Actions（`pip install -r 站点/requirements.txt` → `mkdocs build --strict` → `node 站点/scripts/test-scheduling.mjs`），只跑不依赖浏览器的部分；浏览器审计补 `package.json`（devDependencies: playwright）并写进 README 的安装步骤。
- 置信度：确定

#### E11. 构建告警不进 `--strict`：悬空的「第 7 章」照样上线，且在本机被 GBK 打成乱码
- 位置：`站点/hooks.py:198-206`；`课程/计算机组成原理/第2章_数据的表示和运算_笔记.md:525`
- 原文：「第 7 章讨论的整数范围与溢出，直接影响程序正确性」
- 问题：`link_chapters()` 用 `print()` 报越界章号，而 `print` 不是 `logging.warning`，`--strict` 不会因此失败；本次构建 exit 0，产物 `computer-organization/chapter-2/index.html` 里仍然原样带着这句"第 7 章"（组成原理只有 1–6 章）。更麻烦的是 Windows 控制台 GBK：这条告警实际打出的是 `[link_chapters] warning: out-of-range chapter reference "�� 7 ��"`，中文字符全丢——等于告警形同虚设。
- 建议：`print` 换 `print(..., file=sys.stderr)` 不够，要换成 `logging.getLogger('mkdocs').warning(...)` 才能让 `--strict` 拦住；同时把 CO2:525 的"第 7 章"改成"第 3 章（整数范围）"或"教材第 2 章后文"。（内容归属 B，机制归属这里。）
- 置信度：确定

### P3

#### E12. README 的站点源清单漏了 5 类文件，「主题覆盖（404 页）」已不完整
- 位置：`README.md:10-11`
- 原文：「`站点/src/` | 站点手写源：首页、调度实验页、`notes.css`、`interactions.js`、`favicon.svg`、`_headers`、`robots.txt`」
- 问题：实际 `站点/src/` 还有 `assets/math.js`、`assets/katex/`（23 文件）、`favicon.ico`、`apple-touch-icon.png`；`站点/overrides/` 除 `404.html` 还有 `main.html`（OG 标签 + localStorage shim）。同一批文件在 git 里也还是未跟踪状态（见 E3），两张"清单"同时失真。
- 建议：README 表补全，并把"主题覆盖（404 页）"改成"主题覆盖（404 页 + 页头 OG/存储兜底）"。
- 置信度：确定

#### E13. KaTeX 的加载条件被代码注释说满了；`.png→.svg` 规则已成空转
- 位置：`站点/hooks.py:371-374`、`:251`；`README.md:99`
- 原文：「pages without math never download the 279 KB payload」
- 问题：条件注入的只有 JS（`katex.min.js` 275,414 B + `auto-render` 3,481 B）；`katex.min.css`（23,335 B）走 `mkdocs.yml:72` 的 `extra_css`，**15 个页面全都加载**，`assets/katex/fonts/` 20 个 woff2 也全量发布。注释里"无公式页面不下载 279 KB"只说对了一半。另外 `.png 同名 .svg 存在则换 .svg`（`:251`）在当前 12 篇笔记里 0 处 `.png` 引用，是纯空转规则；README:99 却把它写成现行能力。
- 建议：注释补一句"仅 JS 按需，CSS/字体仍全局"；README:99 把 `.png→.svg` 降为"历史兼容规则，当前笔记全用 .svg"。
- 置信度：确定

#### E14. 答案标签的第四种形态与一处单题硬编码
- 位置：`站点/hooks.py:90`、`:46-63`
- 原文：「`**（1）计算 Need`」
- 问题：`exercise()` 的答案起点正则把一个具体题目的文字写死进了通用解析器（该字符串至今在源里存在 1 处）；`_answer_block()` 能归一化 `**答案：X**` / `**答案：**` / `答案：X` / `答案：**X**` 四种，但**不认 `**参考答案：**`**——如果谁按渲染后的样子往笔记里写 `**参考答案：**`，`exercise()` 不会把它当答案起点，整段答案会被塞进题干，折叠壳里显示"教材附录未收本题解答"。今天源里 0 处，属于埋着的坑。
- 建议：`**参考答案：**` 加进 `:90` 与 `_answer_block` 的正则；把 `**（1）计算 Need` 换成通用规则（如"答案段以 `**（1）` 打头也算"）。
- 置信度：确定

#### E15. 旧报告的行号锚点集体失效，整理方案的验收断言指向不存在的代码
- 位置：`qa/rounds/r1/笔记审读与顺色报告.md:38`、`:43`；`_整理/整理方案.md:265`、`:267`
- 原文：「（第 9 节，行 279–350）」
- 问题：OS 第 1 章现在只有 304 行，第 9 节是「闭卷复习与跨章联系（补充）」（`:298-304`，7 行），SJF 真题早搬走了——这正是 BRIEF 点名的假阳性；报告里"银行家算法仅给一句话结论、缺 5 列安全性检查表"也已被 `8e0c70a` 补成 `10.1 安全性检查` + 图（`第3章…:270-279`）。`整理方案` 提议的 CI 断言是「断言 `hooks.py` 里 `'dir':` 的条数 == nav 里课程条数」，但当前 `hooks.py` 是两段硬编码循环，没有 `'dir':`；它要插断言的文件 `pages.yml` 也已删除。`:267` 的验收基线「79 个文件、12 个页面」同样过期。
- 建议：旧报告顶部统一加"本文档的行号锚点对应 `<commit>`，之后的重排使其失效，按标题检索"；`整理方案` 的断言改成"nav 里的课数 == hooks 里输出目录数"再落地（配合 E6 的配置数组）。
- 置信度：确定

#### E16. 归档嵌套库路径写错，外部部署目录的体积数字过时
- 位置：`README.md:18`、`:20`；`课程/计算机组成原理/README.md:62`
- 原文：「唯一还带独立仓库的是 `归档/数据结构/`」
- 问题：实际路径是 `归档/自考/数据结构-13181/`（`git -C … remote -v` → `data-structure-13181.git`，远端名对、路径错）。`:20` 的「39 个文件 / 14.2 MB」是 ese-deploy 移出时的量；`Documents\studynote-deploy\` 现在是 36 个文件 / 9.3 MB。CO README:62 的快照引用则是对的（`Documents\_备份\git-bundle-20261101\资产-本地库.bundle` 存在）。
- 建议：改路径、把体积写成"移出时 39 个 / 14.2 MB，现 36 个 / 9.3 MB"或直接删掉体积。
- 置信度：确定

#### E17. 打印能力已经做好了却没写；离线与 PDF 确实缺
- 位置：`站点/src/assets/notes.css:208`、`:338`；`站点/src/assets/interactions.js:362-377`
- 原文：「Print: open every folded answer, then restore the screen state afterwards.」
- 问题：`@media print` 两处 + `beforeprint` 自动展开全部 `details.exercise-answer`、`afterprint` 复位，打印/另存 PDF 是一条能用的路径，README 全篇没有"打印"二字，读者不可能发现。真正的缺口是：无离线（无 service worker / PWA）、无一键导出 PDF、无"整章下载"。这两件事性质不同，别混成一句"没有打印"。
- 建议：README 的"站点"节加一句"Ctrl+P 可直接打印/存 PDF，折叠答案会自动展开"；离线与导出 PDF 记为待办（或明确写"不做"）。
- 置信度：确定

## 该角度的整体判断

这套仓库的文档水平明显高于一般个人笔记项目：README 有目录表、有"东西该放哪"的判据、有明说的取舍（搜索索引不瘦身、隐藏 960–1220 的右栏），`qa/` 有可复现的 37 项断言和逐设备报告，`修订规范` 甚至把 hooks 依赖的结构约束逐条写成了契约。构建也干净：`--strict` 一次过，连跑两次逐字节相同，产物里没有原始 markdown 泄漏（0 处 `**答案`、0 处未渲染竖线表）。

但**文档漂移是系统性的，而且是同一个病根的三种症状**：数字漂（81/79/70 三个版本同时活着）、路径漂（`站点/docs/` → `站点/src/` 之后的报告没跟）、状态漂（"已修"的条目被后续 commit 反向，修复记录自己都不知道）。三者的共同原因是没有任何自动校验——没有 CI、没有链接/词表检查、连"`git status` 是否干净"这种一行断言都只写在整理方案的愿望清单里。而钩子里两条 `print`/`next()` 的静默路径（E2、E11）把这个病放大了：错了不报，报了也没人看得见（GBK 乱码）。

真正的水位：**读文档能学会怎么用，但照着文档去改代码，有一半概率改到生成物或漏掉隐性步骤。** 这不是文字问题，是可维护性问题——现在只有一个人维护，所以还撑得住；一旦隔三个月回来，README 的 81 和 hooks 的"会报错"会先骗你一次。

## Top 5

1. **改 `README.md:66` 的 81 → 70，加一句"文件数会随 Material 版本漂"**——一行改动，消掉最显眼的失实；顺手把 `qa/rounds/r5/修订规范与勘误清单.md:24` 的"14 个 SVG"改成 15。
2. **`.gitignore` 补 `qa/r2/`、`qa/r3/`、`qa/r4/_scratch/`**——防止 174 MB 证据链被一次 `git add -A` 永久写进公开历史，这是本轮唯一不可逆的风险。
3. **把未跟踪的 5 项资产入库**（`overrides/main.html`、`src/assets/katex/`、`src/assets/math.js`、`src/favicon.ico`、`src/apple-touch-icon.png`）——否则下次 clone/换机构建，组成原理 355 个公式整体不渲染且不报错。
4. **把 `hooks.py:245`、`:281` 的 `next(glob())` 改成"唯一匹配否则报错"，`:198-206` 的 `print` 换成 `logging.warning`**——让"多一个文件"和"第 7 章悬空引用"从静默变响，README:130 的假承诺才能改成真承诺。
5. **给 README「加一门课」补上 E6 那张表**（`CROSS_BOOKS`、`chapter_nav` 的 6、`on_post_build` 的 KaTeX 白名单、`data-next-chapter`），并在修复记录顶部加一行路径勘误（`站点/docs/*` → `站点/src/*`）。
