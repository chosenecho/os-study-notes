# 构建与部署

生产链路为 **浏览器 → ESA 基础版 → HTTPS → ECS Nginx → 静态文件**。唯一正式域名为 `studynote.chosenecho.top`，页面 canonical、Sitemap 和 robots.txt 均使用该域名。`chosenecho.top` 仅以 HTTP 301 跳转到对应的子域名地址，保留路径与查询参数，不提供内容镜像。ECS、域名和站点配置分别见 [ecs-site.json](../config/ecs-site.json)、[esa-site.json](../config/esa-site.json) 与 [mkdocs.yml](../mkdocs.yml)。生产不再使用 ESA Pages 上传，也不保留旧网址兼容路由。

## 本地准备

```sh
python -m pip install -r requirements.txt
npm ci
npx playwright install chromium
npx esa login
workbench version
```

复制 `.env.example` 为 `.env.local`，设置 `STUDY_ECS_INSTANCE_ID`。该本地文件已被 Git 忽略。Workbench 负责上传和执行 ECS 命令，须已配置目标实例的访问凭据。ESA CLI 只用于解析已有阿里云凭据及调用站点管理 API。源站公网 IP 只保存在云端回源记录及私有操作资料中。凭据、源站校验值和证书私钥不能提交到 Git。

## 内容权利

发布仅限已登记并通过核验的当前修订版。未登记、待核验或审阅后发生变化的内容都会阻止上传。发布命令不接受跳过权利检查的参数；普通构建和测试通过也不授予传播或再许可权限。许可范围见 [许可与版权](../LICENSING.md)。

## 发布过程

[ecs.mjs](../tools/deploy/ecs.mjs) 在权利检查后执行内容、修订、模型、严格构建、链接和浏览器检查，随后打包 `dist/`。构建直接读取 `docs/`，无旧目录转换层。

上传前确认远端归档和发布目录不存在。归档经 SHA-256 校验后解包到 `/var/www/studynote/releases/<release>/`，目录权限为 `755`，文件为 `644`。通过 `nginx -t` 后，原子切换 `current` 符号链接并重载 Nginx。激活失败时恢复原链接。源码提交、内容摘要、逐文件摘要、缓存刷新请求与激活结果保存在本地 `artifacts/releases/<release>/`。

激活后刷新正式域名和跳转域名的 ESA 缓存，读取 `studynote.chosenecho.top/__release.json` 确认发布编号。日常发布无需改变 DNS、证书或源站校验值。

## DNS 与回源

阿里云 DNS 保持 CNAME 接入：

| 主机记录 | 类型 | 目标 |
| --- | --- | --- |
| @ | CNAME | chosenecho.top.a1.initak.com |
| studynote | CNAME | studynote.chosenecho.top.a1.initak.com |

`_esaauth` 归属校验记录继续保留。ESA 的站点名称 `chosenecho.top` 是管理域标识，网站只使用 `studynote.chosenecho.top`。根域名的记录仅用于 HTTPS 跳转和证书验证。ESA 中两个加速记录的源地址均为目标 ECS 的公网 IP，业务类型为 `web`。旧 `os-study-notes` Pages 项目已解除生产域名绑定。

回源规则固定 HTTPS 与端口，分别发送对应域名的 Host 和 SNI，并开启 `OriginVerify`。服务器证书路径为 `/etc/letsencrypt/live/studynote/`；证书同时覆盖两个域名。模板见 [nginx-site.conf](../tools/deploy/nginx-site.conf)。

ESA 先删除客户端提供的 `X-Studynote-Origin`，再加入站点独有的随机校验值。Nginx 仅接受匹配值，拒绝其他源站请求；未知 Host 直接断开连接。映射文件为 `/etc/nginx/conf.d/10-studynote-auth.conf`，由 root 持有并设为 `600`。校验值只放在该服务器文件、ESA 请求头规则和本地受保护操作资料中。更换时须协调两端，不能只改一端。

此次 ESA `CreateOriginProtection` 返回 `FunctionArgError`，没有取得回源 IP 白名单，也没有开启该功能。当前源站访问校验依靠上述随机值，不应在控制台记录或交付说明中写成已启用 ESA IP 收敛。

## 证书续期

证书由 Certbot webroot 验证签发。验证目录为 `/var/lib/letsencrypt`，ESA 对 `/.well-known/acme-challenge/` 绕过缓存；Nginx 在两个域名的 HTTPS 站点提供该目录。`certbot.timer` 负责续期，续期钩子执行 `nginx -t` 后重载 Nginx。服务器无需保存 DNS 管理密钥。

```sh
certbot renew --cert-name studynote --dry-run --no-random-sleep-on-renew
systemctl status certbot.timer
```

不得将验证目录改为站点发布目录，否则切换发布可能使验证文件丢失。证书续期或重载失败时检查 `/var/log/letsencrypt/letsencrypt.log` 和 `journalctl -u certbot.service`。

## 缓存与安全

缓存值由 [nginx-http.conf](../tools/deploy/nginx-http.conf) 的映射定义：普通页面和未指纹化脚本短缓存，Material 指纹资源长期不可变缓存，图标、第三方静态库与课程插图按日缓存。错误响应使用 `no-store`。ESA 跟随源站缓存策略，静态内容的缓存键忽略查询参数，POST 不缓存，ACME 与发布信息绕过缓存。退役的边缘响应头缓存规则已删除，避免把源站错误页改成长缓存。

HTTPS、CSP、防嵌入、防 MIME 嗅探、HSTS、权限与来源策略由命名规则维护；压缩和原有 TLS 安全设置继续保留。已关闭 ESA 质量数据采集，避免向 HTML 注入外部 RUM 脚本。预览与同步：

```sh
npm run esa:configure
npm run esa:configure -- --apply
```

脚本核对站点名称、状态与基础版实例，只同步受管理的响应头、缓存、HTTPS、回源及质量采集配置，并读取配置复核。请求头中的校验值单独保管，不在该配置文件中。

WAF 保留扫描路径拦截；防盗链同时覆盖 `/assets/` 和课程 `figures/`，允许本站来源与无 Referer 请求。原速率规则仍为观察模式，不能视作已执行的流量或费用上限。套餐外用量需另行观察账单，不应把缓存或 WAF 当成费用硬上限。

## 回退与排查

回退仅切换到已校验的 ECS 发布目录，执行 `nginx -t`、重载，并刷新两个域名的 ESA 缓存。不要重新绑定旧 Pages 项目。服务器保留私有历史发布目录，发布脚本不自动删除历史版本；含旧材料的版本不得重新上线。清理前须核对 `current` 和需要保留的版本。

源站日志为 `/var/log/nginx/studynote.access.log` 与 `studynote.error.log`。访问日志不记录源站校验头或查询参数值。线上排查同时核对 `/__release.json`、ESA 缓存状态、HTTP 状态和资源 MIME；不存在的页面须返回 HTTP 404，模块脚本须返回 JavaScript 类型。

当前仓库发布入口只使用 ECS，不再提供 Pages 发布命令。本轮曾在新建的 studynote Pages 项目上传测试及生产版本，但该项目没有绑定正式域名；默认调试地址实测需要访问验证。旧 os-study-notes 项目同样没有正式域名绑定。云端历史版本的保留与清理须单独核查。

官方接口参考：[HTTPS 回源](https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/back-to-source-protocols-and-ports)、[回源规则 API](https://help.aliyun.com/zh/edge-security-acceleration/esa/api-esa-2024-09-10-createoriginrule)、[缓存规则 API](https://help.aliyun.com/zh/edge-security-acceleration/esa/api-esa-2024-09-10-createcacherule)。本仓库实际配置值以配置文件和线上读取结果为准。
