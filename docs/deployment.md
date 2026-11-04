# 构建与部署

生产站点为 https://chosenecho.top/，使用阿里云 ESA Functions & Pages 项目 `os-study-notes`。MkDocs 在本地构建，ESA CLI 直接上传 `dist/`；GitHub Actions 负责校验，不自动发布。

## 本地准备

~~~sh
python -m pip install -r requirements.txt
npm ci
npx playwright install chromium
npx esa login
~~~

ESA CLI 的版本由 package-lock.json 锁定。凭据存放在用户目录的 ESA CLI 配置中，或由 CLI 支持的阿里云凭据环境变量提供，不写入仓库。

## 构建与发布

~~~sh
npm run build
npm run deploy:staging
npm run deploy
~~~

`build` 严格构建站点，产物为 `dist/`，中间目录为 `website/.generated/`。`deploy:staging` 先运行内容、模型、构建和链接检查，再发布到 ESA 测试环境。`deploy` 还会运行浏览器交互检查，通过后发布到生产环境。

`esa.jsonc` 指定已有项目名与 `assets.directory`；`assets.notFoundStrategy` 为 `404Page`，不存在的页面应返回错误页和 HTTP 404。CLI 不执行配置文件中的构建命令，因此发布入口明确先构建、检查，再上传。

`mkdocs.yml` 的 `SITE_URL` 默认值为 `https://chosenecho.top/`，用于 canonical、Open Graph 和 sitemap。`website/src/robots.txt` 的 Sitemap 地址与生产域名一致。若变更域名，需同时维护这两个入口。

## 域名与 HTTPS

`chosenecho.top` 使用已购买的 ESA 基础版（`basic`）套餐，通过 CNAME 接入并保留现有 DNS 服务器。阿里云 DNS 中的记录：

| 主机记录 | 类型 | 目标 |
| --- | --- | --- |
| @ | CNAME | chosenecho.top.a1.initak.com |
| _esaauth | TXT | ESA 站点详情中的归属校验码 |

ESA 中该域名绑定 `os-study-notes`。证书使用 ESA 托管的 Let's Encrypt 免费证书，强制 HTTPS 由站点规则控制。域名绑定和 DNS 属于首次接入操作，日常发布无需重复执行。

~~~sh
npx esa domain list --skip-update-check
npx esa deployments list --skip-update-check
~~~

## 站点规则

`esa/site.json` 保存站点 ID、域名和受管理的命名规则。预览或同步配置：

~~~sh
npm run esa:configure
npm run esa:configure -- --apply
~~~

脚本核对站点名称、激活状态和基础版套餐实例，只创建或更新本文件中列出的规则，并读取远端配置复核。已存在且相同的规则保持不变，不删除其他规则。首次迁移时执行过配置同步，日常内容发布无需重复执行。

响应头规则包含 CSP、防 MIME 嗅探、防嵌入、来源策略和权限策略。缓存规则分别覆盖内容与未指纹化的脚本、Material 指纹资源、插图和 KaTeX 资源；强制 HTTPS 使用永久跳转。规则具体值见 `esa/site.json`，配置后应以生产响应头实测为准。

响应头使用 `add` 操作创建；`modify` 只修改已有响应头。原 Cloudflare Pages 的 `_headers` 文件已退役，ESA 使用上述站点规则。

官方参考：[Pages 构建和路由指南](https://help.aliyun.com/zh/edge-security-acceleration/esa/build-pages)、[ESA CLI](https://github.com/aliyun/alibabacloud-esa-cli)、[响应头配置 API](https://help.aliyun.com/zh/edge-security-acceleration/esa/api-esa-2024-09-10-createhttpresponseheadermodificationrule)。

## 回退

先用 `npx esa deployments list --skip-update-check` 获取历史版本，再执行 `npx esa deploy --version <版本号> --environment production --no-preview --skip-update-check`。回退旧代码不会自动回退 DNS、证书或站点规则；涉及这些配置时，应先检查对应的发布记录。

历史 Cloudflare 发布保留在 [仓库结构翻新记录](history/releases/2026-11-04-structure.md)，仅用于追溯。
