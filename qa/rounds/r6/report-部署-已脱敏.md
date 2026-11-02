# esa-deploy/ 部署目录甄别报告

- 审计对象：`C:\Users\ChosenEcho\Documents\学习资料\esa-deploy\`
- 审计时点：2026-11-01 10:42–10:50（Asia/Shanghai）
- 纪律：全程只读。未移动、未删除、未重命名、未改写 `esa-deploy/` 内任何文件；本文件是本任务唯一的写入产物。
- 处置码：**A** = 保留为项目文档/工具；**B** = 内容合并进一份部署记录后，原脚本/原文档退出；**C** = 丢弃。

## 0. 口径与三个必须先知道的偏差

1. **文件数不是 37 而是 39。** 任务下发的 37 文件 / 14.06 MB 出自 `_整理\inventory.csv`、`_整理\tree.txt`（生成于 10:39–10:41）。审计期间又多了两个文件：`shot-pages.png`（10:41:44）与 `静态站点全球加速方案总结.md`（10:43:40）。当前实测 39 文件 / 14,893,848 B ≈ 14.2 MB，`cfst/` 独占 11.29 MB。
2. **`_整理\hashes.csv` 里的 `worker/index.js` 哈希已过期。** 该文件在 10:39:54 被改写（2814 B → 2793 B，内容已切到 Pages 回源）。本报告以当前磁盘内容为准。
3. **`静态站点全球加速方案总结.md` 不是本次审计的输入，而是审计期间新落盘的第四份文档**，且它已经在做「三份文档合一」这件事。第 2 节的结论必须按这个事实给出，否则会建议出第二份重复的合并稿。

另外两件与处置无关但影响结论的事实：`esa-deploy/` 未被 git 跟踪（`git ls-files esa-deploy` 返回 0 条，`git status` 只有 `?? esa-deploy/`），`.gitignore` 也没有匹配它（`git check-ignore` 为非零退出）；仓库最后一次提交是 `0836fc7 2026-10-31 21:39:11 Remove CSS for the retired homepage layout`，也就是这批文件全部产生于最后一次提交之后。

---

## 1. 逐文件处置表

### 1.1 根目录（29 个文件）

| 路径 | 体积 | 作用（具体） | 一次性/可复用 | 敏感信息 | 处置 |
|---|---|---|---|---|---|
| `abuse_test.sh` | 466 B | 用 `xargs -P 20` 对首页打 120 次请求，验证 `limit_req` 真会咬人（返回 429 计数），再隔 3 秒确认恢复 200 | 可复用（只改 `B=`) | 无 | A |
| `apply_stage_a.sh` | 5.4 KB | 阶段 A 一键加固：写入 `sshd_config.d/99-hardening.conf`、`conf.d/00-limits.conf`（限速 zone）、装站点配置、装 fail2ban（仅 sshd jail）、生成 `site-backup.sh`/`site-restore.sh`+`/etc/cron.d/site-backup`、开 unattended-upgrades；每步先 `sshd -t`/`nginx -t` 校验再 reload，失败保留旧配置 | 可复用（幂等，注释写明） | L77 `ignoreip = … 49.74.78.…（出口 IP 已脱敏）`（本人出口公网 IP） | A（脱敏后） |
| `cf.mjs` | 5.5 KB | 零依赖 Cloudflare API CLI：`zones` / `dns list\|set\|del` / `purge` / `verify`，token 只从 `CLOUDFLARE_API_TOKEN` 读，`<zone>` 支持域名自动换 id，set 时按是否存在决定 PUT/POST | 可复用工具 | 无硬编码凭据（L19 走 env） | A |
| `CF优选IP实测与接入方案.md` | 5.1 KB | cfst 扫 1728 个 CF 边缘 IP 的延迟分布（p50 194ms、<100ms 仅 4.6%），再用 `curl --resolve` 手工复测 TLS/TTFB/吞吐，结论是「TLS 握手吃掉 TCP 优势，优选 IP 仍比直连慢 3–6 倍」，并给出 Cloudflare for SaaS 让指定 anycast IP 生效的原理 | 半（结论部分被后来的 1034 实测推翻，见 §2） | L4 出口 IP `49.74.78.…（出口 IP 已脱敏）`；L17 cfst SHA256 | B |
| `deploy.sh` | 1.0 KB | 把 `index.html` 与 `site.conf` 装到 `/var/www/site`、`sites-available/site`，`rm -f sites-enabled/default` 避免 `default_server` 冲突，`nginx -t` 后 reload，末尾 curl 自检 `/healthz` 与 `/` | 一次性（只有「删 default 站点」一句值得留） | 无 | B |
| `enable_tls.sh` | 1.6 KB | 生成 10 年自签证书（`openssl req -addext subjectAltName=DNS:域,DNS:*.域`），装含 443 的 `site.conf`，`curl -sk` 自检 https 并列出 443 监听 | 一次性（流程可留档） | L4 默认域名 `chosenecho.dpdns.org` | B |
| `ESA接入可行性评估与部署记录.md` | 8.9 KB | ESA 的 5 条硬规则（加速区域×备案强绑定、未备案 525、备案后等 8 小时、Entrance 不含内地、回源仅公网）、中国站四档价格与超量单价、三条路线（等备案/先上全球不含内地/搬境外）、本次已在 ECS 完成的 12 项动作表 | 半（规则长期有效，动作表一次性） | L6、L52、L55、L84、L103 公网 IP `182.92.225.…（源站 IP 已脱敏）`（L3 `<实例ID>`、L7 `<安全组ID>` 已是占位符） | B |
| `index.html` | 723 B | 「建设中」占位页：`place-items:center` 居中 + 绿点 + `noindex,nofollow`，用于 Nginx 上线初期证明 80 端口可访问 | 一次性 | 无 | C |
| `issue_cert.sh` | 2.3 KB | certbot DNS-01（cloudflare 插件）签发正式证书：写 `/root/.secrets/cloudflare.ini`（600）→ `certonly --dns-cloudflare` → `sed` 把 443 证书路径换成 `/etc/letsencrypt/live/…` → `nginx -t` 失败自动反向 sed 回滚 | 半（流程模板；token 已是占位符） | L5 `TOKEN="__CF_TOKEN__"`（占位，安全） | B |
| `issue_cert.run.sh` | 2.3 KB | 与 `issue_cert.sh` 逐行同构，唯一区别是把占位符替换成了真实 token 的执行留档 | 一次性 | **L5 `TOKEN="cfut_…REDACTED"`（明文 Cloudflare API Token）** | C（并须吊销该 token） |
| `measure_weight.sh` | 1.2 KB | 抓首页全部本地资源的 gzip 后字节数，算出单次 PV 传输量，再用 awk 反推 50 GB 套餐能撑多少次首访/多少次有 30 天缓存的二访 | 可复用（估算方法，数字换站点即可） | 无 | A |
| `patch_cache.py` | 550 B | 对 `/etc/nginx/sites-available/site` 的 `location /` 插一行 `add_header Cache-Control "public, max-age=600"`，先拷 `.bak2`、已存在则跳过（幂等） | 一次性（且已造成配置漂移，见 §4.1） | 无 | C |
| `probe.sh` | 1.3 KB | 站点自检：8 条路径的状态码表（含 `/chapters`、`/computer-organization`、`/lab`、`search_index.json`、`sitemap.xml`）、首页完整响应头、CSS 的 raw vs gzip 字节、404 页标题、TTFB 分解 | 半（路径写死本站构建产物） | 无 | B |
| `security_probe.sh` | 2.2 KB | 只读主机体检：`sshd -T` 生效项、drop-in 列表、ufw/fail2ban/auditd/chrony 装没装、监听端口、`auth.log` 24h 爆破统计与 top offender、root 密钥数、可登录 shell、apt 周期配置、webroot 里 `.git`/`.map`、内存磁盘 | 可复用（通用主机盘点清单） | 无（输出的是目标机数据，脚本本身不含） | A |
| `sg_probe.py` | 6.1 KB | 手写 ACS3-HMAC-SHA256 签名直调 ECS OpenAPI：`DescribeInstances` → 取安全组 → `DescribeSecurityGroupAttribute` 打印入方向规则；只有 `--authorize` / `--revoke-rdp` 才真改规则，默认纯读 | 可复用（阿里云签名最小实现） | **L16 `INSTANCE_ID = "i-2ze4tvkuf12y1pzgka8a"`（真实实例 ID）**；L22 读 `~/.workbench/config.json` 取明文 AK（文件本身未入库，但暴露了凭据存放位置与权限模型） | A（脱敏后） |
| `shot-after-harden.png` | 139 KB | 1440×900 站点首页渲染截图。**文件名与内容不符**：画面是课程笔记首页，不是加固后的终端/命令输出 | 一次性 | 无（无地址栏、无终端、无 IP） | C |
| `shot-cf-fastip.png` | 139 KB | 与上一张**字节完全相同**（SHA256 `2A787934AB899361…`），即同一张首页截图被改名另存 | 一次性 | 无 | C |
| `shot-chapter1.png` | 257 KB | 第 1 章页面渲染图（复习导航表 + 右侧目录） | 一次性 | 无 | C |
| `shot-index.png` | 187 KB | 首页渲染图（与 shot-pages 同页、不同视口/时间） | 一次性 | 无 | C |
| `shot-lab.png` | 102 KB | 「进程调度实验」页渲染图 | 一次性 | 无 | C |
| `shot-pages.png` | 134 KB | 1440×820 首页渲染图（Pages 部署后的同一页面） | 一次性 | 无 | C |
| `shot-studynote.png` | 200 KB | 1440×760 第 1 章渲染图（含「本章已复习」勾选与字号选择器） | 一次性 | 无 | C |
| `site-dist.tar.gz` | 856 KB | `站点/dist` 的 tar 快照：105 条目 = 79 文件 + 26 目录，路径为 `./` 前缀，全部条目时间戳 10-31 21:36 | 一次性 | 无（内含 4 个 `.map` 源码映射） | C |
| `site-dist.zip` | 897 KB | 同一份 dist 的 zip 快照，Windows 打包（反斜杠路径），79 条目 | 一次性 | 同上 | C |
| `site.conf` | 4.5 KB | 生产 Nginx 站点配置，80+443 双 server 块：gzip 类型表、静态资源 `expires 30d`、`/healthz` 直返 200、ACME 目录放行、点文件 deny、`.map` 404、`limit_req burst=50 nodelay` + `limit_conn 20`、`try_files` 不做 SPA 回退、后端反代模板注释块 | 可复用模板（本项目最值钱的一个文件） | L104-105 指向 `/etc/ssl/private/site-temp.key`（路径，非密钥本体）；内含 443 自签方案已过期（见 §4.1） | A |
| `verify_limits.sh` | 1.0 KB | 限速回归三段式：串行 40 次统计 200/非 200、并发 12 抓首页全部资源、再从 `site.access.log` 数 429 | 可复用（验收方法） | 无 | A |
| `verify_stage_a.sh` | 1.8 KB | 加固验收清单式自检 8 组：关键路径状态码（含 `.map` 应为 404、`/.git/config` 应为 403）、响应头、限速、fail2ban、备份、自动更新、`sshd -T` 生效值、监听面 | 半（写死了 `bundle.d7400e89…map` 等构建哈希，换构建即失效） | 无 | B |
| `安全控制与访问控制方案.md` | 10.4 KB | 安全方法论：风险排序（AK 泄漏 > 源站 IP 暴露 > 管理面 > 应用细节）、现状实测 15 项、A/B/C 三阶段动作表、回滚矩阵、不建议做的四件事、阶段 A 执行记录、限速 10→20 r/s 的返工实测、关键路径现状 | 可复用（方法论 + 记录） | 无（凭据类只提到机制，不含值） | B |
| `静态站点全球加速方案总结.md` | 9.4 KB | **审计期间新增（10:43:40）**：把三份文档收敛成一条线「最终链路 = CF Pages + Worker 路由，ECS 退居回滚备份」，含三阶段 TTFB 实测（58ms / 730–900ms / ~600ms）、五个坑（80 备案拦截、443 SNI 精准拦截、Worker 不能 fetch 裸 IP、1034 Edge IP Restricted、wrangler 双配置目录）、CF 错误码速查、运维手册、成本对照 | 可复用（应作为合并产物的主干） | L132、L209 公网 IP `182.92.225.…（源站 IP 已脱敏）`；L24、L28-29、L187-189、L199-212 真实域名与 DNS 记录（含 `pw.… → cfargotunnel.com`） | A（脱敏后作 README 主干） |
| `worker/index.js` | 2.7 KB | Worker 反代：Host 白名单（非白名单返回 421）、改写到 Pages 源站、删掉 `cf-connecting-ip/ipv6/cf-worker` 后把真实访客 IP 写进 `X-Forwarded-For`、`cacheEverything + cacheTtlByStatus`（200-299 1800s / 302 60s / 404 60s / 5xx 0）、15s AbortController 超时与 502 兜底 | 可复用 | L5、L22 真实子域 `studynote.chosenecho.dpdns.org`；L13-14 `studynote-42b.pages.dev` | A（脱敏后） |
| `worker/wrangler.toml` | 320 B | Worker 部署配置：name/main/compatibility_date、account_id、routes 把子域绑到 zone（Host 决定命中哪个 Worker 的关键） | 可复用 | **L4 `account_id = "d04b802998edb84eaa3d83a2feac85a3"`**；L8 `zone_name` | A（脱敏后） |
| `worker/.wrangler/tmp/`（空目录） | 0 | wrangler 本地临时目录，0 个文件 | 一次性 | 无 | C |

### 1.2 `cfst/`（7 个文件，11.29 MB）

| 路径 | 体积 | 作用（具体） | 一次性/可复用 | 敏感信息 | 处置 |
|---|---|---|---|---|---|
| `cfst/cfst.exe` | 8.0 MB | CloudflareSpeedTest v2.3.5 Windows 二进制（上游 release 原件，mtime 2026-04-29） | 一次性（可重下） | 无 | C |
| `cfst/cfst.zip` | 3.2 MB | 同一 release 的压缩包；SHA256 `67D06A0C…` 与官方一致（`CF优选IP实测与接入方案.md` L17 已记录） | 一次性 | 无 | C |
| `cfst/cfst_hosts.bat` | 3.4 KB | 上游脚本 v1.0.5（作者 XIU2）：测速后改写系统 Hosts 里的 CF IP | 第三方，非本项目产物 | 无 | C |
| `cfst/cfst_3proxy.bat` | 3.6 KB | 上游脚本 v1.0.6（作者 XIU2）：测速后改写 3Proxy 配置 | 第三方 | 无 | C |
| `cfst/cfst_result.csv` | 66.1 KB | 1728 次实测原始结果（IP / 已发送 / 已接收 / 丢包率 / 平均延迟 / 下载速度 / 地区码），表头为 GBK 乱码；§2 的分布统计即来自此表 | 一次性（结论已进文档） | 无 | C |
| `cfst/ip.txt` | 410 B | 上游 IPv4 段清单，25 段 | 第三方 | 无 | C |
| `cfst/ipv6.txt` | 1.9 KB | 上游 IPv6 段清单，97 段 | 第三方 | 无 | C |
| `cfst/使用+错误+反馈说明.txt` | 1.9 KB | 上游说明：走代理会导致延迟虚低、开机首测偏高、`-f`/`-ip` 用法 | 第三方 | 无 | C |

### 1.3 处置汇总

| 处置 | 文件数 | 体积 |
|---|---|---|
| A 保留 | 11（`abuse_test.sh`、`apply_stage_a.sh`、`cf.mjs`、`measure_weight.sh`、`security_probe.sh`、`sg_probe.py`、`site.conf`、`verify_limits.sh`、`静态站点全球加速方案总结.md`、`worker/index.js`、`worker/wrangler.toml`） | ≈ 41 KB |
| B 合并后退出 | 8（三份 md 里的两份旧稿、`deploy.sh`、`enable_tls.sh`、`issue_cert.sh`、`probe.sh`、`verify_stage_a.sh`、`安全控制与访问控制方案.md`） | ≈ 32 KB |
| C 丢弃 | 20（`index.html`、`issue_cert.run.sh`、`patch_cache.py`、7 张截图、`site-dist.zip`、`site-dist.tar.gz`、`cfst/` 7 个文件、`worker/.wrangler/tmp`） | ≈ 14.2 MB |

**净结果：14.2 MB → 约 41 KB 的保留集 + 约 30 KB 的合并文档，压缩比 99.5%。** 14.2 MB 里 13.9 MB 是第三方二进制 + 构建产物 + 截图。

---

## 2. 三份 Markdown 的价值判断

### 2.1 重复关系（逐条对照，不是印象）

| 主题 | `ESA接入…记录.md`（118 行） | `CF优选IP实测…方案.md`（120 行） | `安全控制…方案.md`（162 行） | 判断 |
|---|---|---|---|---|
| 套餐价格与超量单价 | L40-47 四档完整表 | — | — | 唯一来源，必须保留 |
| 备案期不能切 NS | L68（明确不推荐 + 理由） | L76-77（同一条，较短） | — | **重复**，留 ESA 版 |
| 备案后等 8 小时 | L34、L53、L100 | — | — | 唯一来源，但被新总结 L244 复述 |
| 未备案 80 端口被拦 / 525 报错 | L33、L61-62、L93 | 隐含（L109 要求回源 443） | — | **重复**，且新总结 L108-127 给了更硬的实验证据（SNI 对比表） |
| 阶段 A 加固成果 | L74-84 动作表 | — | L123-134 执行记录（一手） | **重复**：ESA 那份是二手摘要，安全那份是一手记录 |
| 优选 IP 实测数据 | — | L19-62（1728 IP 分布 + 手工复测 + 直连对照） | — | 唯一来源，但**结论已被推翻**：CF 文档说「优选能挑出好节点」，新总结 L139-151 实测这些低延迟 IP 全返回 1034 Edge IP Restricted |
| 成本/延迟横向对比 | L40-47 只有 ESA 价格 | L57-61 只有直连对照 | — | 都缺，只有新总结 L227-233 有完整对照表 |
| 错误码含义 | 只有 525 一处 | 无 | 无 | 只有新总结 L163-170 有速查表 |
| wrangler/Pages 操作 | 无 | wrangler 版本一行（L13） | 无 | 只有新总结 §6.1 有可执行命令 |

结论分三层：

1. **`ESA接入…记录.md` 与 `安全控制…方案.md` 几乎没有重复**（一个讲边缘加速的准入规则与成本，一个讲主机安全基线），但两者都在复述「备案期结论」这一小块。
2. **`CF优选IP实测…方案.md` 的重复度最高、且价值最低**：它的结论段（L63-72）已被新总结的 1034 实测反证；它的工具就位段（L11-17）只是环境事实；真正还站得住的只有两类内容——1728 IP 的延迟分布原始数据（L19-37）和 Cloudflare for SaaS 让指定 anycast IP 生效的原理解释（L90-102）。
3. **第四份文档已经在做合并**（`静态站点全球加速方案总结.md`，277 行）。它的 §三把三阶段实测串成一条时间线，§四的五个坑覆盖了前两份文档里零散的现象，§六的运维手册是可执行命令，§七把三家成本放一张表。**如果不把前三份降级、只留这一份，仓库里就会长期存在两套互相矛盾的结论**（「优选 IP 能用」vs「大部分优选 IP 是 1034」）。这是本轮最该修的问题。

### 2.2 是否值得合并

值得，而且已经做了 80%——剩下的 20% 是「删旧稿」而不是「再写一版」。合并后建议只保留一份正文（约 300 行），把三份原文降级到 `docs/archive/` 并各加一行「本文结论已被 §X 取代」的抬头。

必须合并的硬理由：三份文档对同一事实给出了两套口径（优选 IP 可行性与阶段 A 是「已完成」还是「待做」），读者无法判断哪份是最新。

保留时不建议的形态：三份并列 + 一份总结。四份文档讲一件事，是这次整理要消除的形态。

### 2.3 合并后建议的章节结构（10 节，按「问题→现状→选型→实测→踩坑→运维」排列）

| # | 章节 | 素材来源 | 备注 |
|---|---|---|---|
| 1 | 现状速览（一张表：当前链路、ECS 角色、花钱多少、待办） | 新总结 §一、§二 | 首屏必须答完「现在是什么、要不要动」 |
| 2 | 环境事实（规格/系统/Nginx 版本、域名与 DNS 记录、安全组端口） | ESA 文档 L3-8 + 新总结 §6.4 | 全部使用占位符，见 §6 |
| 3 | 三条路线与选型（直连 ECS / CF Worker+源站 / CF Pages；备案后的 ESA） | ESA 文档 §四 + 新总结 §三 | 保留「为什么放弃前两条」的因果 |
| 4 | ESA 准入规则（加速区域×备案、8 小时、525、回源仅公网、Entrance 不含内地） | ESA 文档 §二 | 这部分是外部规则，最不容易过期，应最靠前 |
| 5 | 实测数据（直连 58ms / Worker 730–900ms / Pages ~600ms；1728 IP 延迟分布；TLS 成本拆解） | CF 文档 §2-3 + 新总结 §三 | **保留结论反转的痕迹**：早期「优选可用」→ 后期 1034 实测 |
| 6 | 踩坑与错误码（80 拦截、443 SNI、Worker 裸 IP、1034、wrangler 双目录 + 525/526/530/1003/421 速查） | 新总结 §四、§五 | |
| 7 | 主机加固与安全基线（SSH drop-in、fail2ban、Nginx 收紧、备份、自动更新 + 阶段 A 执行记录 + 限速返工） | 安全文档全篇 | 一手记录，不改写 |
| 8 | 运维手册（更新部署一条命令、换优选 IP、回滚到 ECS、DNS 现状、验收命令） | 新总结 §六 + `probe.sh`/`verify_stage_a.sh` 的命令清单 | 脚本退出后，命令必须落在文档里 |
| 9 | 附录 A：文件与脚本清单（每个一行作用 + 是否可复用 + 敏感项） | 本报告 §1 | 让后来者不用再逐文件读 |
| 10 | 附录 B：凭据与脱敏约定（哪些值必须占位符、token 存哪、哪些不许入库） | 本报告 §6 | 防止下一次又泄漏 token |

不要合并进去的：`CF优选IP实测…方案.md` 的 §5「要真正跑起来还缺什么」与 §6「下一步需要你提供」——这两段是当时的待办，现在全部已解决或已废弃，合并只会制造噪音。

---

## 3. `site-dist.zip` / `site-dist.tar.gz` 的定性

### 3.1 解压清单比对（实测，不是估算）

| 检查项 | 结果 |
|---|---|
| `站点/dist` 当前状态 | 79 文件 / 3,725,727 B / 全部文件 mtime `2026-10-31 21:36:39`（目录 mtime 同值） |
| `site-dist.zip` 条目 | 79 条，全为文件；路径用反斜杠（`assets\figures\…`），Windows 打包 |
| zip 与 dist 内容比对 | 用 `System.IO.Compression.ZipFile` 逐条读取条目流算 SHA-256，与 `站点/dist` 对应文件 `Get-FileHash -Algorithm SHA256` 比对：**79/79 完全一致，0 差异** |
| `site-dist.tar.gz` 条目 | 105 条 = 79 文件 + 26 目录；路径 `./` 前缀；全部条目时间戳 `10-31 21:36` |
| tar 与 dist 体积比对 | tar 内 79 个文件体积之和 = 3,725,727 B，与 dist 总字节**完全相等**；文件数同为 79（tar 侧未逐字节比对，仅比对条目数与体积总和） |
| 相对 `站点/dist` 是否过期 | **没有过期，但也没有增量价值**：dist 自 21:36:39 之后未再被写，两个归档（09:43:35 / 09:44:18）只是把当时就是这个状态的内容原样打包 |

### 3.2 结论：**可丢**

三条理由，任一成立即可丢，这里三条都成立：

1. **它是可重建产物，不是源。** README L39-51 写明 `站点/dist` 由 `python -m mkdocs build -f 站点/mkdocs.yml --strict` 生成、产物位置就是 `站点/dist`；`站点/docs/chapters/`、`docs/assets/figures/` 也都是 `hooks.py` 生成、不进版本控制（README L73）。dist 里没有任何手写内容。
2. **唯一副本不成立。** `站点/dist` 现在还在盘上，且与归档逐字节一致（zip 侧 79/79 SHA-256 相同）。归档没有保存任何「dist 里已经没有」的东西。
3. **它本来就是被 git 忽略的东西。** `.gitignore` L7 明写 `站点/dist/`——仓库从设计上就不给 dist 留位置。把它的两份归档塞进仓库，等于绕过自己写的规则。

顺带一个处置提醒：两份归档里都含 4 个 `.map` 源码映射（`bundle.d7400e89.min.js.map` 1,026,914 B、`workers/search.2c215733.min.js.map` 216,029 B、`main.ec1eaa64.min.css.map` 47,587 B、`palette.ab4e12ef.min.css.map` 3,670 B）。`site.conf` L58-60 和 L136 正是为了不让这些东西被公网下载才写的 404 规则。这两份归档哪天被误传到某个静态空间，就等于把源码结构公开——这也是「别入库」的加分理由。

---

## 4. 脚本可复用性：哪些知识值得抽成文档，哪些只是一次性执行记录

### 4.1 先说一个必须修的发现：仓库里的 `site.conf` 已经和线上不一致

| 漂移点 | 证据 | 后果 |
|---|---|---|
| HTML 缓存头 | `patch_cache.py` L6-8 声称给 `location /` 插 `add_header Cache-Control "public, max-age=600"`；但仓库 `site.conf` L69-74 的 `location /` 里**没有这一行** | 该 patch 只在服务器生效，未回流仓库副本 |
| 证书路径 | 仓库 `site.conf` L104-105 仍指向自签证书 `/etc/ssl/certs/site-temp.crt`；而 `issue_cert.run.sh` L48 已在服务器上把它 `sed` 成 `/etc/letsencrypt/live/chosenecho.dpdns.org/fullchain.pem` | 按仓库副本重装一次，会把正式证书换回自签，Cloudflare「完全」模式之外的链路全部 526 |
| 限速参数 | `verify_stage_a.sh` L31 的注释还写着「10r/s + burst 20」；实际生效的是 `apply_stage_a.sh` L43 的 `rate=20r/s` + `site.conf` L71 的 `burst=50` | 验收时按注释读会误判 |

结论：`site.conf` 归 A 之前，必须先从服务器 `cat /etc/nginx/sites-available/site` 回灌一次，再脱敏。**否则「保留配置模板」保留的是一份会把人带坑里的旧配置。** 同理 `patch_cache.py` 该丢——它的作用应当直接体现在回灌后的 `site.conf` 里，而不是靠一个事后打补丁的脚本。

### 4.2 值得抽成文档的知识（按价值排序）

| 知识 | 出处（行号） | 为什么值钱 |
|---|---|---|
| Nginx 静态站配置骨架 | `site.conf` L17-74 | 一套可直接抄的 2026 年写法：`expires` 会**同时**写 `Expires` 与 `Cache-Control`，所以不能重复 `add_header`（L62 注释）；`/healthz` 用 `return 200` 而不是放文件（L39-43）；ACME 放行必须用 `^~` 且写在 dotfile deny 前面（L46-55）；`.map` 直接 `return 404`（L58-60）；`try_files … =404` 不做 SPA 回退（L73） |
| 限速 zone 与 429 语义 | `apply_stage_a.sh` L40-47；`site.conf` L71-72 | `limit_req_zone … rate=20r/s` + `limit_req_status 429`（默认 503 语义错）；`limit_conn` 兜底并发。目前它埋在 heredoc 里，读脚本才能看到——应独立成 `00-limits.conf` |
| SSH drop-in 加固 + 带外救援 | `apply_stage_a.sh` L17-36；`安全控制…方案.md` L102 | 关键认知：`sshd -t` 通过再 reload、失败保留旧配置；以及「workbench 走控制面不经 22 端口」才是敢做 SSH 收紧的前提 |
| fail2ban 最小 jail | `apply_stage_a.sh` L70-78 | `backend=systemd` + `ignoreip` 白名单（漏了白名单会被自己封） |
| 备份/恢复脚本 + cron 保留 7 份 | `apply_stage_a.sh` L91-127 | `site-restore.sh` 先把 webroot 移成 `.rollback.HHMMSS` 再解包，是个可直接复用的安全回滚写法 |
| certbot DNS-01 全流程 + 失败自动回滚 | `issue_cert.sh` L27-58 | 三点：`--dns-cloudflare-propagation-seconds 30`；凭据文件 600；`sed` 换路径后 `nginx -t` 失败就反向 `sed` 回去。这套「改配置→校验→自动回滚」值得单独一节 |
| 阿里云 OpenAPI 手写 ACS3 签名 | `sg_probe.py` L29-56 | 不装 SDK 也能调 ECS API 的最小实现（canonical request → string to sign → HMAC），安全组只读审计的通用工具 |
| Cloudflare API 最小封装 | `cf.mjs` L28-50、L85-101 | token 走 env、`/^[0-9a-f]{32}$/` 判断是 id 还是域名、set 时先查存在再 PUT/POST |
| Worker 反代三件套 | `worker/index.js` L22-51 | Host 白名单挡误解析（421）、`cacheEverything + cacheTtlByStatus` 分级缓存、删 `cf-connecting-ip` 再写 `X-Forwarded-For` 保留真实访客 IP |
| 优选 IP 为什么能生效 / 什么时候不能 | `CF优选IP实测…方案.md` L90-102 + 新总结 L139-151 | 「任意 anycast IP 都接受你的 Host」是原理；「1034 Edge IP Restricted」是现实边界。**这两段必须成对写**，只写原理会误导 |
| 流量套餐容量估算 | `measure_weight.sh` L10-32 | 先测 gzip 后单页总量，再反推套餐能撑多少 PV；同时区分首访与有 30 天缓存的二访 |
| 限速验收三段式 | `verify_limits.sh` L6-24 + `abuse_test.sh` L5-6 | 串行基线（证明不误伤）→ 并发抓全页资源（证明正常浏览安全）→ 20 并发 ×120 次（证明刷站会被咬）→ 停止 3 秒恢复 |
| 通用主机体检清单 | `security_probe.sh` L5-54 | 15 项只读检查，换任何一台 Linux 都能直接跑 |
| 自签证书一行式 | `enable_tls.sh` L13-17 | `openssl req -x509 -addext "subjectAltName=DNS:域,DNS:*.域"` |

### 4.3 纯一次性执行记录（抽不出知识，别留）

| 文件 | 为什么不留 |
|---|---|
| `deploy.sh`（除 L17） | 「装文件 + nginx -t + reload」是常识；唯一有价值的是 `rm -f sites-enabled/default` 避免 `default_server` 冲突，一句注释即可 |
| `patch_cache.py` | 见 §4.1：一次性打补丁，且已造成漂移；正确做法是改 `site.conf` 本身 |
| `issue_cert.run.sh` | 与 `issue_cert.sh` 同构，唯一差别是明文 token；保留它等于保留一个凭据副本 |
| `index.html` | 「建设中」占位页，站点已由 MkDocs 生成真首页，占位页完成使命 |
| `probe.sh` / `verify_stage_a.sh` | 检查项本身有价值（已进 §4.2 的方法论），但脚本写死了本站的构建哈希（`bundle.d7400e89…`、`main.ec1eaa64…`）与路径，下次构建即失效——把「检查什么」抄进文档，脚本退出 |
| 7 张截图 | 全是站点页面渲染图，两张还重复。没有任何一张记录了「只能靠看才知道」的信息（无终端、无图表、无控制台） |
| `site-dist.*` | 见 §3 |
| `cfst/*` | 上游第三方发行包与原始 CSV；需要时从 release 重下即可，SHA256 已在文档里 |
| `worker/.wrangler/tmp/` | 空目录 |

---

## 5. 归位方案

### 5.1 选 (a)：整个目录移出笔记仓库，独立成项目目录

**建议新名与位置**：`C:\Users\ChosenEcho\Documents\studynote-deploy\`
（名字跟 Cloudflare Pages 项目名 `studynote` 对齐，见新总结 §6.1 的部署命令；避免再用 `esa-deploy` 这种「只描述一次实验」的名字，因为它现在装的是三条路线 + 主机加固 + Worker，不止 ESA。）

理由五条，按权重排：

1. **仓库的职责被 README 定死了。** README L3：「笔记是唯一需要维护的东西；站点每次构建都从笔记重新生成，不手工编辑。」L11 的目录表里只有 `站点/`，没有部署位置。把 14.2 MB 的实验产物塞进来，与仓库自述冲突。
2. **仓库已经有一条现行发布链，再来一条会互相打脸。** README L55 与 `.github/workflows/pages.yml` 已经把「推到 main → Actions 构建 → 发 Pages」写成唯一流程。`esa-deploy/` 描述的却是「ECS + Nginx + certbot + CF Worker」的另一条链。两条链同时躺在仓库里，后来者无法判断哪条是当前生效的。
3. **这批文件里有真凭据，而这个仓库有远端。** `git remote` 指向 `origin/main`，一旦 `git add .` 就会把 `issue_cert.run.sh` 的明文 Cloudflare token、`wrangler.toml` 的 account_id、`sg_probe.py` 的实例 ID 推进公开仓库。独立目录可以只做本地备份（甚至只做加密备份），风险面完全不同。
4. **体积结构不匹配。** 14.2 MB 里 13.9 MB 是二进制与构建产物，保留集只有 41 KB。为 41 KB 的文档让仓库背 14 MB 的第三方 exe，不划算。
5. **它需要自己的 .gitignore 与保密约定。** 独立目录可以写一份「凭据不许入库、二进制不许入库」的规则，而不必把这些规则混进笔记仓库的 `.gitignore`（后者现在只有 4 类规则，很干净）。

不选 (b) 的条件也写清楚：只有当「部署必须与笔记同仓、同 PR 评审」成为硬需求时才选 (b)。即便如此，也必须先脱敏、再把凭据移到 env/user-secrets，且只入库保留集（约 75 KB），绝不含 `cfst/`、`site-dist.*`、截图、`*.run.sh`。

### 5.2 目标路径映射表

| 源（`esa-deploy/…`） | 目标（`studynote-deploy/…`） | 处置 | 备注 |
|---|---|---|---|
| `静态站点全球加速方案总结.md` | `README.md` | A | 脱敏后作主干；补 §2.3 的第 1、2、9、10 节 |
| `ESA接入可行性评估与部署记录.md` | `docs/archive/ESA接入可行性评估与部署记录.md` | B | 内容并入 README §3、§4；原文留档 + 抬头注明「结论已并入 README」 |
| `CF优选IP实测与接入方案.md` | `docs/archive/CF优选IP实测与接入方案.md` | B | 数据并入 README §5；**必须同段写明 1034 的反证** |
| `安全控制与访问控制方案.md` | `docs/02-安全基线.md`（一手记录，保持全文） | B | 与 README §7 互为引用，不删原文 |
| `worker/index.js` | `cloudflare/worker/index.js` | A | 脱敏 L5/L13/L22 |
| `worker/wrangler.toml` | `cloudflare/worker/wrangler.toml` | A | `account_id` 换成 `<CF_ACCOUNT_ID>` 或改读 env |
| `cf.mjs` | `cloudflare/cf.mjs` | A | 原样 |
| `site.conf` | `nginx/site.conf` | A | **先回灌服务器实际内容**（§4.1），再脱敏证书路径 |
| （从 `apply_stage_a.sh` L40-47 抽出） | `nginx/00-limits.conf` | 新增 | 现在埋在 heredoc 里，独立成文件才可评审 |
| （从 `apply_stage_a.sh` L17-28 抽出） | `host/99-hardening.conf` | 新增 | 同上 |
| `apply_stage_a.sh` | `host/apply_stage_a.sh` | A | 脱敏 L77 `ignoreip`；改为引用上面两个文件而非 heredoc |
| `security_probe.sh` | `host/security_probe.sh` | A | 原样（通用） |
| `abuse_test.sh`、`verify_limits.sh`、`measure_weight.sh` | `host/` 同名 | A | 原样 |
| `verify_stage_a.sh`、`probe.sh` | 内容进 README §8 验收命令；脚本留 `host/` 可选 | B | 把写死的构建哈希改成参数 |
| `enable_tls.sh`、`issue_cert.sh` | `host/tls/enable_tls.sh`、`host/tls/issue_cert.sh` | B | 只留占位符版；域名改 `${DOMAIN:?}` |
| `sg_probe.py` | `aliyun/sg_probe.py` | A | 脱敏 L16；AK 路径改为 env 变量 |
| `deploy.sh` | 内容进 README §8（3 行命令） | B | 不单独留文件 |
| `.gitignore`（新建） | `studynote-deploy/.gitignore` | 新增 | 见 §5.4 |
| `index.html`、`patch_cache.py`、`issue_cert.run.sh`、7 张截图、`site-dist.zip`、`site-dist.tar.gz`、`cfst/`（7 个）、`worker/.wrangler/tmp/` | — | C | 不进目标目录 |

### 5.3 保留文件清单（最终应存在于 `studynote-deploy/`）

**正文与记录（4 个文档）**
1. `README.md`（由 `静态站点全球加速方案总结.md` 脱敏 + 补章节而来）
2. `docs/02-安全基线.md`（`安全控制与访问控制方案.md` 原文）
3. `docs/archive/ESA接入可行性评估与部署记录.md`
4. `docs/archive/CF优选IP实测与接入方案.md`

**配置（3 个）**
5. `nginx/site.conf`（回灌后）
6. `nginx/00-limits.conf`（新抽）
7. `host/99-hardening.conf`（新抽）

**脚本与工具（10 个）**
8. `host/apply_stage_a.sh`
9. `host/security_probe.sh`
10. `host/verify_limits.sh`
11. `host/abuse_test.sh`
12. `host/measure_weight.sh`
13. `host/tls/enable_tls.sh`
14. `host/tls/issue_cert.sh`
15. `aliyun/sg_probe.py`
16. `cloudflare/cf.mjs`
17. `cloudflare/worker/index.js` + `cloudflare/worker/wrangler.toml`

即：**4 文档 + 3 配置 + 10 脚本/工具 ≈ 75 KB**（含新建的两个配置片段）。

### 5.4 需要新增的 .gitignore 规则

**(i) 过渡期：先给笔记仓库根加一条，防止误提交**（在 `esa-deploy/` 移出之前或之后都有效，防回归）

```gitignore
# 部署实验目录：含公网 IP、账号 ID、API token 与第三方二进制，一律不入库
esa-deploy/
```

**(ii) 新目录 `studynote-deploy/.gitignore`（无论选 a 还是 b 都该有）**

```gitignore
# 凭据
secrets/
*.ini
*credentials*
.env
.env.*

# 证书与私钥
*.key
*.crt
*.pem
letsencrypt/

# 第三方二进制与发行包
cfst/
*.exe
*.zip
*.tar.gz

# 构建产物与本地状态
site-dist.*
dist/
.wrangler/
wrangler.toml.bak
*.bak*

# 截图与临时文件
*.png
tmp/

# 含明文 token 的一次性执行记录（命名约定：*.run.sh 永不入库）
*.run.sh
```

第 (ii) 组里 `*.run.sh` 这条不是过度设计：本次泄漏的正是 `issue_cert.run.sh` 这种「把占位符换真值后另存一份」的习惯，用命名约定直接掐掉最省事。

### 5.5 迁移动作（本次未执行，仅列序）

1. `Move-Item esa-deploy C:\Users\ChosenEcho\Documents\studynote-deploy`（git 侧无感：39 个文件全部未被跟踪，`git ls-files esa-deploy` = 0）。
2. 在笔记仓库根 `.gitignore` 追加 `esa-deploy/`（防回归）。
3. 在新目录里按 §5.2 重排 → 删 C 类 20 个文件。
4. 回灌服务器实际 `site.conf` → 脱敏 → 覆盖 `nginx/site.conf`。
5. **先吊销 token、再改文档**（顺序不能反：文档改完但 token 未吊销，等于把泄漏点从文件挪到了脑子里）。
6. `git init` 新目录（可选），首次提交前跑一遍 `git status` 确认没有 `*.run.sh`、`*.key`、`cfst/`。

---

## 6. 脱敏清单

| 文件:行号 | 需要打码的字符串 | 建议替换值 | 风险等级 |
|---|---|---|---|
| `issue_cert.run.sh:5` | `TOKEN="cfut_…REDACTED"` | `TOKEN="${CF_API_TOKEN:?需要 CLOUDFLARE_API_TOKEN}"` | **高（已泄漏，须立即在 CF 后台 Roll/吊销）** |
| `worker/wrangler.toml:4` | `account_id = "d04b802998edb84eaa3d83a2feac85a3"` | `account_id = "${CF_ACCOUNT_ID}"` 或删掉改由 `CLOUDFLARE_ACCOUNT_ID` 注入 | 中（配 token 即可操作账号） |
| `worker/wrangler.toml:8` | `zone_name = "chosenecho.dpdns.org"` | `zone_name = "<ZONE>"` | 低 |
| `worker/index.js:13` | `const ORIGIN = "https://studynote-42b.pages.dev"` | `const ORIGIN = "https://<PAGES_PROJECT>.pages.dev"` | 低（暴露账号下的项目名） |
| `worker/index.js:14` | `ORIGIN_HOST = "studynote-42b.pages.dev"` | 同上 | 低 |
| `worker/index.js:5` | 注释里的 `chosenecho.dpdns.org/*` 与 `www.…` | `<ZONE>/*` | 低 |
| `worker/index.js:22` | `const allowed = ["studynote.chosenecho.dpdns.org"]` | `["<SUBDOMAIN>.<ZONE>"]` | 低 |
| `sg_probe.py:16` | `INSTANCE_ID = "i-2ze4tvkuf12y1pzgka8a"` | `INSTANCE_ID = os.environ.get("ECS_INSTANCE_ID", "i-xxxxxxxxxxxxxxxxx")` | **高（唯一一处把占位符写回真值的地方，与 ESA 文档 L3 的 `<实例ID>` 不一致）** |
| `sg_probe.py:22` | `p = os.path.expanduser("~/.workbench/config.json")` | 改为 `os.environ["WORKBENCH_PROFILE"]` 或 `<WORKBENCH_CONFIG_PATH>` | 中（暴露明文 AK 的存放位置与权限模型） |
| `apply_stage_a.sh:77` | `ignoreip = 127.0.0.1/8 ::1 49.74.78.…（出口 IP 已脱敏）` | `ignoreip = 127.0.0.1/8 ::1 <HOME_IP>` | 中（个人出口 IP，可与 CF 文档 L4 交叉定位到同一人） |
| `CF优选IP实测与接入方案.md:4` | `出口 IP 49.74.78.…（出口 IP 已脱敏）` | `<HOME_IP>` | 中（同上，且此处是「本机出口」自述） |
| `ESA接入可行性评估与部署记录.md:6` | `公网 IP：182.92.225.…（源站 IP 已脱敏）（EIP）` | `<ECS_EIP>` | 高（源站 IP 是这份文档里最该藏的值：ESA 的全部收益建立在源站 IP 不公开） |
| `ESA接入可行性评估与部署记录.md:52` | `http://182.92.225.…（源站 IP 已脱敏）/` | `http://<ECS_EIP>/` | 高 |
| `ESA接入可行性评估与部署记录.md:55` | `A 记录指向 182.92.225.…（源站 IP 已脱敏）` | `A 记录指向 <ECS_EIP>` | 高 |
| `ESA接入可行性评估与部署记录.md:84` | `http://182.92.225.…（源站 IP 已脱敏）/` → 200 | `http://<ECS_EIP>/` → 200 | 高 |
| `ESA接入可行性评估与部署记录.md:103` | `@ A 182.92.225.…（源站 IP 已脱敏）`、`www A 182.92.225.…（源站 IP 已脱敏）` | `@ A <ECS_EIP>` | 高 |
| `静态站点全球加速方案总结.md:132` | `await fetch("http://182.92.225.…（源站 IP 已脱敏）/")` | `await fetch("http://<ECS_EIP>/")` | 高 |
| `静态站点全球加速方案总结.md:209` | `origin.chosenecho.dpdns.org → 182.92.225.…（源站 IP 已脱敏）（回滚用，可保留）` | `origin.<ZONE> → <ECS_EIP>` | 高 |
| `静态站点全球加速方案总结.md:24、28-29、187-189、199-212` | 真实域名 `studynote.chosenecho.dpdns.org`、`chosenecho.dpdns.org`、`pw.chosenecho.dpdns.org → cfargotunnel.com` | `<SUBDOMAIN>.<ZONE>`、`<ZONE>`、`pw.<ZONE> → cfargotunnel.com`（可保留 CNAME 结构说明） | 中（`pw.` 那条还暴露了另一条无关业务的隧道存在） |
| `静态站点全球加速方案总结.md:210-211` | 优选 IP `172.64.149.209`、`104.18.37.182` | `<CF_EDGE_IP>`（这两个是 CF 节点 IP，本身非私有；但与外呼域名并列就成了「可直连的入口清单」） | 低 |
| `enable_tls.sh:4` | `DOMAIN="${1:-chosenecho.dpdns.org}"` | `DOMAIN="${1:?需要传入域名}"` | 低 |
| `issue_cert.sh:4`、`issue_cert.run.sh:4` | `DOMAIN="chosenecho.dpdns.org"` | `DOMAIN="${DOMAIN:?}"` | 低 |
| `site.conf:104-105` | `/etc/ssl/certs/site-temp.crt`、`/etc/ssl/private/site-temp.key` | 保留（路径非密钥本体），但需在注释里标注「替换为 `/etc/letsencrypt/live/<DOMAIN>/fullchain.pem`」 | 低 |
| `cfst/cfst_result.csv`（整表） | 1728 行 CF 边缘 IP + 地区码 | 整表丢弃即可；文档里只留分布统计与 5 个样本 IP | 低 |

补充三条判断口径：

- `ESA接入可行性评估与部署记录.md` 里 L3 的 `<实例ID>`、L7/L83 的 `<安全组ID>`、L75 的 `<站点根目录>` 已经是占位符，处理正确；**唯一漏网的是 `sg_probe.py:16` 的真实实例 ID**，两处必须统一口径。
- `静态站点全球加速方案总结.md:186` 的 `$env:CLOUDFLARE_API_TOKEN = "<token>"` 已是占位符，可作为全文的书写范例。
- 截图 7 张经目视核对：6 张是站点页面渲染图（1440×900 / 820 / 760 视口），无地址栏、无终端、无 IP；两张（`shot-after-harden.png` 与 `shot-cf-fastip.png`）字节完全相同。所以截图不构成泄漏点，直接丢即可。

---

## 7. 需要立刻处理的两件事（与整理动作解耦）

1. **吊销 `cfut_…REDACTED…` 这个 Cloudflare API Token。** 它以明文存在于 `issue_cert.run.sh:5`，而该文件的 SHA256 已进 `_整理/hashes.csv`；这个仓库有远端（`origin/main`）。文件删了不等于凭据安全——凭据一旦落过盘并进过工作区快照，就应当作已泄漏处理：去 Cloudflare 后台 Roll 掉，重新签一个同样最小权限（Zone:Read + DNS:Edit + Cache Purge，资源限定到具体 zone）的。
2. **确认 `~/.workbench/config.json` 里的 AccessKey 没有跟着这批文件一起扩散。** `sg_probe.py:22` 只读它、没有把它抄进仓库（这点做对了），但 `安全控制与访问控制方案.md` L16 已经把「AK 以明文存在本机配置里，权限覆盖 ECS 控制面」写成第一风险。既然这次要搬家，顺手把 workbench 切到 RamRoleArn 免长期密钥模式，比事后轮换更省事。

---

### 附：本报告的证据出处

- 目录状态与体积：`Get-ChildItem -Force -Recurse`（10:45 快照），39 文件 / 14,893,848 B。
- 逐文件作用：全文通读 19 个文本文件 + 4 个 bat/txt/csv 头部（`sg_probe.py` 174 行、`apply_stage_a.sh` 150 行、`site.conf` 148 行、新总结 277 行等）。
- zip 一致性：`System.IO.Compression.ZipFile` 逐条读流算 SHA-256 vs `Get-FileHash`，79/79 相同。
- tar 一致性：`tar -tzvf` 解析 79 个文件条目，体积和 3,725,727 B = dist 总和。
- 截图内容：`shot-after-harden.png`、`shot-pages.png`、`shot-studynote.png` 三张目视核对 + 7 张 SHA-256 去重。
- git 状态：`git status --short`、`git ls-files esa-deploy`（0）、`git check-ignore -v esa-deploy/site.conf`（非忽略）、`git log -1`。
