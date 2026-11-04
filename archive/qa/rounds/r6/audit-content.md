# 内容层审计报告（课程/ + 站点源 + CI）

审计对象：git 跟踪的内容层。基线 commit `1b475ca`，分支 `main`，工作区干净。
审计时间：2026-11-02。跟踪文件总数 167（`git ls-files | wc` = 167）。

---

## 一页结论

1. **README 的核心数字全部实测通过**：12 章、15 SVG、37 断言、dist 70 文件 / 15 HTML（14 页 + 404）/ sitemap 14 条、`.gitkeep` 0 字节、build 逐字节可复现——没有一条是编的。
2. **README 有一处结构性错误**：目录表把 `课程/` 写了两遍（第 9、16 行），且第 9 行"两门课的插图（`图/`，15 张 SVG）"暗示两门课都有图，实际 `计算机组成原理/` **根本没有 `图/` 目录**，15 张 SVG 全在 `操作系统概论/图/`。
3. **`站点/src/` 不是"手写源"**：33 个跟踪文件里有 23 个是 vendored KaTeX（562,022 B），README 第 10 行只列了 7 个手写文件，**漏报 26 个**。
4. **vendored KaTeX 无 LICENSE、无版本标注**：js/css/auto-render 三个文件里 `MIT`/`Copyright`/`@license`/`katex.org` 全部为 False；版本号只以 `version:"0.16.11"` 藏在 katex.min.js 尾部。仓库**从来没有过任何 LICENSE 文件**（`git log --all` 全历史为空）。这是真实的合规缺口。
5. **`lead-links.mjs` 抓不到四分之一断链**：`toFile()` 对以 `/` 结尾的 URL 直接 `return path.join(p,'index.html')` 而不 stat（第 34 行），实测 1313 条站内链接里 **315 条（24.0%）** 落在这条盲路上。我注入一个断链后它仍报 `broken: 0`。
6. **两个 QA 脚本都不会失败**：`verify-fixes.mjs` 与 `lead-links.mjs` 全文件无 `process.exit`/`exitCode`，断言全挂也返回 0。**把它们直接塞进 CI 等于装了一个永远绿的无效门禁**——这是本报告最重要的结论。
7. **CI 与 README 的落差真实存在但不该简单补**：`qa/` 49 个脚本 0 个进 CI。但 `verify-fixes.mjs` 依赖 Playwright，且 playwright 只存在于**仓库外** `C:\Users\ChosenEcho\node_modules`（无 `qa/package.json`、无 lockfile）——补 CI 前必须先补依赖声明，否则 CI 必红。
8. **"加第三门课"现在是静默失败**：实测只新建 `课程/数据结构/` 并放 6 章 → build 退出码 0，新课程完全消失，无任何警告。第 7 章同理（exit 0，静默丢弃）。而**重复章、缺章**都会正确硬失败（exit 1）。
9. **硬编码散落 9 处**：`range(1,7)`×2、`1<=n<=6`、`[1-6]`×2、`n>6`、`number<6`、interactions.js 的 `[1..6]`×3；两段 ~35 行的课程循环在 hooks.py:238-270 与 274-292 近乎逐行重复。
10. **两处无害但该清的残留**：`render.ps1`（42 行，全库零引用）、`favicon.ico`(498 B)+`apple-touch-icon.png`(3789 B)（构建产物里 0 处引用）、`interactions.js` 三处注释仍指向已退役的 Astro 项目 `笔记网站/`。

---

## 问题清单

| ID | 严重度 | 位置 | 证据（实测） | 建议动作 | 风险 |
|---|---|---|---|---|---|
| A-01 | **P1** | `qa/scripts/lead-links.mjs:34` | `if (urlPath.endsWith('/')) return path.join(p,'index.html');` — 不 stat。实测 1313 条站内链接中 315 条（24.0%）以 `/` 结尾，全部未经存在性检查。注入 `<a href="/no-such-page/">` 后仍输出 `"broken": 0` | 改为 `const idx = path.join(p,'index.html'); if (await exists(idx)) return idx; ... return null;` | 断链检查形同虚设；上线 404 无人发现 |
| A-02 | **P1** | `qa/scripts/lead-links.mjs:96-99`、`qa/scripts/verify-fixes.mjs:318-323` | 两文件全文 `grep -E 'process\.exit|exitCode'` = 0 命中。verify-fixes 末尾只有 `console.log(...)`；lead-links 只 `console.log(JSON)` | 末尾加 `if (brokenLinks.length \|\| missingAnchors.length \|\| brokenAssets.length) process.exit(1);` 和 `if (failed.length) process.exit(1);` | 脚本永远 exit 0，不能当门禁 |
| A-03 | **P1** | `站点/src/assets/katex/`（23 文件，562,022 B） | 全历史无任何 LICENSE：`git log --all --diff-filter=A --name-only` 匹配 `licen\|copying` 为空。三个文件内 `MIT`/`Copyright`/`@license`/`katex.org` 均 False。版本仅 `katex.min.js` 内 `version:"0.16.11"` | 补 `站点/src/assets/katex/LICENSE`（KaTeX MIT 全文）+ 在 README 第 10 行或 `站点/README` 记录版本 0.16.11 与来源 | MIT 要求保留版权声明，当前不满足；公开仓库有合规风险 |
| A-04 | **P1** | `README.md:10` | 该行称 `站点/src/` 为"站点手写源"并列出 7 项。实测 `站点/src` 跟踪 33 文件，其中 katex 23 个 + `math.js`/`favicon.ico`/`apple-touch-icon.png` = **26 个未列** | 拆成两行：`站点/src/`（手写，10 文件）+ `站点/src/assets/katex/`（vendored 第三方 0.16.11，23 文件 562 KB，见 LICENSE） | 读者误以为第三方代码是自研；掩盖 A-03 |
| A-05 | **P1** | `README.md:9` | "两门课的六章笔记与插图（`图/`，15 张 SVG）"。实测 `Test-Path 课程\计算机组成原理\图` = **False**；15 个 SVG 全在 `课程\操作系统概论\图\` | 改为"`课程/` 两门课各六章笔记；插图仅操作系统概论有（`图/`，15 张 SVG）" | 与 README:99"组成原理当前不搬图"自相矛盾 |
| A-06 | **P2** | `站点/hooks.py:238-270` vs `274-292` | 两段循环各 ~33/~19 行，差异仅 `SOURCE/COMPOSITION`、`../`前缀、`data-chapter` 是否带 `co-`、是否搬图 | 抽 `COURSES = [{dir, out, prefix, figures:bool}, ...]` 单循环，即 README:148 已写明的做法 | 加第三门课必须复制第三段，易漏 |
| A-07 | **P2** | `站点/hooks.py:152,156,159,174,194,238,274`；`interactions.js:169,175,176` | 章数 6 硬编码 9 处：`1<=n<=6`/`[1-6]`×2/`n>6`/`number<6`/`range(1,7)`×2；JS 侧 `[1,2,3,4,5,6]`×2、`["1".."6"]`×2 | 提 `CHAPTERS = 6` 常量并在 JS 用 `Array.from({length:CHAPTERS})` | 改章数要改 9 处，漏一处静默出错 |
| A-08 | **P2** | `站点/hooks.py:238,274`（`range(1,7)`） | **实测**：新建 `课程/数据结构/` + 6 章笔记，不动代码 → build **exit 0**，`dist/数据结构` 不存在。追加 `第7章` → **exit 0**，`chapter-7` md 与 html 均未生成 | 在 `on_pre_build` 加断言：`课程/` 下每个含 `第N章*_笔记.md` 的目录必须在 `COURSES` 里，否则 `raise SystemExit` | "加第三门课会静默出错"——README:133 已承认，但无护栏 |
| A-09 | **P2** | `课程/操作系统概论/图/render.ps1` | 42 行 / 1,555 B。全库文本引用：除自身外仅 `.gitignore:12-14`（注释+`**/图/*.png`/`**/图/_render/`）与 `README.md:101`（说明"已退役"）。`图/_render` 不存在；`课程/` 下 PNG = 0 | `git rm 课程/操作系统概论/图/render.ps1`；同时删 `.gitignore:13-14` 两条死规则（PNG 已为 0） | 退役脚本仍在版本控制，读者以为可跑 |
| A-10 | **P2** | `站点/src/favicon.ico`、`站点/src/apple-touch-icon.png` | 构建产物中引用次数 **0/0**（15 个 HTML 全扫）。但两者仍被 `copy` 进 dist 并上传（498 B + 3,789 B = 4,287 B）。真正生效的是 `mkdocs.yml:11` `favicon: assets/favicon.svg`（332 B） | `git rm` 两个文件；如需 iOS 图标，在 `overrides/main.html` 加 `<link rel="apple-touch-icon">` 后再留 | 死资源；`apple-touch-icon` 惯例路径会让 iOS 请求到却无人维护 |
| A-11 | **P2** | `站点/src/assets/math.js:7-8` | 注释称 "only six of the fifteen pages contain formulas"。实测 15 页中 **12 页**含 `class="arithmatex"`（co-6=194、co-5=186、co-2=136…），仅 index/lab/404 为 0 | 改注释为"12 of 15"，或改为不写死数字 | 注释失真，误导后续性能判断 |
| A-12 | **P2** | `.github/workflows/ci.yml`（43 行） | CI 仅 2 个有效步骤：`mkdocs build --strict`（:34）、`node test-scheduling.mjs`（:43）。`qa/` 49 个脚本 **0 个**在 CI（`grep 'qa/' ci.yml` = 0 命中） | 见下方「CI 缺口值不值得补」结论 | 回归靠人手跑，README:119"改完站点建议跑一遍"无强制 |
| A-13 | **P3** | `站点/src/assets/interactions.js:3,45,147` | 三处注释指向已不存在的 Astro 项目：`// 笔记网站/src/scripts/scheduling.mjs`、`scheduler.ts`、`migration-entry.ts`。全 `站点/` 内 `笔记网站` 命中仅这 3 行 | 删除或改为 `// 与 站点/scripts/scheduling.mjs 保持同步` | 注释指向不存在路径，误导维护者 |
| A-14 | **P3** | `站点/hooks.py` 头部注释 vs 实况 | 无版本号/生成器信息；`on_post_build:368` 注释称 "20 个 woff2 仍然全站加载"——实测 katex.min.css 有 20 个 `@font-face`、磁盘 20 个 woff2，**一致**（此条为已核实为真的说明，仅记录） | 无需动作 | — |
| A-15 | **P3** | `README.md:12` vs 实况 | "`docs/` 只保留一个 0 字节哨兵 `.gitkeep`"——实测 0 字节、`git ls-files 站点/docs` 仅此 1 个、构建后 `.gitkeep` 不进 dist。**全部为真** | 无需动作 | — |
| A-16 | **P3** | `README.md` 目录表 | `课程/` 出现两次（第 9 行、第 16 行）；第 16 行是 `课程/`、`站点/`、`qa/` 合并行，与第 9/10/13 行重复 | 合并：删第 9 行，把"15 张 SVG"并入第 16 行说明 | 表格自相重复，属编辑瑕疵 |

---

## 二、逐条复现方式

### A-01 / A-02 lead-links 的 24% 盲区与永不失败

```pwsh
# 1) 源码确认
read qa/scripts/lead-links.mjs  # 第 32-39 行
# 32: const toFile = async (base, urlPath) => {
# 33:   let p = path.join(base, urlPath);
# 34:   if (urlPath.endsWith('/')) return path.join(p, 'index.html');   <-- 无 stat
```

```pwsh
# 2) 量化盲区（对隔离构建产物统计）
$dist = "$env:TEMP\audit-snap-1\站点\dist"
$tot=0; $slash=0
Get-ChildItem $dist -Recurse -Filter *.html | ForEach-Object {
  $t = Get-Content $_.FullName -Raw
  foreach($m in [regex]::Matches($t,'href="([^"]+)"')){
    $raw=$m.Groups[1].Value
    if($raw -match '^(https?:|mailto:|tel:|javascript:|data:)'){continue}
    $tot++
    if($raw.Split('#')[0].Split('?')[0].EndsWith('/')){ $slash++ }
  }
}
```
实测输出：
```
internal hrefs total : 1313
ending with '/'      : 315 (24.0%)
existence-checked    : 998
```

```pwsh
# 3) 注入断链后仍报 0（决定性证据）
# 在 dist/index.html 的 </body> 前插入：
#   <a href="/no-such-page/">BROKEN LINK TEST</a>
#   <a href="chapters/chapter-1/#no-such-anchor">BROKEN ANCHOR</a>
node qa/scripts/lead-links.mjs
```
实测输出（注意 `anchors:1` 抓到了锚点，但 `broken:0` 没抓到断链，且 **exit=0**）：
```
{
 "pages": 15, "links": 1315, "assets": 15,
 "broken": 0, "anchors": 1, "brokenAssets": 0
}
```
```pwsh
# 4) 永不失败
Select-String qa/scripts/verify-fixes.mjs -Pattern 'exitCode|process\.exit'
Select-String qa/scripts/lead-links.mjs   -Pattern 'exitCode|process\.exit'
# 两者输出均为空
```

### A-03 KaTeX 无 LICENSE（用户初步判断已实证）

```pwsh
Get-ChildItem 站点/src/assets/katex -Recurse -File | Group-Object {$_.Directory.Name} |
  ForEach-Object { "{0,-10} files={1,3} bytes={2,10:N0}" -f $_.Name,$_.Count,($_.Group|Measure-Object Length -Sum).Sum }
```
实测：
```
katex      files=  2  bytes=   298,749   (katex.min.js 275,414 + katex.min.css 23,335)
contrib    files=  1  bytes=     3,481
fonts      files= 20  bytes=   259,792
TOTAL katex: 23 files, 562,022 bytes (0.54 MB)
```
```pwsh
foreach($k in 'MIT','Copyright','LICENSE','License','@license','katex.org'){
  "{0,-12} present={1}" -f $k, ([System.IO.File]::ReadAllText('站点\src\assets\katex\katex.min.js')).Contains($k)
}
```
实测全部 `present=False`（css 与 auto-render.min.js 同样全部 False）。
```pwsh
git -c core.quotepath=false log --all --diff-filter=A --name-only --pretty=format: |
  Where-Object { $_ -match '(?i)licen|copying' } | Select-Object -Unique
```
实测输出为空 → **仓库全历史从未跟踪过任何 LICENSE/COPYING**。另 `Test-Path LICENSE / LICENSE.md / COPYING` 三者均 False。
版本号提取：
```
[regex]::Match((ReadAllText katex.min.js),'version:"([\d.]+)"').Groups[1].Value  -> 0.16.11
```
补充：`katex.min.css` 20 个 `@font-face` 同时引用 `.woff2` / `.woff` / `.ttf` 三种格式，**只 vendored 了 woff2**（20 个）。现代浏览器只会取 woff2，故不影响渲染；若需完整上游分发包则缺 40 个文件。

### A-04 `站点/src/` 33 个文件里 26 个不是手写

```pwsh
(git -c core.quotepath=false ls-files '站点/src').Count                 # 33
(git -c core.quotepath=false ls-files '站点/src/assets/katex').Count    # 23
```
README:10 列出的 7 项：首页、实验页、`notes.css`、`interactions.js`、`favicon.svg`、`_headers`、`robots.txt`。
7 + 23(katex) + 3(`math.js`,`favicon.ico`,`apple-touch-icon.png`) = 33。**漏报 26 个。**

### A-05 计算机组成原理没有 `图/`

```pwsh
Test-Path '课程\计算机组成原理\图'          # False
(Get-ChildItem '课程' -Recurse -Filter *.svg).Count   # 15
(Get-ChildItem '课程\操作系统概论\图\*.svg').Count    # 15
```

### 第 2 题：笔记源一致性（全部通过）

```pwsh
foreach($course in '操作系统概论','计算机组成原理'){
  $all = Get-ChildItem "课程\$course" -Filter *.md | Where-Object Name -ne 'README.md'
  foreach($n in 1..6){
    $m = @($all | Where-Object { $_.Name -match "^第${n}章.*_笔记\.md$" })
    "第{0}章 matches={1}" -f $n, $m.Count
  }
}
```
实测两门课 **12/12 章全部 matches=1**，无重复、无缺失、无 `第N章` 之外的散落 `.md`。
两门课的 README 章节链接逐一 `Test-Path` 均存在；`组成原理/README` 第 21 行引用的 `qa/r4/C-考纲与应试.md` 也存在（`Test-Path` = True）。

**15 张 SVG 无孤儿、无裂图**：
```pwsh
$svg  = Get-ChildItem '课程\操作系统概论\图\*.svg' | % Name          # 15
$refs = 从 12 个笔记里正则抽 图/xxx.svg                              # 15 unique
$svg | Where-Object { $_ -notin $refs }     # 空 → 无孤儿
$refs | Where-Object { -not (Test-Path "课程\操作系统概论\图\$_") }  # 空 → 无裂图
```
每个 SVG 恰好被引用 1 次。
**推论：`render.ps1` 已完全弃用**——除自身外零引用，`图/_render/` 不存在，`课程/` 下 PNG 数为 0，`README.md:101` 明写"那条链路已退役"。

### A-08 第三门课 / 第 7 章静默消失（实测）

```pwsh
# 快照到 %TEMP%，仅在快照内改，绝不动工作区
# TEST B：新建 课程/数据结构/ + 第1..6章_测试_笔记.md，不动任何代码
python -m mkdocs build -f 站点/mkdocs.yml --strict
```
实测 `exit=0`，`Test-Path dist\数据结构` = **False**。
```pwsh
# TEST E：在 操作系统概论 下追加 第7章_附加_笔记.md
python -m mkdocs build -f 站点/mkdocs.yml --strict
```
实测 `exit=0`，`docs/chapters/chapter-7.md` 与 `dist/chapters/chapter-7/` **均不存在**。
对照组（护栏确实有效，值得肯定）：
```
TEST C2 真重复章（第3章_草稿版_笔记.md 与 第3章_进程调度与死锁_笔记.md 同时匹配 第3章*_笔记.md）
  -> exit=1  [hooks] ... 需要恰好 1 个「第3章*_笔记.md」，实际 2 个：...
TEST D  删除 第5章
  -> exit=1  [hooks] ... 需要恰好 1 个「第5章*_笔记.md」，实际 0 个：（没有匹配文件）
TEST A  笔记引用不存在的 图/根本没有这张图.png
  -> exit=1  FileNotFoundError（hooks.py:247）
```
即：**"某章多一个/少一个"会硬失败，"多一门课/多一章"会静默通过** —— 护栏与风险恰好错位。

### 第 3 题：建站链路结构性问题

**硬编码重复段落**：`hooks.py:238-270`（操作系统概论）与 `274-292`（组成原理）是两段近乎逐行相同的循环，仅 4 处不同（`SOURCE`/`COMPOSITION`、`../` 前缀、`data-chapter` 是否带 `co-`、是否执行 `image()` 搬图）。`274` 段甚至没有 `image()` 函数——这就是 README:99 说的"组成原理当前不搬图"，即**新增课程要搬图必须重写一份 `image()`**。

**章数写死清单（共 9 处）**：
```
hooks.py:152   if not 1 <= n <= 6:
hooks.py:156   re.sub(r'见(第\s*([1-6])\s*章)'
hooks.py:159   r'见《' + book + r'》\s*第\s*([1-6])\s*章'
hooks.py:174   if n > 6:
hooks.py:194   if number < 6          <- README:143 提到的末章判断
hooks.py:238   for n in range(1, 7):
hooks.py:274   for n in range(1, 7):
interactions.js:169  [1, 2, 3, 4, 5, 6]
interactions.js:175  ["1","2","3","4","5","6"]
interactions.js:176  ["1","2","3","4","5","6"]
```

**`CROSS_BOOKS`（hooks.py:134-137）**：映射有效且**正被真实使用**——实测 6 处跨书引用全部成功变成链接：
```
第4章_内存管理:503      见《计算机组成原理》第 5 章
第5章_文件系统:355      见《计算机组成原理》第 5 章
第6章_IO设备管理:393    见《计算机组成原理》第 6 章
第5章_存储器层次结构:138,679  见《操作系统概论》第 4 章
第6章_互连及输入输出组织:505  见《操作系统概论》第 6 章
```
构建产物里 `<a href="../../computer-organization/chapter-5/">` 全部正确；全站扫描"未变成链接的 `见《..》第N章`"= 0。

**`on_post_build` 的 rglob（hooks.py:371）**：`site.rglob('chapter-*/index.html')` 确实按目录自动扫，不写死课程名——**这一处是全链路唯一对未来友好的地方**。实测 12 个章节页全部含 `class="arithmatex"` 并全部成功注入 katex 脚本；index/lab/404 三页未注入（正确）。

**生成目录清单**（`git check-ignore` 实测全部生效）：
```
站点/docs/index.md                    -> 被 站点/.gitignore:2 /docs/* 忽略
站点/docs/chapters/chapter-1.md       -> 被 /docs/* 忽略
站点/docs/assets/figures/*.svg        -> 被 /docs/* 忽略
站点/docs/_headers                   -> 被 /docs/* 忽略
站点/dist/index.html                  -> 被 站点/.gitignore:1 /dist/ 忽略
站点/docs/.gitkeep                    -> 唯一被跟踪（! 例外生效，0 字节确认）
```
**评估**：规则与 hooks 的 4 个 mkdir 目标（`DOCS`、`chapters`、`assets/figures`、`computer-organization`）**仍然一一对应**，`/docs/*` 是目录级通配，新增子目录自动覆盖，比"逐条镜像"更稳。真正的脆弱点在**别处**：`mkdocs.yml:4 site_dir: dist` 与 `站点/.gitignore:1 /dist/` 是**两个各自独立的字面量**，改 `site_dir` 而忘改 ignore，`站点/newdir/` 会整体入库（根 `.gitignore:7` 也只钉了 `站点/dist/`）。这是一处"靠手工镜像"的耦合，建议 `site_dir` 保持不变即可，无需改动。

**`mkdocs.yml` nav 与页面数**：nav 叶子 `.md` = **14**；`docs/` 生成 `.md` = **14**（index + 6 os + 6 co + lab）；构建产物 HTML = **15**（14 + 404）。三者一致，`--strict` 未报 nav 漏页。

### 第 4 题：第三方静态资源的处置

见 A-03、A-04。结论：**`站点/src/assets/katex/` 不是"手写源"该待的地方**。理由有三：
1. 它不是手写的（23 个上游产物）；
2. 它无 LICENSE、无版本文件、无来源记录（`git log --diff-filter=A` 显示与 R4 修复同一次 commit `914d969` 加入，无独立 vendoring commit）；
3. `mkdocs.yml:72` 把 `assets/katex/katex.min.css` 放进 `extra_css`，导致 **全站每页都加载 23,335 B 的 KaTeX CSS**，而 `hooks.py:365-369` 的注释自己也承认"CSS 与 20 个 woff2 仍然全站加载"。JS 是按需注入的，CSS 不是——这与 `math.js:7` 宣称的省流意图不一致。
建议：移入 `站点/src/assets/vendor/katex/0.16.11/`，加 `LICENSE` 与 `VERSION` 文件，并在 README 用独立行声明。

### 第 5 题：孤立/半成品文件

| 文件 | 体积 | 构建产物引用数 | 判定 |
|---|---|---|---|
| `站点/src/favicon.ico` | 498 B | **0** | 孤儿（`mkdocs.yml:11` 用的是 `assets/favicon.svg`） |
| `站点/src/apple-touch-icon.png` | 3,789 B | **0** | 孤儿，但从 `src/` 复制进 dist 并上传 |
| `站点/src/assets/math.js` | 68 行 | 15/15 页（`extra_javascript`） | **在用**，非孤儿；但注释数字失真（A-11） |
| `站点/src/assets/favicon.svg` | 332 B | 15/15 页 | **在用** |
| `课程/操作系统概论/图/render.ps1` | 1,555 B | 0 | 退役脚本仍在版本控制（A-09） |

`math.js` 的注入细节（值得肯定的设计）：`hooks.py:376-382` 以 `marker = '<script src="../../assets/math.js"></script>'` 为锚点，在 12 个含公式的章节页注入 katex.min.js + auto-render.min.js，实测生效且幂等（连跑两次 build 哈希一致）。

### 第 6 题：CI 缺口值不值得补

**现状**（`ci.yml` 全文 43 行，2 个有效步骤）：
```
ci.yml:34  python -m mkdocs build -f 站点/mkdocs.yml --strict   # 真正的门禁
ci.yml:43  node 站点/scripts/test-scheduling.mjs                # exit 0，实测通过
```
`qa/` 下 49 个脚本，`grep 'qa/' ci.yml` = **0 命中**。

**结论：值得补，但必须先做三件事，否则补了就是假绿。**

1. **必须先让脚本会失败**（A-02）。现在把 `verify-fixes.mjs` 塞进 CI，37 项断言全挂也是 `exit 0` —— 装了个永远通过的灯。这是先后顺序问题，不是取舍问题。
2. **必须先声明 playwright 依赖**。实测 `qa/package.json` 不存在、仓库根 `package.json` 不存在；`playwright` 只能从 **`C:\Users\ChosenEcho\node_modules`**（仓库外、未跟踪）解析成功。`qa/lib/audit.mjs:2` 的注释把这件事写成特性（"node_modules/playwright resolves upward"）——这在**本机**成立，在 **CI 上必然 `ERR_MODULE_NOT_FOUND`**。
3. **必须自带静态服务器**。`audit.mjs:13` 硬编码 `LOCAL = 'http://127.0.0.1:8123'` 且 `session()` 默认 `base = LOCAL`；CI 里没有服务在 8123 上，脚本会连接失败而非跳过。

**建议的最小 CI 增量**（按性价比排序）：
- **立刻可加（零依赖、零风险）**：
  ```yaml
  - name: Link & asset integrity
    run: |
      node qa/scripts/lead-links.mjs            # 修完 A-01/A-02 后
  ```
  但注意：`lead-links.mjs:5` 读 `path.resolve('站点/dist')`，需先 build（已有），无需服务器。**修完 A-01/A-02 后这是性价比最高的一道门禁**——它覆盖 1313 条站内链接，纯 Node 无依赖，秒级完成。
- **次优先**：把 `qa/scripts/check-notes.py`、`qa/parity.py` 这类纯 Python 的静态检查纳入（无浏览器依赖）。
- **不建议现在加**：`verify-fixes.mjs`（37 项 Playwright 断言）。它测的是**视觉/对比度/触控尺寸**，属于发布前人工确认项；要在 CI 稳定运行需装浏览器（`npx playwright install --with-deps chromium`）+ 起 8123 服务 + 补 `package.json`/lockfile，成本高且易 flaky。**可以接受它留在本地**，但 README:119-126 应明说"这三条不构成 CI 门禁，需人工执行"。

---

## 三、README「说的 vs 实际的」总表

| # | README 位置 | README 说的 | 实际（实测） | 判定 |
|---|---|---|---|---|
| 1 | :9 | `课程/` 两门课的六章笔记与插图，15 张 SVG | 两门课各 6 章 ✅；**只有操作系统概论有 `图/`**，组成原理无 | **半错**（A-05） |
| 2 | :9 / :16 | 目录表 `课程/` 一行 | `课程/` **出现两次**（第 9、16 行） | **重复**（A-16） |
| 3 | :10 | `站点/src/` 是"站点手写源"，列 7 项 | 33 个跟踪文件，**26 个未列**（katex 23 + math.js + favicon.ico + apple-touch-icon.png） | **过期/误导**（A-04） |
| 4 | :12 | `docs/` 只保留 0 字节哨兵 `.gitkeep` | 0 字节 ✅；`git ls-files 站点/docs` 仅此 1 个 ✅；`.gitkeep` 不进 dist ✅ | **准确** |
| 5 | :13 | `qa/` 有 37 项断言 | `verify-fixes.mjs` 中 `add(` 调用 **37** 次，37 个唯一 ID | **准确** |
| 6 | :68 | dist 70 个文件、14 个页面 + 404、sitemap 14 条 | 70 文件 ✅ / 15 HTML（14+404）✅ / sitemap 14 `<loc>` ✅ | **准确** |
| 7 | :68 | "文件数会随 Material 版本变，别照抄" | 同一 requirements（mkdocs 1.6.1 / material 9.7.7 / pymdownx 11.0.1）下 70 稳定 | **准确且谨慎** |
| 8 | :99 | 组成原理当前不搬图，要加图得补 hooks 分支 | `Test-Path 课程\计算机组成原理\图` = False；`hooks.py:274-292` 确无 `image()` | **准确** |
| 9 | :101 | `.png` 且同名 `.svg` 存在时换成 `.svg` | `hooks.py:245-246` 正是该逻辑；仓库内 PNG 数 = 0 | **准确** |
| 10 | :105 | 清空 docs 再构建，产物逐字节不变 | 两次 build 全部 70 文件 SHA256 **完全一致** | **准确（已实证）** |
| 11 | :112 | `node 站点/scripts/test-scheduling.mjs` | 实测 exit 0，输出"调度核算通过：FCFS、SPF、RR、边界到达、CPU 空闲…" | **准确** |
| 12 | :124 | `verify-fixes.mjs` 37 项断言，逐条给实际值 | 37 项 ✅，每项打印 `actual` 与 `want` ✅ | **准确** |
| 13 | :125 | `lead-links.mjs` 站内链接与锚点 | 锚点能查 ✅；**24% 的 `/` 结尾链接查不到**，且永不失败 | **名不副实**（A-01/A-02） |
| 14 | :132 | `chapter_note()` 多/少都直接报错 | 重复 → exit 1 ✅；缺失 → exit 1 ✅ | **准确** |
| 15 | :133 | 加第三门课要复制一段循环并改 | 属实；且**不改也不报错**（实测 exit 0） | **准确但低估**（A-08） |
| 16 | :142 | `CROSS_BOOKS` 漏了则"静默留成纯文本" | 当前 6 处跨书引用全部成链 ✅ | **准确** |
| 17 | :143 | `number < 6` 是末章判断 | `hooks.py:194` 确为 `if number < 6` ✅；chapter-6 产物是"回到课程列表 →" ✅ | **准确** |
| 18 | :144 | `on_post_build` 用 `rglob('chapter-*/index.html')`，不用改 | `hooks.py:371` 正是 `site.rglob('chapter-*/index.html')` ✅ | **准确** |
| 19 | :145 | `data-next-chapter` 全页只有一处、章号写死操作系统概论 | `index.md` 中 `data-next-chapter` 计数 = **1**；href=`chapters/chapter-1/`（os 路径）✅ | **准确** |
| 20 | :146 | `interactions.js` 的 `["os","co"]` 与 `co-` 前缀 | `:166 for (const course of ["os","co"])`、`:167 prefix = course === "os" ? "" : "co-"` ✅ | **准确** |
| 21 | :150 | `站点/.gitignore` 是 `/docs/*` + `!/docs/.gitkeep` | 第 2、3 行完全一致 ✅；外加 `/dist/`、`/__pycache__/` | **准确** |
| 22 | :18 | 资料/归档已写进 `.gitignore`；只有数据结构课还有独立仓库 | `.gitignore:2-3` ✅；`esa-deploy/` 不存在 ✅ | **准确** |
| 23 | :93 | GitHub Pages 已下线，`pages.yml` 已移除 | `.github/workflows/` 仅 `ci.yml`；`git log --diff-filter=D` 可见 `pages.yml` 曾存在 ✅ | **准确** |

**汇总**：23 条可核断言中，**17 条完全准确**、**2 条半错/重复**（#1 #2）、**1 条误导**（#3）、**1 条名不副实**（#13）、**2 条准确但低估风险**（#15）。README 的主体可信度**高于**本次审计的预期——数字没有一处是编的。

---

## 四、结构化遗留与建议顺序

**P1（本周）**
1. A-01 + A-02：修 `lead-links.mjs` 的 24% 盲区与退出码；修 `verify-fixes.mjs` 的退出码。这是**唯一能让现有 49 个 QA 脚本产生约束力**的前提。
2. A-03 + A-04：补 KaTeX LICENSE，README 拆分"手写源 / vendored"两行。
3. A-05：README 第 9 行改成"插图仅在操作系统概论"。

**P2（本月）**
4. A-06 + A-07 + A-08：hooks.py 抽 `COURSES` 配置，加"`课程/` 下有课程但不在 `COURSES` 里 → 硬失败"的护栏。这是把 README:133 承认的"要复制一段"变成"改一行数组"。
5. A-09 + A-10：`git rm` 三个死文件（`render.ps1`、`favicon.ico`、`apple-touch-icon.png`），同步删 `.gitignore:13-14`。
6. A-11：`math.js` 注释 6 → 12。
7. A-12：CI 加 `lead-links.mjs`（修好后），并把 `verify-fixes.mjs` 明确标注为"人工门禁"。

**P3（顺手）**
8. A-13：删 `interactions.js` 三处 Astro 残留注释。
9. A-16：合并 README 重复的 `课程/` 行。

---

## 五、审计方法与环境（可复现声明）

- **绝不改动被审对象**：所有破坏性实验（第三门课、第 7 章、重复章、缺章、裂图、注入断链）均在 `%TEMP%\audit-snap-{1..8}` 的**仓库完整副本**中进行，工作区 `git status` 全程干净，`课程/`、`站点/`、`README.md` 一字节未动。本报告是唯一写入工作区的文件（`_整理/` 已被 `.gitignore:26-27` 忽略，不入库）。
- **构建实测**：`python 3.12.10` / `mkdocs 1.6.1` / `mkdocs-material 9.7.7` / `pymdown-extensions 11.0.1` / `node v24.16.0`，与 `站点/requirements.txt:1-3` 完全吻合。`mkdocs build --strict` 退出码 0。
- **逐字节复现**：对 70 个产物文件算 SHA256，两次构建 `Compare-Object` 无差异。
- **跑不通的命令（如实记录）**：
  - `node qa/scripts/verify-fixes.mjs` → **跑不通**。报 `browserType.launch: spawn EPERM`（Playwright 无法在本会话沙箱内启动 Chromium）。这是环境限制，不是脚本缺陷；37 项断言的**数量与结构**已通过静态分析确认（37 个 `add(` 调用、37 个唯一 ID），但**未取得运行时 PASS/FAIL 结果**。
  - 启动 `python -m http.server 8123` 后服务器本身可用（`GET /chapters/chapter-2/` 返回 200、128,268 B），阻断点只在浏览器进程。
- **`git check-ignore --no-index` 的坑**：该参数会把否定规则 `!/docs/.gitkeep` 也报成 "IGNORED"，结论不可信。已改用「空索引 + `git add --intent-to-add` + `git status --porcelain`」与 `git status --ignored -uall` 双重复核。
- **未审计范围**（按分工）：`资料/`、`归档/`、`qa/`、`_整理/`、`站点/dist/`、`站点/docs/`（后两者仅作为构建产物**只读测量**，未写入）。
