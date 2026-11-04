# 交付层与性能审计 · qa-delivery

- **被测对象**：线上 `https://studynote.chosenecho.dpdns.org`（Cloudflare Worker 反代 → Pages 源站 `studynote-42b.pages.dev`）vs 本地 `http://127.0.0.1:8123`（`站点/dist`，python http.server）
- **时间**：2026-11-01 11:05–11:35 (+08:00)，`cf-ray` 全部落在 `-SIN`（新加坡）
- **方法**：`qa/scripts/delivery_net.py`（urllib 原始 HTTP，`Accept-Encoding: identity` 取精确字节 + `curl.exe` keep-alive 计时）+ `qa/scripts/delivery.mjs`（node + Playwright Chromium，PerformanceObserver 取 LCP/CLS/FCP，CDP `Network.emulateNetworkConditions` 模拟弱网）
- **标记**：每条结论都标 **实测** 或 **代码推断**；拿不到的写在文末「缺口」，不补数字
- **结果**：15 条（1×P1 / 6×P2 / 8×P3），其中真缺陷 10 条、需要权衡的取舍 2 条、信息性观察 3 条

## 结论速览

| ID | 严重度 | 类型 | 标题 | 证据 |
|---|---|---|---|---|
| DEL-01 | **P1** | 真缺陷 | 重复斜杠不归一化：200 但 5 个 CSS/JS 全 404，首屏被 1264px logo 占满 | 实测 |
| DEL-02 | P2 | 真缺陷 | 弱网首屏 5.9–6.2s：3 个阻塞样式表 + 0 个 preload | 实测 |
| DEL-03 | P2 | 真缺陷 | 空闲期就拉 437774B 搜索索引，占首页传输 59% | 实测 |
| DEL-04 | P2 | 真缺陷 | HTML 无 ETag/Last-Modified 却 must-revalidate，永远无法 304 | 实测 |
| DEL-05 | P2 | 真缺陷 | robots.txt 不在仓库：CF 托管 5013B、无 Sitemap 行、封 Baiduspider | 实测 |
| DEL-06 | P2 | 真缺陷 | 零 OG/Twitter 卡片，分享无预览 | 实测 |
| DEL-07 | P2 | **取舍** | Worker `cacheTtl:1800` 不可观测，代价是部署后最多 30 分钟旧 HTML | 实测+代码推断 |
| DEL-08 | P3 | 真缺陷 | 安全头只有 2 个，HSTS/CSP/XFO/Permissions-Policy 全缺 | 实测 |
| DEL-09 | P3 | 真缺陷 | 404 页正文 15 字、title 不含 404、无 canonical | 实测 |
| DEL-10 | P3 | 真缺陷 | 无 apple-touch-icon / manifest，theme-color 仅 JS 注入 | 实测 |
| DEL-11 | P3 | 真缺陷 | `/chapters/chapter-4/` 偶发 46.5s 无响应（1/5 次） | 实测（根因未定位） |
| DEL-12 | P3 | **取舍** | 本地 8123 不能用来验 404/性能（不压缩、无 404.html、目录列表） | 实测 |
| DEL-13 | P3 | 信息 | 复核通过：15 页 = 本地 + 367B beacon，13 项资源逐字节相等 | 实测 |
| DEL-14 | P3 | 信息 | 其余路由语义正常：308 归一化、大小写 404、sitemap 一致 | 实测 |
| DEL-15 | P3 | 信息 | 正面项：h2/h3、zstd、无 webfont、favicon 200、Worker 502/421 路径 | 实测+代码推断 |

**P0：无。** 没有白屏、内容丢失或功能性不可用的默认路径。

---

## P1

### DEL-01 重复斜杠路径不归一化：返回 200，但 5 个 CSS/JS 全部 404，首屏被 1264px 的 logo 占满

**实测。** 线上对 `//` 与末尾 `//` 一律返回 200，**没有任何 301/308 归一化**。HTML 里全是相对路径（`../../assets/...`），在 `.../chapter-1//` 这样的 base 下解析后落到 `/chapters/assets/`、`/lab/assets/`，全部 404：

```
/chapters/assets/stylesheets/main.ec1eaa64.min.css   404 19012
/chapters/assets/notes.css                           404 19012
/lab/assets/interactions.js                          404 19012
/lab/assets/javascripts/bundle.d7400e89.min.js       404 19012
```

后果是**首屏直接崩掉**（不是"轻微没样式"）：

| 指标 | 规范 URL `/lab/scheduling/` | `/lab/scheduling//` | `/chapters/chapter-1//` |
|---|---|---|---|
| 状态码 | 200 | 200 | 200 |
| scrollHeight | 1 826 px | 9 972 px | 22 486 px |
| 正文 h1 绝对 top | 99 px | **8 282 px** | **9 154 px** |
| logo SVG 渲染尺寸 | 24×24 | **1264×1264**（填满 1280 视口） | 1264×1264 |
| body 计算字体 | `_, -apple-system, …` | `"Times New Roman"` | `"Times New Roman"` |
| 失败子资源 | 0 | 2 个 JS + 3 个 CSS | 2 个 JS + 3 个 CSS |

用户看到的是**一屏巨大的黑色书本图标**，正文被推到 8 000–9 000px 之外；lab 页的 `interactions.js` / `bundle` 都没加载，表单与甘特图脚本完全不执行。截图见 [lab-double-slash.png](qa/artifacts/delivery/lab-double-slash.png) 与对照 [lab-styled.png](qa/artifacts/delivery/lab-styled.png)。

- **可达性说明（不夸大）**：构建产物里没有任何内部链接产生双斜杠（grep `href="//` / `src="//` = 0 命中），只有手输/复制粘贴多一个斜杠才会命中。
- **缓解已存在**：`canonical` 正确指向 `/chapters/chapter-1/`，搜索引擎不会把它当重复内容——但**浏览器不会因为 canonical 就跳转**，用户照样看到坏页面。
- **改法**：`站点/docs/_redirects`（mkdocs 会原样复制进 dist）加双斜杠归一化 301，或在 `worker/index.js` 里对 `url.pathname.replace(/\/{2,}/g, '/')` 后 301。

---

## P2

### DEL-02 弱网首屏 5.9–6.2 秒才出字：3 个渲染阻塞样式表 + 0 个 preload/preconnect

**实测。** CDP 弱网（iPhone UA 390×844 @3x）：

| 条件 | 页面 | FCP | LCP | DCL | load | 正文可读 |
|---|---|---|---|---|---|---|
| Slow 3G（2000ms / 400kbps） | `/` | 5 892 ms | 5 892 ms | 6 104 ms | 6 104 ms | **6 111 ms** |
| Slow 3G | `/chapters/chapter-2/` | 6 208 ms | 6 208 ms | 6 534 ms | 6 535 ms | **6 549 ms** |
| Fast 3G（150ms / 1.6Mbps） | `/` | 1 476 ms | 1 476 ms | 1 539 ms | 1 539 ms | 1 545 ms |
| Fast 3G | `/chapters/chapter-2/` | 2 200 ms | 2 200 ms | 2 982 ms | 2 982 ms | 2 989 ms |

有线环境也不快：首页 TTFB 中位 **1 180 ms**、章节页 **1 373 ms**，LCP 中位 2 184 / 2 772 ms。结构原因很清楚——构建产物里 `rel="preload|preconnect|dns-prefetch|modulepreload"` 计数为 **0**，而 3 个样式表全部渲染阻塞（main 139 846B + palette 12 641B + notes 12 932B）。Slow 3G 下 HTML 一个 RTT、CSS 再一个 RTT、字体/脚本再一个，2 秒 RTT × 3 ≈ 6 秒，数字对得上。

**改法**：`main.css` 加 `rel=preload as=style`，把 `notes.css` 并进 main；beacon 源加 `preconnect` 或去掉 beacon。

### DEL-03 首页空闲期就拉 437 774B 的搜索索引（传输 103 173B），占首页总传输 59%

**实测。** 3 次冷加载有 **2 次**在 `load` 后约 1.2s 内拉取 `search/search_index.json`：

| 资源 | 解码 | 传输（zstd/h3） | 备注 |
|---|---|---|---|
| `search/search_index.json` | 437 774 B | **103 173 B** | 首页最大单文件，h3 |
| `search.2c215733.min.js` | 39 481 B | 13 617 B | 搜索 worker，h3 |
| 搜索相关合计 | 477 255 B | **116 790 B** | 占首页 197 730B 的 **59%** |

另 1 次只拉了 8 个请求、总传输 94 556B，说明这是空闲期竞态——用户实际体验是"多半会拉"。对静态笔记站来说，搜索索引应该在点开搜索框时才取。

**改法**：先关 `mkdocs.yml:27` 的 `search.suggest`（只留 `search.highlight`）验证是否还提前拉取；仍拉取则改成分片/延迟加载。

### DEL-04 HTML 既无 ETag 也无 Last-Modified，却声明 must-revalidate

**实测。** 线上 HTML 响应头只有 `cache-control: public, max-age=0, must-revalidate`，**没有 etag、没有 last-modified、没有 Vary**；静态资源相反，`assets/notes.css` 有 `ETag: "531a9752e45f2d17f188b957e590426e"`，带 `If-None-Match` 请求返回 **304 / 0 字节 / 699 ms**。

于是：HTML 每次导航都是整份重下（首页 zstd 6 611–6 686B / 解码 26 700B，章节页 22 244–22 396B / 解码 78 946B），**永远不会 304**。`must-revalidate` 在没有验证器时等于纯损失。

**改法**：`站点/docs/_headers` 给 `/*.html` 加 ETag 或把 `max-age` 调到 300，让重复访问走边缘/浏览器缓存。

### DEL-05 robots.txt 不由仓库控制：CF 托管 5 013B、无 Sitemap 行、`Disallow: /` 覆盖 Baiduspider

**实测。** 仓库和 `站点/dist` 里都**没有** robots.txt（本地 `/robots.txt` → 404），线上却是 200 / 5 013B / `cache-control: no-store`，是 Cloudflare 边缘托管的 content-signals 文件。直连源站 `pages.dev/robots.txt` 拿到的是**另一份** 1 248B 的同款文件——说明两层各自注入，仓库完全没有话语权。

线上那份的内容结构：

```
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /
User-agent: Baiduspider
Disallow: /
…（共约 50 组 UA，含 Bytespider / PetalBot / GPTBot / CCBot / ClaudeBot / PerplexityBot 等）
```

两个问题：**① 全文没有 `Sitemap:` 行**——站点有 sitemap.xml（200 / 2 110B / 14 条 URL / 与本地逐字节一致），但从未告诉爬虫；**② 封了 Baiduspider**——中文课程笔记站被百度拒之门外。

**改法**：`站点/docs/robots.txt` 写显式规则（含 `Sitemap: https://studynote.chosenecho.dpdns.org/sitemap.xml`），并在 Cloudflare 面板关掉该 zone 的 managed robots.txt；保留 AI 爬虫限制的话，把 Baiduspider 从 Disallow 列表拿掉。

### DEL-06 零 OG / Twitter 卡片，分享到微信、Telegram 没有标题与缩略图

**实测。** `meta[property^="og:"]` = 0 个，`meta[name^="twitter:"]` = 0 个；HTML 里一共只有 4 个 meta（其中 `theme-color` 还是 JS 运行时注入的）。`canonical` 与 `description` 都在且正确，唯独社交卡片全缺，链接预览会退化成裸 URL。

**改法**：`overrides/main.html` 的 `extrahead` 注入 `og:type/title/description/image/url` + `twitter:card=summary`，复用 `page.title` 与 `config.site_description`，图先用 `assets/images/favicon.png`（1 870B）。

### DEL-07 Worker `cacheEverything + cacheTtl:1800` 完全不可观测，代价是部署后最多 30 分钟旧 HTML

**实测 + 代码推断。** 响应头里**没有** `cf-cache-status`、没有 `Age`、没有 `x-cache`，只有 `server: cloudflare`、`cf-ray: …-SIN`、`cache-control: public, max-age=0, must-revalidate`、`x-served-by: cf-worker-proxy`。同一 keep-alive 连接连续 3 次：

| 请求 | 首页 TTFB | 章节页 TTFB |
|---|---|---|
| 第 1 次（含握手） | 730 ms（TLS 321 ms） | 940 ms（TLS 492 ms） |
| 第 2 次 | 375 ms | 547 ms |
| 第 3 次 | 312 ms | 517 ms |

第 2/3 次省下的是 TLS 握手，之后稳定在 1 个 RTT 量级，**看不出边缘命中带来的额外收益**。`cacheTtl: 1800` 只作用于 Worker 的回源子请求缓存，客户端侧不可见，所以"部署后旧 HTML 滞留多久"只能从代码推断上限 30 分钟（`cacheTtlByStatus` 对 404/3xx 是 60s、5xx 是 0）。

**取舍点**：要么接受 30 分钟新鲜度窗口并显式输出 `x-cache: HIT/MISS` 之类可观测头；要么把 HTML 的 cacheTtl 降到 60–300s。当前是"缓存收益看不见、滞后风险却真实存在"，两头都不占。

---

## P3

### DEL-08 安全头只有 2 个

**实测。** 存在：`referrer-policy: strict-origin-when-cross-origin`、`x-content-type-options: nosniff`（Worker 加的）。缺失：`strict-transport-security`、`content-security-policy`、`x-frame-options`、`permissions-policy`、`cross-origin-opener-policy`、`cross-origin-resource-policy`（**6 项全无**）。另 `server: cloudflare`、`x-served-by: cf-worker-proxy` 暴露反代实现。本地 python 服务更少，只有 `Server/Date/Content-Length/Content-Type/Last-Modified`。

**改法**：Worker 里补 HSTS（`max-age=31536000; includeSubDomains`）、`X-Frame-Options: DENY`、`Permissions-Policy`；CSP 先上 Report-Only（站点有 inline style/SVG，直接上会炸样式）。

### DEL-09 404 页正文只有 15 个字

**实测。** 状态码 404（正确）、响应体 19 379B（= 本地 404.html 19 012B + 367B beacon，剥离后逐字节相等）、`cache-control: no-store`（正确）。但 `<title>` 是"课程笔记"（不含 404），h1 是英文 `404 - Not found`，`.md-content` 正文 **15 个字符**，无 canonical，没有"你可能想找"的入口——只有 15 个侧边导航链接可退出。另 `/lab/` 也是 404（导航直链 `/lab/scheduling/`，属预期，不影响主流程）。

**改法**：`站点/docs/404.html` 覆盖模板，title 写"页面不存在 - 课程笔记"，正文加中文说明 + 两条直达链接。

### DEL-10 移动端交付元信息缺口

**实测。** `viewport` 正确（`width=device-width,initial-scale=1`，实测 `innerWidth=390`、`scrollWidth=390`，无横向溢出）；favicon 正常（`assets/favicon.svg` 200/332B、`assets/images/favicon.png` 200/1 870B）。但 `apple-touch-icon` 0 个、`manifest` 0 个、`apple-mobile-web-app-*` 0 个、`msapplication-TileColor` 0 个；`theme-color` 在原始 HTML 里**不存在**，是 Material 的 JS 注入的 `#ffffff`——JS 失败就没有。iOS"添加到主屏幕"会用页面截图当图标。

**改法**：生成 180×180 的 `apple-touch-icon.png`，`extrahead` 里加 `apple-touch-icon` 与静态 `theme-color`（深色用 media 查询给 `#1e1e1e`）。

### DEL-11 `/chapters/chapter-4/` 偶发 46.5 秒无响应

**实测（根因未定位）。** 首轮逐页请求时该页在 **46 505.8 ms** 后客户端 `TimeoutError`（无状态码、0 字节）；随后 4 次重试全部 200，耗时 1 172.2 / 1 278.1 / 1 492.4 / 1 292.6 ms，字节 66 703（= 本地 66 336 + 367 beacon），源站直连 991.7 ms / 66 336B。同批其他 14 页无一次超时。Worker 侧 `ORIGIN_TIMEOUT_MS = 15000`，若回源卡住应在 15 秒返回 502，而客户端等 46 秒仍未收完——指向边缘→客户端这一段。单次样本，不足以定性。

### DEL-12 本地 8123 不能用来验 404 与性能（取舍）

**实测。** 本地首页总传输 **796 010B**，线上同页 **197 730B**——差 **4.0 倍**，因为 python http.server 不压缩（`transferSize ≈ decodedBodySize ≈ 793 610`）。本地 TTFB 5 ms / LCP 88 ms，与线上 1 180 / 2 184 ms 没有可比性。本地 `/no-such-page/` 返回 404 + **335B** 的 python 默认页（不是 404.html），线上是 19 379B 的完整 404 页；本地 `/lab/` 返回 **200 + 242B 目录列表**，线上是 404；本地是 `http/1.0`、无任何安全头。

**取舍**：本地只适合看布局与内容；要本地验 404/压缩，用 `wrangler pages dev 站点/dist`。

---

## 信息性观察

### DEL-13 逐字节复核通过：15 页 = 本地 + 367B beacon，13 项资源全等

**实测。** 独立复核确认了 Lead 的结论，并给出逐页数字（`Accept-Encoding: identity`，sha256 比对）：

| 页面 | 线上 B | 本地 B | 差 | 判定 |
|---|---|---|---|---|
| `/` | 26 700 | 26 333 | +367 | beacon-only |
| `/chapters/chapter-1/` | 68 216 | 67 849 | +367 | beacon-only |
| `/chapters/chapter-2/` | 78 946 | 78 579 | +367 | beacon-only |
| `/chapters/chapter-3/` | 64 513 | 64 146 | +367 | beacon-only |
| `/chapters/chapter-4/` | 66 703 | 66 336 | +367 | beacon-only（首轮超时后重测） |
| `/chapters/chapter-5/` | 56 747 | 56 380 | +367 | beacon-only |
| `/chapters/chapter-6/` | 61 899 | 61 532 | +367 | beacon-only |
| `/computer-organization/chapter-1/` | 37 976 | 37 609 | +367 | beacon-only |
| `/computer-organization/chapter-2/` | 46 392 | 46 025 | +367 | beacon-only |
| `/computer-organization/chapter-3/` | 40 520 | 40 153 | +367 | beacon-only |
| `/computer-organization/chapter-4/` | 41 683 | 41 316 | +367 | beacon-only |
| `/computer-organization/chapter-5/` | 44 737 | 44 370 | +367 | beacon-only |
| `/computer-organization/chapter-6/` | 44 574 | 44 207 | +367 | beacon-only |
| `/lab/scheduling/` | 23 056 | 22 689 | +367 | beacon-only |
| `/404.html` | 19 379 | 19 012 | +367 | beacon-only |

静态资源 **13/13 逐字节相等**：notes.css 12 932、interactions.js 10 317、bundle 114 286、search worker 39 481、main.css 139 846、palette.css 12 641、favicon.svg 332、favicon.png 1 870、进程三态.svg 1 693、search_index.json 437 774、sitemap.xml 2 110、sitemap.xml.gz 278。唯一例外是 robots.txt（见 DEL-05）。

beacon 脚本实测 366B（+ 换行 = 367B）：`<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js/vce7…" integrity="sha512-…" data-cf-beacon='{"version":"2024.11.0","token":"0f6ce83f…","r":1,"spa":2}' crossorigin="anonymous"></script>`，文件本身 10 264B（`type=module` → 不阻塞渲染）。**源站 `pages.dev/` 首页 = 26 333B，与本地完全一致且不含 beacon** → beacon 由外层 zone 边缘注入，**没有发现陈旧内容或构建漂移**。

### DEL-14 其余路由语义正常

**实测。** `/chapters/chapter-1` → **308** → `/chapters/chapter-1/`；`/chapters/chapter-1/index.html` → **308** → `/chapters/chapter-1/`；`/index.html` → **308** → `/`；`/CHAPTERS/CHAPTER-1/` → **404**、`/Assets/Notes.css` → **404**（大小写敏感，正确）；带查询串 → 200；中文文件名 `%E8%BF%9B%E7%A8%8B%E4%B8%89%E6%80%81.svg` → 200/1 693B；`POST /` → **405**、`HEAD /` → 200。sitemap.xml 200 / 2 110B / **14 条 URL** / 与本地逐字节一致 / host 全部 `studynote.chosenecho.dpdns.org`（**无 `chosenecho.github.io` 子路径遗留**），与实际页面集合完全对应；首页与章节页 canonical 均指向规范化绝对 URL。唯一例外是双斜杠（DEL-01）。

> 注意：本地 python 服务在这几项上与线上不同（本地 301、大小写 200、`/lab/` 200 目录列表），比对时不要拿本地当基准。

### DEL-15 交付层正面项

**实测 + 代码推断。** ALPN 协商 **h2**（TLSv1.3，`TLS_AES_256_GCM_SHA384`）；`alt-svc: h3=":443"; ma=86400`，Chrome 实测文档走 h2、`search_index.json` 与搜索 worker 走 **h3**（`nextHopProtocol=h3`）。压缩：首页 identity 26 700B → gzip 5 789B / br 5 845B，Chrome 实际拿到 **zstd 6 611B**（章节页 78 946 → 22 244B；main.css 139 846 → 26 523B）。`font: false` 生效：**0 个字体请求**、`document.fonts` 为空。favicon.svg 200/332B。图形资源全部 SVG：15 个文件合计 **35 887B**，最大 `图1-11_程序执行过程的实例.svg` 6 170B。

Worker 故障路径（**代码推断**，无法实测）：回源异常 `catch` 后返回 **502** + `text/plain` 的 `origin error: …`（无重试、无 stale-if-error、无自定义页）；非白名单 host 返回 **421**；回源超时 **15 000ms**；`redirect: "manual"` 让源站 3xx 原样透传（与实测 308 一致）。

---

## 关键原始数字汇总

**性能（Chrome 141 headless，1366×900，每次新建 context，冷缓存）**

| 运行 | TTFB | DCL | load | LCP | CLS | 请求数 | 总传输 |
|---|---|---|---|---|---|---|---|
| live `/` ×3（中位） | 1 180 | 2 291 | 2 291 | 2 184 | 0 | 9 | 197 730 |
| live `/chapters/chapter-2/` ×3（中位） | 1 373 | 3 192 | 3 192 | 2 772 | 0.0063 | 10 | 214 401 |
| local `/` ×1 | 5 | 112 | 112 | 88 | 0 | 7 | 796 010 |
| local `/chapters/chapter-2/` ×1 | 4 | 289 | 289 | 196 | 0.0063 | 8 | 850 249 |

**弱网下图片懒加载**：章节页 5 个 `<img>` 中 4 个 `loading="lazy"`，load 事件时 0 个已加载；滚动后 4 个全部加载（naturalWidth 900）。另有 1 个 **无 `src` 的 `<img>`**（`complete=true / naturalWidth=0`）——这是 Material 的占位元素，**不是断图**，别误报。

**响应头对比（首页）**

| 头 | 线上 | 本地 |
|---|---|---|
| `cache-control` | `public, max-age=0, must-revalidate` | 无 |
| `etag` / `last-modified` | 无 / 无 | 无 / 有 |
| `content-encoding` | `zstd`（浏览器）/ gzip/br（协商） | 无（明文） |
| `content-length` | 无（chunked） | 26 333 |
| `cf-cache-status` / `age` | 无 / 无 | — |
| `referrer-policy` | `strict-origin-when-cross-origin` | 无 |
| `x-content-type-options` | `nosniff` | 无 |
| `hsts` / `csp` / `x-frame-options` / `permissions-policy` | 全无 | 全无 |
| `server` | `cloudflare` | `SimpleHTTP/0.6 Python/3.12.10` |
| `alt-svc` | `h3=":443"; ma=86400` | 无 |

**其他**：`POST /` → 405（0 字节）；`HEAD` → 200；`/lab/` → 404（19 379B）；`/no-such-page/` → 404（19 379B）；`notes.css` 带 `If-None-Match` → 304（0B / 699ms）。

---

## 缺口（拿不到，不编）

1. **边缘命中率**：`cf-cache-status` / `Age` / `x-cache` 一律不暴露，无法测量命中率，只能靠重复请求耗时间接推断（DEL-07）。
2. **Worker 502 与部署滞后**：不能打挂 Pages、不能触发部署，只有 `worker/index.js` 代码推断。
3. **DEL-11 根因**：需要 Cloudflare Analytics 或 Worker 日志权限，本机没有。
4. **beacon 实际传输字节**：跨域且无 `Timing-Allow-Origin`，Resource Timing 的 `transferSize=0`；只能用 curl 直接下文件得 10 264B。
5. **HTTP/3 深度验证**：只验证到 `alt-svc` 宣告 + Chrome `nextHopProtocol=h3`，本机无 QUIC 客户端做握手级验证。
6. **iOS 真机**：「添加到主屏幕」表现未在 Safari 真机验证，只有 Chromium + iPhone UA 模拟；`apple-touch-icon` 缺失是从 DOM 直接判定的。
7. **地理局限**：所有耗时来自本机（`cf-ray` 全部 `-SIN`），不代表中国大陆其他运营商或其他地区的绝对值；结构性结论（3 个阻塞 CSS、0 preload、无 ETag、双斜杠资源 404）不受此影响。

## 复现

```powershell
# 网络侧：逐页字节比对 + 路由 + 头部 + 压缩 + 条件请求
python qa/scripts/delivery_net.py          # -> qa/artifacts/delivery/net.json

# 浏览器侧：性能(线上3+本地1取中位) + 弱网 + 移动端 meta + 404 + 双斜杠渲染
node qa/scripts/delivery.mjs               # -> perf.json / weaknet.json / meta.json
node qa/scripts/delivery.mjs images        # -> images.json（逐图断图核查）
node qa/scripts/delivery.mjs shots         # -> shots.json + 6 张证据截图
```

所有命令在仓库根目录执行。产物：`qa/artifacts/delivery/`（net.json / perf.json / weaknet.json / meta.json / images.json / shots.json / live_robots.txt / 13 张 PNG / 若干原始输出 txt）。
