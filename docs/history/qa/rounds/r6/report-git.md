# 嵌套 git 仓库取证与退役报告

- 任务：共享任务板 task-4「三个嵌套 git 仓库的取证与退役方案」
- 项目根：`C:\Users\ChosenEcho\Documents\学习资料`
- 取证时间：2026-11-01 10:4x（+08:00）
- 环境：Windows / PowerShell 5.1.26100.8875 / git 2.55.0.windows.1
- 唯一写入：本文件。对三个内层 `.git` **只执行了读命令**：`rev-parse` / `for-each-ref` / `branch -vv` / `remote -v` / `rev-list` / `ls-files` / `ls-tree` / `show` / `cat-file` / `status` / `log` / `diff` / `fsck --unreachable` / `count-objects` / `stash list` / `check-ignore` / `ls-remote`（远端只读探测）。未执行 bundle / gc / commit / add / fetch / push，未改名、未删除任何 `.git`。所有备份类命令只写在 §5，供人工执行。

---

## 1. 三仓库档案表

| 路径 | remote | 分支 | 提交数 | HEAD | 被跟踪文件数 | 工作区状态 | 与磁盘实际内容的差异 |
|---|---|---|---|---|---|---|---|
| `学习资料\`（根仓库，对照用） | `https://github.com/chosenecho/os-study-notes.git` | `main`（上游 `origin/main`） | 16 | `0836fc7` Remove CSS for the retired homepage layout | 44 | 干净；仅 2 项未跟踪：`?? _整理/`、`?? esa-deploy/` | 44 个跟踪文件全部存在于磁盘；`资产/`、`归档/` 被忽略，从未进入指数 |
| `学习资料\归档\` | **无 remote**（`git remote -v` 空输出） | `main`（无上游） | **1** | `9de2ddf` Track archive text (database answers, high-math transcriptions, tools) | **33** | **干净**（`status --porcelain` 空） | 33/33 跟踪文件均在磁盘；目录内共 336 个文件、1.59 GB，其余为 `.gitignore` 忽略的 pdf/docx/图片/swf |
| `学习资料\归档\数据结构\` | `https://github.com/chosenecho/data-structure-13181.git` | `main`（上游 `origin/main`，`git branch -vv` 显示 `[origin/main]`） | **3** | `318a007` 第4章 next 一节按资料口径重写 | **12** | **干净** | 12/12 跟踪文件均在磁盘且与 HEAD 逐字节一致（`git diff` 空）；目录内共 57 个文件、170 MB，多出的在 `原件/`（被本仓库 `.gitignore` 忽略） |
| `学习资料\资产\` | **无 remote** | `main`（无上游） | **1** | `4ed06ee` Track textbook transcription and old-note backups (local only) | **34** | **不干净：3 个 ` D`（已从工作区删除，未提交）** | **31/34 在磁盘**；缺 `旧版笔记备份_20261031\` 下 3 个 `.md`，且**该目录整体已不存在**。目录内共 530 个文件、113 MB，其余为忽略的 pdf/epub/docx/png 与 `真题/`、`assets/`、`index/` |

补充的体量数据（`.git` 内部，决定备份成本）：

| 仓库 | `.git` 目录文件数 | `.git` 体积 | 松散对象数 | 打包对象 |
|---|---|---|---|---|
| 根 | 265 | 1.3 MB | — | — |
| `归档` | 69 | 0.7 MB | 46（662 KB） | **0（全松散）** |
| `归档\数据结构` | 53 | 0.3 MB | 28（231 KB） | **0（全松散）** |
| `资产` | 64 | 0.7 MB | 41（729 KB） | **0（全松散）** |

三个内层 `.git` 合计约 1.7 MB —— 这正是"冷备成本极低、维护成本相对高"的核心论据（见 §6）。

---

## 2. 完整被跟踪文件清单

> 生成方式：`git -C "<路径>" -c core.quotepath=false ls-files`。用 `-c core.quotepath=false` 而不是 `git config core.quotepath false`，因为后者会**改写 `.git/config`**，超出只读纪律。

### 2.1 `归档\`（33 个）

```
.gitignore
National-Computer-Rank-Examination-Linux-Application-and-Development-Technology-main/README.md
National-Computer-Rank-Examination-Linux-Application-and-Development-Technology-main/全国计算机等级考试Linux应用与开发技术试题.md
多媒体技术及应用（第三版）/实例源文件/8.11.1/游子吟.html
多媒体技术及应用（第三版）/实例源文件/8.11.2/插入图像.html
多媒体技术及应用（第三版）/实例源文件/8.11.3/8-11-3.html
数据库/_book.txt
数据库/_extract.json
数据库/_src/ch1.txt
数据库/_src/ch2.txt
数据库/_src/ch3.txt
数据库/_src/ch4.txt
数据库/_src/ch5.txt
数据库/_src/ch6.txt
数据库/_src/ch7.txt
数据库/_src/ch8.txt
数据库/_tools/book.py
数据库/_tools/build_docx.py
数据库/_tools/check.py
数据库/_tools/grep.py
数据库/_tools/grep2.py
数据库/_tools/verify.py
数据库/答案/第1章 数据库系统概论.md
数据库/答案/第2章 关系数据模型.md
数据库/答案/第3章 数据库设计.md
数据库/答案/第4章 结构查询语言SQL.md
数据库/答案/第5章 数据库编程基础.md
数据库/答案/第6章 事务管理.md
数据库/答案/第7章 数据库备份与恢复.md
数据库/答案/第8章 安全性管理.md
高数/高数课件.md
高数/高数重点-合并.md
高数/高等数学（工专）2018年版.md
```

### 2.2 `归档\数据结构\`（12 个）

```
.gitignore
README.md
复习/00_考点总览与备考策略.md
复习/01_第1章_绪论.md
复习/02_第2章_线性表.md
复习/03_第3章_栈和队列.md
复习/04_第4章_数组广义表和字符串.md
复习/05_第5章_树与二叉树.md
复习/06_第6章_图结构.md
复习/07_第7章_内部排序.md
复习/08_第8章_查找.md
复习/09_综合模拟卷.md
```

### 2.3 `资产\`（34 个，含 3 个已删）

```
.gitignore
教材/操作系统概论/操作系统概论（2017年版）.md
教材/操作系统概论/构建报告.md
教材/操作系统概论/校对报告.md
教材/操作系统概论/读我.md
教材/计算机组成原理/README_制作说明.md
教材/计算机组成原理/book.md
教材/计算机组成原理/chapters/00_第一部分 计算机组成原理自学考试大纲.md
教材/计算机组成原理/chapters/01_出版前言.md
教材/计算机组成原理/chapters/02_Ⅰ. 课程性质与课程目标.md
教材/计算机组成原理/chapters/03_Ⅱ. 考核目标.md
教材/计算机组成原理/chapters/04_Ⅲ. 课程内容与考核要求.md
教材/计算机组成原理/chapters/05_Ⅳ. 关于大纲的说明与考核实施要求.md
教材/计算机组成原理/chapters/06_Ⅴ. 题型举例.md
教材/计算机组成原理/chapters/07_后记.md
教材/计算机组成原理/chapters/08_计算机组成原理.md
教材/计算机组成原理/chapters/09_第二部分 计算机组成原理.md
教材/计算机组成原理/chapters/10_编者的话.md
教材/计算机组成原理/chapters/11_第1章 计算机系统概述.md
教材/计算机组成原理/chapters/12_第2章 数据的表示和运算.md
教材/计算机组成原理/chapters/13_第3章 指令系统.md
教材/计算机组成原理/chapters/14_第4章 中央处理器.md
教材/计算机组成原理/chapters/15_第5章 存储器层次结构.md
教材/计算机组成原理/chapters/16_第6章 互连及输入输出组织.md
教材/计算机组成原理/chapters/17_附录 部分习题解答.md
教材/计算机组成原理/chapters/18_参考文献.md
教材/计算机组成原理/chapters/19_后记.md
教材/计算机组成原理/审核报告_全量.md
教材/计算机组成原理/报告_缺页与页码对照.md
教材/计算机组成原理/补拍处理结果.md
教材/计算机组成原理/逐页校对报告.md
旧版笔记备份_20261031/第1章_计算机系统概论_笔记.md      <-- 磁盘已删（D）
旧版笔记备份_20261031/第2章_数据的表示与运算_笔记.md    <-- 磁盘已删（D）
旧版笔记备份_20261031/第3章_存储系统_笔记.md            <-- 磁盘已删（D）
```

---

## 3. 关键取证（确定答案）

### 3.a 资产仓库那 3 个 D 文件能不能取回？

**能，现在取回是确定成功的**——因为删除只发生在工作区，从未提交，文件仍在 HEAD（`4ed06ee`）的树里。下面是实际取回的证据（`git -C "资产" show HEAD:<路径>` 的前 8 行）：

`旧版笔记备份_20261031/第1章_计算机系统概论_笔记.md` —— blob `df0117f0632310a03d05069613df35c3159b619e`，**3846 字节**

```
# 第 1 章 计算机系统概论

> 资料说明：目录中有第一章自测卷和两份历年真题，未见教材、教学大纲或课件。以下按计算机组成原理通用知识整理；术语和考核范围仍应以课程材料为准。

## 复习导航

| 内容 | 学习目标 |
|---|---|
```

`旧版笔记备份_20261031/第2章_数据的表示与运算_笔记.md` —— blob `14fd6940e916032e32847a12eab8416862042cca`，**3755 字节**

```
# 第 2 章 数据的表示与运算

> 资料说明：目录中有第一章自测卷和两份历年真题，未见教材、教学大纲或课件。以下按通用知识整理，编码格式和运算规则以课程材料为准。

## 复习导航

| 内容 | 学习目标 |
|---|---|
```

`旧版笔记备份_20261031/第3章_存储系统_笔记.md` —— blob `f38bd2ae1abcb0815d71deee1d716dfa3fc7f45f`，**4342 字节**

```
# 第 3 章 存储系统

> 资料说明：目录中有第一章自测卷和两份历年真题，未见教材、教学大纲或课件。以下按通用知识整理，计算题的地址划分和参数口径以课程材料为准。

## 复习导航

| 内容 | 学习目标 |
|---|---|
```

三点确定结论：

1. **对象确认存在**：`rev-parse HEAD:<路径>` 三个都返回了 blob id，`cat-file -s` 返回 3846 / 3755 / 4342 字节，合计 **11,943 字节（约 11.7 KB）**。内容可读、非空、是完整的笔记正文。
2. **磁盘上没有副本**：`资产\旧版笔记备份_20261031` 目录整体 `Test-Path = False`。另外 `资产` 仓库 `stash list` 为空，没有第二条取回路径。
3. **没有远端兜底**：`git remote -v` 空 —— 这 11.7 KB 只存在于 `资产\.git` 的松散对象里（`count-objects` 显示 41 个松散对象、0 个 pack）。

> 反向推论同样重要：**如果现在直接删掉 `资产\.git`，这 11,943 字节就再也没有第二个来源**。它们不在磁盘上、不在任何远端、也不在根仓库里（根 `.gitignore` 第 2 行忽略 `资产/`，`git log --all -- 资产` 空输出，即根仓库从未跟踪过该目录）。这是本次退役中唯一"删了就真的没有"的实质内容。
>
> 内容价值另说：三份文件正文自称"未见教材、大纲或课件，按通用知识整理"，总长 11.9 KB；而根仓库现有 `课程\计算机组成原理\第1章_计算机系统概述_笔记.md` 等三份是依据袁春风《计算机组成原理》（2016 年版）教材重写的版本，大小 9331 / 14406 / 9873 字节。**它们是被取代的早期薄稿，不是独有知识**，所以"备份进 bundle 即可，不必抢救回工作区"（判断见 §6）。

### 3.b 历史里有没有「只在历史、磁盘已无」的文件？

**没有。三个内层仓库的全历史删除扫描结果都是零条。**

实际执行的命令与结果：

```
git -C "<仓库>" -c core.quotepath=false log --all --diff-filter=D --name-only --pretty=format:'COMMIT %H %ad %s' --date=iso
```

| 仓库 | `--diff-filter=D` 结果 | 印证 |
|---|---|---|
| `归档` | **空** | 只有 1 个提交（初始提交，reflog 仅 `commit (initial)`），`--diff-filter=A` 恰好就是现在这 33 个文件 |
| `归档\数据结构` | **空** | 3 个提交都各自含 **12** 个文件（`ls-tree -r --name-only 1f4bf7f / 87e84e4 / 318a007` 均为 12），从未增删文件，只在 6 个文件内改内容 |
| `资产` | **空** | 只有 1 个初始提交，`--diff-filter=A` 的 34 个文件 = 当前 33 个跟踪文件 + 3 个 D 文件；那 3 个的删除**尚未提交**，所以历史里没有 D 记录 |
| 根仓库（对照） | **28 个路径** | 见下 |

`git fsck --unreachable` 对三个仓库也都是空输出 —— 没有游离提交、没有游离 blob，即"历史里藏着但不属于任何分支"的东西也不存在。

> **对照说明（重要）**：真正的"只在历史、磁盘已无"问题出在**根仓库**，不在三个内层仓库。根仓库全历史删除且**磁盘上确实找不到**的路径共 28 个：
>
> - `笔记网站/` 整棵树（`astro.config.mjs`、`package.json`、`package-lock.json`、`tsconfig.json`、`hooks.py`、`mkdocs.yml`、`requirements.txt`、`scripts/{browser-smoke.cjs,sync-notes.mjs,ui-review.cjs}`、`src/components/{NoteContent,Scheduler,StudyHome}.astro`、`src/content.config.ts`、`src/scripts/{notes,scheduler}.ts`、`src/content/docs/{404.md,index.mdx,lab/scheduling.mdx}`、`src/content/i18n/zh-CN.json`、`docs/index.md`、`docs/lab/scheduling.md`、`docs/assets/interactions.js`、`README.md`）—— 两代站点（MkDocs → Starlight）全被后来的 `站点/` 取代
> - `edgeone.json`、`esa.jsonc`（EdgeOne / 阿里云 ESA 部署配置）
> - `操作系统概论/README.md`（重组前的旧路径）
> - `_整理计划.md`（提交 `9b55011` "untrack plan doc" 后两者皆无）
>
> 这 28 个路径的**唯一载体就是根仓库的 git 历史**，且根仓库有远端（`os-study-notes`），风险已被远端分担。**结论：内层三个仓库没有"历史独有内容"；根仓库有。退役内层仓库不会损失历史独有内容，但操作时务必不要碰根 `.git`。**

### 3.c `归档\数据结构` 的本地 HEAD 与 origin/main 是否一致？

**完全一致，零差异，也零未推送提交。** 四重验证：

```
$ git -C "归档\数据结构" rev-parse HEAD origin/main
318a00795aef7ef449176ab77a814063be7f0aeb
318a00795aef7ef449176ab77a814063be7f0aeb

$ git -C "归档\数据结构" rev-list --left-right --count origin/main...HEAD
0       0                      # ahead=0 behind=0

$ git -C "归档\数据结构" rev-parse 'HEAD^{tree}' 'origin/main^{tree}'
c8e7fd9ffd8fdf884919aa768b6be1571e3efd95
c8e7fd9ffd8fdf884919aa768b6be1571e3efd95      # 树哈希相同 → 121 个文件内容逐字节相同

$ git -C "归档\数据结构" diff --stat HEAD origin/main
(空输出)
```

本地 `refs/remotes/origin/main` 只是缓存，所以我另外做了一次**远端实况只读探测**：

```
$ git -C "归档\数据结构" ls-remote --heads origin
318a00795aef7ef449176ab77a814063be7f0aeb        refs/heads/main
```

远端 GitHub 上 `refs/heads/main` 就是 `318a007`，与本地 HEAD 同一提交。**没有丢任何提交**；三个提交 `1f4bf7f`（initial）→ `87e84e4`（第4章补充 next 数组三种约定）→ `318a007`（第4章按资料口径重写）全部在远端。

顺带确认这个仓库的工作区与 HEAD 的差异也无：12 个跟踪文件全部在磁盘，`git status --porcelain` 空。唯一不在版本控制下的是 `原件/`（170 MB 的原始 PDF/图片，被本仓库 `.gitignore` 忽略）—— 那部分**只在本机，远端没有，bundle 也带不走**（见 §5 步骤 0b）。

---

## 4. 根仓库视角验证

### 4.1 逐条 `git check-ignore -v`

在根目录执行，输出格式为「规则所在文件:行号:规则 \t 被匹配路径」：

```
$ git -C "学习资料" check-ignore -v -- "资产/"
.gitignore:2:资产/                资产/

$ git -C "学习资料" check-ignore -v -- "归档/"
.gitignore:3:归档/                归档/

$ git -C "学习资料" check-ignore -v -- "资产/旧版笔记备份_20261031/第1章_计算机系统概论_笔记.md"
.gitignore:2:资产/                资产/旧版笔记备份_20261031/第1章_计算机系统概论_笔记.md

$ git -C "学习资料" check-ignore -v -- "归档/数据结构/README.md"
.gitignore:3:归档/                归档/数据结构/README.md

$ git -C "学习资料" check-ignore -v -- "归档/数据库/答案/第1章 数据库系统概论.md"
.gitignore:3:归档/                归档/数据库/答案/第1章 数据库系统概论.md

$ git -C "学习资料" check-ignore -v -- "_整理/report-git.md"
(NOT ignored)                      # 本报告文件不被忽略

$ git -C "学习资料" check-ignore -v -- "esa-deploy/"
(NOT ignored)                      # 所以它出现在 ?? 里

$ git -C "学习资料" check-ignore -v -- "站点/dist/index.html"
站点/.gitignore:1:dist/            # 嵌套 .gitignore 也生效（站点自己那份）
```

结论：`资产/` 与 `归档/` 的忽略来源**各只有一条规则**，就是根 `.gitignore` 的第 2、3 行：

```
1: # 本地资产：教材、扫描件、真题、旧版笔记备份（体积大，不随仓库分发）
2: 资产/
3: 归档/
```

这两条是**目录级后缀斜杠模式**，一条规则覆盖整棵子树 —— 所以 `资产/旧版笔记备份_20261031/…` 与 `归档/数据结构/README.md` 都是被**父目录规则**顺带忽略的，内层仓库自己的 `.gitignore` 完全没参与（根仓库根本不会进入这两个被忽略的目录，自然也不会读取内层的 `.gitignore`）。

### 4.2 为什么根 `git status` 看不见这三个仓库

三层原因，缺一不可：

1. **目录被忽略**：`资产/`、`归档/` 命中根 `.gitignore` 第 2、3 行。git 在遍历工作区时对忽略目录**整目录剪枝**，不进入、不枚举、不比对，所以连"这里有个 `.git`"都不会被发现。`git status --porcelain --ignored` 里它们也只以 `!! 资产/`、`!! 归档/` 两行出现：
   ```
   ?? _整理/
   ?? esa-deploy/
   !! 归档/
   !! 资产/
   ```
   （注：`_整理/` 不在任务描述里，是本项目组新建的目录，未被忽略，故显示为未跟踪。）

2. **即使不忽略，git 也不会把这个 `.git` 当 submodule**。submodule 在 git 里的唯一表示是**索引中的 gitlink 条目（mode `160000`）**，通常配合仓库根的 `.gitmodules`。实测：
   ```
   $ git -C "学习资料" ls-files -s | Where-Object { $_ -like '160000*' }
   none (no submodule entries)
   $ Test-Path .gitmodules   -> False
   $ git ls-files -- .gitmodules -> (空)
   ```
   **根仓库索引里没有任何 gitlink，也没有 `.gitmodules`**，所以从根仓库的视角这三个东西**根本不是 submodule**，只是"藏在被忽略目录里的独立仓库"。

3. **内层 `.git` 的存在会阻止 git 递归**。若哪天把第 2、3 行忽略规则去掉，`git status` 会显示 `?? 资产/`、`?? 归档/` 这样的**不透明目录**（git 见到目录内有 `.git` 就不往里走，不会列出里面的 530/336 个文件），随后 `git add 资产` 会警告 `adding embedded git repository` 并**只登记一个 gitlink**（相当于把内层 HEAD 变成一条指向不存在 URL 的引用）。这是"忽略规则其实在保护你"的真实含义：现在的忽略恰好避免了误把内层仓库变成半吊子 submodule。

### 4.3 忽略规则与内层仓库有没有冲突？

**不冲突，但存在"语义重叠"需要知道**：

- 根 `.gitignore` 第 2、3 行是"整个目录不上版本控制"；`归档\.gitignore` / `资产\.gitignore` 是"目录内部只对文本做版本控制"。两者作用域不重叠：根仓库不进入这两个目录，内层 `.gitignore` 只对内层仓库生效。
- **唯一潜在冲突点**：如果将来有人想在根仓库里跟踪 `归档` 或 `资产` 的文本，必须先用 `git add -f` 或改忽略规则，而一改就会触发 §4.2 第 3 点的 gitlink 问题。也就是说**这两个嵌套仓库在架构上已经把"根仓库统一版本控制"这条路堵死了** —— 这是判断它们该退役的重要依据。
- 另外 `归档\.gitignore` 自己有一条 `数据结构/` 与一条 `ncre/`，说明当初建 `归档` 仓库时就已经承认"数据结构是独立仓库、不入我这个库"。这条注释（`# 数据结构已有独立仓库`）是当初决策的书面证据。

---

## 5. 退役方案（可复制执行）

前提：以下全部由**人工**在 PowerShell 5.1 里执行。步骤 0/1 是纯增量，不动任何 `.git`；步骤 2 只改名；步骤 3 才删除。任一步不通过就停在原地，仓库保持原状可用。

### 步骤 0：bundle 冷备份到仓库外

备份目录放在 `Documents\_备份\`（**仓库外**，不会污染工作区，也不会被任何 `.gitignore` 影响；该目录当前不存在，命令会自动创建）。三个仓库各一份 bundle，文件名带日期。

```powershell
$ErrorActionPreference = 'Stop'

$Root    = 'C:\Users\ChosenEcho\Documents\学习资料'
$Backup  = 'C:\Users\ChosenEcho\Documents\_备份\git-bundle-20261101'

New-Item -ItemType Directory -Force -Path $Backup | Out-Null

$Jobs = @(
    @{ Name = '归档';        Path = "$Root\归档" },
    @{ Name = '数据结构';    Path = "$Root\归档\数据结构" },
    @{ Name = '资产';        Path = "$Root\资产" }
)

foreach ($j in $Jobs) {
    $out = Join-Path $Backup ($j.Name + '.bundle')
    Write-Host ("==> bundle: {0}  ->  {1}" -f $j.Path, $out)
    git -C $j.Path bundle create $out --all
    if ($LASTEXITCODE -ne 0) { throw ("bundle 失败：{0}（exit {1}）" -f $j.Path, $LASTEXITCODE) }
}

Get-ChildItem -LiteralPath $Backup -Filter *.bundle |
    Select-Object Name, Length, LastWriteTime |
    Format-Table -AutoSize
```

为什么 `--all`：三个仓库都没有 tag，`--all` 会把 `refs/heads/*` 全部打进 bundle（含 `main`；`数据结构` 另含远端跟踪引用所指向的同一提交）。`资产` 的 3 个 D 文件在 `4ed06ee` 的树里，所以**会随提交一起进 bundle**，这是关键。

### 步骤 0b（强烈建议）：大件文件单独镜像

bundle 只带**提交过的对象**。`归档` 里被 `.gitignore` 忽略的 1.59 GB（pdf/docx/swf/jpg）、`资产` 的 113 MB（pdf/epub/docx/png/`真题/`）、`数据结构` 的 `原件/` 170 MB —— **这三块 bundle 里一个字节都没有**。如果它们重要，用 robocopy 镜像到同一备份盘（`/MIR` 等价于"让备份与源完全一致"，会删除备份里多余的文件，请确认目标路径后再跑）：

```powershell
$Root   = 'C:\Users\ChosenEcho\Documents\学习资料'
$Mirror = 'C:\Users\ChosenEcho\Documents\_备份\files-20261101'

# 先 dry-run 看清单（/L 只列不拷）
robocopy "$Root\归档" "$Mirror\归档" /MIR /L /NFL /NDL /NJH /NJS
robocopy "$Root\资产" "$Mirror\资产" /MIR /L /NFL /NDL /NJH /NJS

# 确认无误后，去掉 /L 真正执行
robocopy "$Root\归档" "$Mirror\归档" /MIR /R:1 /W:1
robocopy "$Root\资产" "$Mirror\资产" /MIR /R:1 /W:1
```

若要排除 `.git`（bundle 已覆盖），加 `/XD "$Root\归档\.git"`；但最省心的做法是**不排除**——连 `.git` 一起镜像，等于多一份完整的原始副本，只是多占 1.7 MB。

### 步骤 1：`git bundle verify` 验证

```powershell
$ErrorActionPreference = 'Stop'
$Backup = 'C:\Users\ChosenEcho\Documents\_备份\git-bundle-20261101'

# 建一个临时空仓库用于 verify（部分 git 版本要求在有仓库的上下文里跑 verify；这样写最稳）
$Verify = Join-Path $Backup '_verify'
if (-not (Test-Path -LiteralPath $Verify)) { git init $Verify | Out-Null }

foreach ($n in @('归档','数据结构','资产')) {
    $b = Join-Path $Backup ($n + '.bundle')
    Write-Host ("===== verify: {0}" -f $b)
    git -C $Verify bundle verify $b
    if ($LASTEXITCODE -ne 0) { throw ("bundle verify 失败：{0}" -f $b) }
    git -C $Verify bundle list-heads $b
    if ($LASTEXITCODE -ne 0) { throw ("bundle list-heads 失败：{0}" -f $b) }
}

# 记录指纹，便于一周后比对；把输出贴进你自己的台账
Get-ChildItem -LiteralPath $Backup -Filter *.bundle |
    ForEach-Object { Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256 } |
    Select-Object Hash, Path | Format-List
```

**通过标准**（必须每条都成立）：

1. `bundle verify` 输出 `The bundle contains these N refs:` 且**不含** `does not have these prerequisites` 或 `error`。
2. `资产.bundle` 的 `list-heads` 里 `refs/heads/main` 指向 `4ed06eeb83aeefeb6ea26d12081e01365563391d`；`归档` 指向 `9de2ddfc3e47b2418169ea9e7f4109e8ffb6005c`；`数据结构` 指向 `318a00795aef7ef449176ab77a814063be7f0aeb`。
3. 抽样恢复测试（**最有说服力的一步**，建议真做一次）：把 bundle 克隆到临时目录，确认那 3 个 D 文件能读出来：

```powershell
$Tmp = 'C:\Users\ChosenEcho\Documents\_备份\_restore-test'
if (Test-Path -LiteralPath $Tmp) { Remove-Item -LiteralPath $Tmp -Recurse -Force }
git clone 'C:\Users\ChosenEcho\Documents\_备份\git-bundle-20261101\资产.bundle' $Tmp
git -C $Tmp -c core.quotepath=false ls-files | Select-String '旧版笔记备份'
git -C $Tmp show 'HEAD:旧版笔记备份_20261031/第1章_计算机系统概论_笔记.md' | Select-Object -First 3
# 期望：blob df0117f0632310a03d05069613df35c3159b619e，首行 "# 第 1 章 计算机系统概论"
```

`Remove-Item` 只作用在 `_备份\_restore-test` 这个临时克隆目录（确认路径后再执行，勿写成通配符）。

### 步骤 2：改名而非删除，观察一周

顺序建议：**先 `数据结构`（有远端兜底、风险最低），再 `归档`，最后 `资产`（有唯一的 11.7 KB）**。改名用 `Rename-Item`，不是 `Move-Item`，且目标名带日期。

```powershell
$ErrorActionPreference = 'Stop'
$Root   = 'C:\Users\ChosenEcho\Documents\学习资料'
$Suffix = '.git.retired-20261101'

$Targets = @(
    "$Root\归档\数据结构\.git",
    "$Root\归档\.git",
    "$Root\资产\.git"
)

foreach ($t in $Targets) {
    if (-not (Test-Path -LiteralPath $t)) { Write-Warning ("不存在，跳过：{0}" -f $t); continue }
    $dst = $t + $Suffix
    if (Test-Path -LiteralPath $dst) { throw ("目标已存在，先人工确认：{0}" -f $dst) }
    Rename-Item -LiteralPath $t -NewName (Split-Path -Leaf $dst) -Force
    Write-Host ("retired: {0}  ->  {1}" -f $t, (Split-Path -Leaf $dst))
}

# 改名后自检：应全部为 False
foreach ($t in $Targets) {
    Write-Host ("{0}  .git 还在? {1}" -f $t, (Test-Path -LiteralPath $t))
}
# 工作区自检：报 "not a git repository" 就说明退役生效
git -C "$Root\资产" status
git -C "$Root\归档" status

# 关键回归：根仓库必须完全没变化（44 个跟踪文件、main、干净）
git -C $Root rev-parse --abbrev-ref HEAD
git -C $Root rev-list --count HEAD          # 期望 16
(git -C $Root ls-files | Measure-Object).Count   # 期望 44
git -C $Root status --porcelain              # 期望只有 ?? _整理/ 与 ?? esa-deploy/
```

改名后这三处就变成**普通目录**：内层历史不再可用（`git log` 会报 not a git repository），但四个 `.gitignore` 文件仍在磁盘上、内容无害。根仓库不受任何影响 —— 因为它从来没跟踪过这两个目录（§4.3）。

观察期（2026-11-01 ～ 2026-11-08）内要确认的清单：

- [ ] `站点` 构建 / `_整理` 脚本里有没有任何命令 `cd` 进 `资产` 或 `归档` 后调 git（有就改路径或加 `--no-optional-locks` 判断）
- [ ] 有没有 IDE / 编辑器 / 同步盘（OneDrive 之类）把 `归档`、`资产` 识别为"工作区仓库"
- [ ] 一周内是否出现过"想查某份笔记的上一版"的冲动 —— 若有，说明该库还有活的价值，考虑**只保留 `数据结构`**、或把 `资产/归档` 的文本整体并入根仓库（需先解决 §4.3 的 gitlink 问题：直接复制文件到 `课程/`，而不是 add 目录）
- [ ] bundle 的 SHA-256 仍与步骤 1 记录的一致（防止备份盘损坏）

### 步骤 3：确认后再删

只在步骤 1 全部通过、步骤 2 观察期无异常之后执行。**删除前把目标绝对路径逐条打印出来核对**，避免手抖通配符。

```powershell
$ErrorActionPreference = 'Stop'
$Root   = 'C:\Users\ChosenEcho\Documents\学习资料'
$Suffix = '.git.retired-20261101'

$Doomed = @(
    "$Root\归档\数据结构\.git" + $Suffix,
    "$Root\归档\.git"         + $Suffix,
    "$Root\资产\.git"         + $Suffix
)

# 1) 先把要删的绝对路径打印出来，人工核对一遍再往下
$Doomed | ForEach-Object { Write-Host ("将要删除: {0}  存在={1}" -f $_, (Test-Path -LiteralPath $_)) }

# 2) 前置闸门：备份必须存在且非空，否则拒绝继续
$Backup = 'C:\Users\ChosenEcho\Documents\_备份\git-bundle-20261101'
foreach ($n in @('归档','数据结构','资产')) {
    $b = Join-Path $Backup ($n + '.bundle')
    if (-not (Test-Path -LiteralPath $b)) { throw ("缺 bundle，拒绝删除：{0}" -f $b) }
    if ((Get-Item -LiteralPath $b).Length -lt 1024) { throw ("bundle 过小，疑似无效：{0}" -f $b) }
}

# 3) 真正删除（确认上面输出无误后执行）
foreach ($d in $Doomed) {
    if (Test-Path -LiteralPath $d) {
        Remove-Item -LiteralPath $d -Recurse -Force
        Write-Host ("deleted: {0}" -f $d)
    }
}

# 4) 收尾自检
git -C $Root status --porcelain
git -C $Root rev-list --count HEAD    # 期望仍是 16
```

回滚（任一步想反悔）：把改名换回去即可，`.git.retired-*` 是完整可用的仓库，改名回来就恢复原状。

```powershell
Rename-Item -LiteralPath 'C:\Users\ChosenEcho\Documents\学习资料\资产\.git.retired-20261101' -NewName '.git' -Force
git -C 'C:\Users\ChosenEcho\Documents\学习资料\资产' status   # 期望回到 3 个 D
```

### 5.x 如果直接 `Remove-Item -Recurse` 三个 `.git`，会永久丢失什么

按"能不能从别处补回来"分两档：

**A. 永久丢失，无处可取（真正不可逆）**

1. **`资产` 仓库那 3 份旧版笔记的正文，合计 11,943 字节** —— blob `df0117f…`（3846 B，第1章）、`14fd694…`（3755 B，第2章）、`f38bd2a…`（4342 B，第3章）。磁盘已被删除、无远端、根仓库不跟踪。这是全部损失里唯一的"内容级"损失。
2. **`资产` 仓库 `4ed06ee` 的完整版本基线**：34 个文件在 2026-10-31 19:30 那一刻的确切内容 —— 包括 `教材/计算机组成原理/chapters/` 下 19 个分章（`00_第一部分…` 到 `19_后记`）、`book.md`、`审核报告_全量.md`、`逐页校对报告.md`、`报告_缺页与页码对照.md`、`补拍处理结果.md`。磁盘上现有副本可以替代"内容"，但**无法替代"当时是哪一版"**：任何后续误改都无法回滚，任何"这处是我改前还是改后"的疑问都无法回答。
3. **`归档` 仓库 `9de2ddf` 的完整版本基线**：33 个文件 —— 数据库答案 8 章、`_src/ch1-8.txt`、`_tools/` 下 6 个脚本（`book.py`/`build_docx.py`/`check.py`/`grep.py`/`grep2.py`/`verify.py`）、高数 3 份、多媒体实例 3 个 html、NCRE 试题 2 份。同样是"内容在磁盘、版本证据消失"。
4. **三个仓库的提交元数据**：作者 `SuperCatQR <49901869+SuperCatQR@users.noreply.github.com>`（仓库级 `user.name`/`user.email` 配置）、三条初始提交的 ISO 时间戳（`归档` 2026-10-31 19:30:32、`资产` 2026-10-31 19:30:00、`数据结构` 2026-10-24 07:34:41）、以及 reflog 里 `数据结构` 三个提交的完整时序。全局身份仍在（`git config --global` 有同名同邮箱），但**"这三个库是谁在什么时候建的"这条证据链只存在于被删的 `.git/logs/` 里**。
5. **`数据结构` 的本地演进历史**：`1f4bf7f` → `87e84e4` → `318a007` 的逐次 diff（尤其中间提交 `87e84e4` "第4章补充 next 数组三种约定的完整算法" —— `1f4bf7f..HEAD` 共 6 文件、+171/−22 行，其中 `04_第4章_数组广义表和字符串.md` 单文件 +171 行）。**这一档可完全恢复**：远端 GitHub 有 `318a007` 且树哈希一致（§3.c 已用 `ls-remote` 证实），但 `87e84e4` 这个中间提交**远端也有**（三个提交都在远端），所以重新 `git clone` 就能拿回全部历史 —— 这是唯一"删了不心疼"的一个。

**B. 不会丢（不要误判）**

6. `归档\.gitignore`、`资产\.gitignore`、`数据结构\.gitignore` —— 它们是**被跟踪的工作区文件**，在磁盘上，删 `.git` 不影响。
7. 三个目录里被忽略的大件（`归档` 1.59 GB、`资产` 113 MB、`数据结构\原件\` 170 MB）—— **从来不在 `.git` 里**，删 `.git` 一个字节都不动它们。
8. 根仓库的 44 个文件与 16 个提交 —— 与内层 `.git` 完全无关（`git log --all -- 资产 归档` 空输出即证）。
9. 提交里"曾经存在但现在磁盘没有"的文件 —— 三个内层仓库**一条都没有**（§3.b），所以不必担心这一层。

**一句话总结**：真正的不可逆损失是 **11,943 字节的 3 份旧稿 + 两个本地库的"版本时间轴"**；`数据结构` 那份几乎零风险（远端齐全）。

---

## 6. 风险与判断

### 6.1 该不该保留？分三个结论

**① `归档` 和 `资产`：bundle 冷备后退役。不建议保留。**

理由按权重排：

1. **收益近乎为零**。两个库各只有 **1 个提交**（初始提交），也就是说它们**从来没有记录过"变化"** —— 一个只有初始提交的 git 仓库，功能上等于"文件夹 + 一份快照 + 1.7 MB 开销"。版本控制的价值在于 diff 与回滚，而这两个库一次 `git commit` 之后就没再提交过（`归档` reflog 只有 `commit (initial)`，`资产` 同样）。**它们提供的唯一真实价值是"一次快照"，而这可以被一份 bundle（<1 MB）或一份 zip 完全替代。**
2. **维护成本是真实的**。它们带来的具体麻烦：根仓库 `.gitignore` 必须长期保留 `资产/`、`归档/` 两条规则（否则会误 add 成 gitlink，见 §4.2）；任何"给笔记做版本控制"的念头都会遇到"到底往哪个库提交"的选择困难；`资产` 现在处于 **3 个 D 未提交**的中间态 —— 这种"半脏"状态正是没人维护的直接证据（删了文件一个月不提交，说明这个库已经不在工作流里）。
3. **内容价值可被替代**。3 份 D 文件是"未见教材、按通用知识整理"的早期薄稿（11.9 KB），已被根仓库依据袁春风教材重写的 9331/14406/9873 字节版本取代。它们是**过程遗迹**，不是知识资产。
4. **删掉后可逆**。bundle 在手，任何时候 `git clone xxx.bundle` 都能完整重建，包括那 3 个文件。所以"退役"不是"放弃"，是"归档到更低维护成本的形式"。

**② `归档\数据结构`：不该退役，该搬家。**

它是三者中唯一**具有外部意义**的仓库：有 GitHub 远端（`chosenecho/data-structure-13181`）、有真实的多提交历史（3 个提交、有实质代码/内容演进）、且**已完全推送**（`ls-remote` 实测 `318a007`）。

但它现在的位置是错的：

- 它被塞在 `归档\` 里，语义上"归档 = 已完结、不再改"，而这是一个**在维护的独立项目**（最新提交 2026-10-24）；
- `归档\.gitignore` 里专门写了 `数据结构/` 和注释 `# 数据结构已有独立仓库` —— 说明 `归档` 仓库自己都在声明"这个子目录不归我管"。一个仓库要在 `.gitignore` 里屏蔽自己的子目录，就是**目录结构与版本控制边界不一致**的典型症状；
- 它又整体处在根仓库忽略的 `归档/` 之下，等于被**两层忽略**包裹。

建议：**移出到 `学习资料\数据结构\`（与 `课程/`、`资产/`、`归档/` 同级）**，同时删掉 `归档\.gitignore` 里的 `数据结构/` 一行。移动时**连 `.git` 一起移**（用 `Move-Item`，不要复制内容重建），并注意移动后 `数据结构/` 会立刻暴露在根仓库的可见范围里 —— 所以**移动前必须先给根仓库加一条忽略规则**，否则下次 `git status` 会出现 `?? 数据结构/` 且有被误 add 成 gitlink 的风险：

```powershell
# 前置：给根 .gitignore 追加一行（放在 资产/ 归档/ 后面）
Add-Content -LiteralPath 'C:\Users\ChosenEcho\Documents\学习资料\.gitignore' -Value '数据结构/' -Encoding UTF8

# 移动（含 .git；用 Move-Item 保留整个仓库）
Move-Item -LiteralPath 'C:\Users\ChosenEcho\Documents\学习资料\归档\数据结构' -Destination 'C:\Users\ChosenEcho\Documents\学习资料\数据结构'

# 验证
git -C 'C:\Users\ChosenEcho\Documents\学习资料\数据结构' remote -v
git -C 'C:\Users\ChosenEcho\Documents\学习资料\数据结构' log --oneline
git -C 'C:\Users\ChosenEcho\Documents\学习资料' check-ignore -v -- '数据结构/'
```

（若希望它彻底独立于根仓库，把 `数据结构/` 那条忽略保留即可 —— 忽略规则的语义是"这个目录由它自己的仓库管"，比当成 submodule 干净。）

**③ 根仓库 `.gitignore` 里那两条规则：保留，但要写清楚原因。**

建议把第 1 行的注释从"体积大，不随仓库分发"补充为同时说明嵌套仓库边界，避免后人误删规则触发 gitlink：

```
# 本地资产：教材、扫描件、真题、旧版笔记备份（体积大，不随仓库分发）
# 注意：资产/、归档/ 内含各自的独立 .git；删掉下面两行会让 git 把它们 add 成 gitlink（embedded repo），
#       而不是普通文件。若要收编其中的文本，请复制文件到 课程/ 而不是 add 目录。
资产/
归档/
```

### 6.2 风险清单（按严重度）

| 风险 | 触发条件 | 影响 | 缓解 |
|---|---|---|---|
| **3 份旧稿永久丢失** | 未做 bundle 就删 `资产\.git` | 11,943 字节唯一内容消失，无法恢复 | 步骤 0 + 步骤 1 的 restore-test 必须先过 |
| **误删根 `.git`** | `Remove-Item *\.git -Recurse` 之类通配符、或 `-Path` 写成 `$Root\.git` | 44 文件 × 16 提交全没，含 28 个"历史独有"路径（§3.b 对照） | 删除脚本里**逐条硬编码绝对路径**，并在删除前 `Write-Host` 打印核对；绝不用通配符 |
| **改 ignore 后误 add 成 gitlink** | 删掉 `.gitignore` 第 2/3 行（或 §6.1② 搬家时忘了加 `数据结构/`） | 根仓库出现 mode 160000 条目，`git status`/`submodule` 行为错乱，需 `git rm --cached` 收拾 | 改 ignore 前先 `git ls-files -s | Select-String 160000` 确认无 gitlink；搬家按 §6.1② 的顺序（先加规则、再移动） |
| **`数据结构` 原件目录丢失** | 只做 bundle，忽略 `原件/` 170 MB | 原始 PDF/图片不在任何地方（无远端、无 bundle） | 步骤 0b 的 robocopy；或明确认定 `原件/` 可弃并记录该决定 |
| **bundle 是"假成功"** | `bundle create` 退出码非 0 但被忽略；或备份盘写满 | 以为有备份，实际不可用 | 步骤 1 的三条通过标准 + `Get-FileHash` 留指纹 + 真做一次 `git clone` 恢复测试 |
| **IDE / 同步盘重新生成 `.git`** | 用 VS Code 打开 `资产\` 并在"初始化仓库"上误点；或 OneDrive 版本历史行为异常 | 产生一个空的新 `.git`，掩盖退役状态 | 退役后一周内 `Test-Path 资产\.git` 应为 False（步骤 2 已有自检）；把 `Documents\学习资料` 从实时同步盘移出更稳 |
| **观察期内需要旧版本** | 步骤 2 之后想查某文件上一版 | 暂时不可用（`.git` 已改名） | 改名可逆：`Rename-Item` 换回 `.git` 即可，一分钟内恢复 |

### 6.3 最小证据清单（退役后仍应保留的东西）

按"删完 `.git` 之后还能证明什么"来列，建议其中 1–3 放进备份目录同一处：

1. `git-bundle-20261101\{归档,数据结构,资产}.bundle`（3 个文件，合计约 1.7 MB）
2. 三个 bundle 的 SHA-256（步骤 1 的 `Get-FileHash` 输出，贴进任何台账文件）
3. 三个仓库的 HEAD / 提交数 / 分支 / remote 快照 —— 本报告 §1、§3 已完整记录：`归档`=`9de2ddf`/1/`main`/无远端，`数据结构`=`318a007`/3/`main`/`data-structure-13181`，`资产`=`4ed06ee`/1/`main`/无远端
4. 3 个 D 文件的 blob id 与字节数：`df0117f0632310a03d05069613df35c3159b619e`(3846) / `14fd6940e916032e32847a12eab8416862042cca`(3755) / `f38bd2ae1abcb0815d71deee1d716dfa3fc7f45f`(4342) —— 将来从 bundle 恢复时用来校验取回的是同一份
5. 两份内层 `.gitignore` 与根 `.gitignore` 的内容（它们留在磁盘上，无需另存，但**不要在退役时顺手删掉**：`归档\.gitignore` 里的 `数据结构/`、`ncre/` 注释是当初决策的史料）
6. 本报告

---

## 7. 复现命令清单（本次实际执行的只读命令）

```powershell
$Root = 'C:\Users\ChosenEcho\Documents\学习资料'

# 档案与状态
git -C "$Root" rev-parse HEAD; git -C "$Root" rev-parse --abbrev-ref HEAD
git -C "$Root\归档" rev-parse HEAD
git -C "$Root\归档\数据结构" rev-parse HEAD
git -C "$Root\资产" rev-parse HEAD

foreach ($p in @("$Root", "$Root\归档", "$Root\归档\数据结构", "$Root\资产")) {
    git -C $p remote -v
    git -C $p branch -vv
    git -C $p rev-list --count HEAD
    (git -C $p ls-files | Measure-Object).Count
    git -C $p status --porcelain
}

# 可读中文路径的文件清单
git -C "$Root\归档"         -c core.quotepath=false ls-files
git -C "$Root\归档\数据结构" -c core.quotepath=false ls-files
git -C "$Root\资产"         -c core.quotepath=false ls-files

# 取证 a：从 HEAD 取回 3 个 D 文件的正文
git -C "$Root\资产" rev-parse "HEAD:旧版笔记备份_20261031/第1章_计算机系统概论_笔记.md"
git -C "$Root\资产" cat-file -s df0117f0632310a03d05069613df35c3159b619e
git -C "$Root\资产" show "HEAD:旧版笔记备份_20261031/第1章_计算机系统概论_笔记.md" | Select-Object -First 8
git -C "$Root\资产" show "HEAD:旧版笔记备份_20261031/第2章_数据的表示与运算_笔记.md" | Select-Object -First 8
git -C "$Root\资产" show "HEAD:旧版笔记备份_20261031/第3章_存储系统_笔记.md" | Select-Object -First 8

# 取证 b：全历史删除扫描 + 游离对象
git -C "$Root\归档"           -c core.quotepath=false log --all --diff-filter=D --name-only
git -C "$Root\归档\数据结构"   -c core.quotepath=false log --all --diff-filter=D --name-only
git -C "$Root\资产"           -c core.quotepath=false log --all --diff-filter=D --name-only
git -C "$Root\归档\数据结构" ls-tree -r --name-only 1f4bf7f
git -C "$Root\归档\数据结构" ls-tree -r --name-only 87e84e4
git -C "$Root\归档\数据结构" ls-tree -r --name-only 318a007
git -C "$Root\归档" fsck --unreachable --no-progress
git -C "$Root\归档\数据结构" fsck --unreachable --no-progress
git -C "$Root\资产" fsck --unreachable --no-progress

# 取证 c：本地 HEAD vs origin/main（含远端实况）
git -C "$Root\归档\数据结构" rev-parse HEAD origin/main
git -C "$Root\归档\数据结构" rev-list --left-right --count origin/main...HEAD
git -C "$Root\归档\数据结构" rev-parse 'HEAD^{tree}' 'origin/main^{tree}'
git -C "$Root\归档\数据结构" diff --stat HEAD origin/main
git -C "$Root\归档\数据结构" ls-remote --heads origin

# 根仓库视角
git -C "$Root" check-ignore -v -- "资产/"
git -C "$Root" check-ignore -v -- "归档/"
git -C "$Root" ls-files -s | Select-String '^160000'
git -C "$Root" log --all --oneline -- "资产" "归档"
git -C "$Root" status --porcelain --ignored

# 体量
git -C "$Root\归档" count-objects -v
git -C "$Root\归档\数据结构" count-objects -v
git -C "$Root\资产" count-objects -v
```

无写操作。`git fsck` 未加 `--lost-found`（那会往 `.git/lost-found/` 写文件），只做连通性检查；`check-ignore` 与 `ls-remote` 均不改仓库状态。
