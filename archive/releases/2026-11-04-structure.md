# 仓库结构翻新上线记录

2026-11-04（UTC+8），将结构翻新后的本地构建发布到现有 Cloudflare Pages 项目 studynote，生产分支为 main。

- 生产站点：https://studynote.chosenecho.dpdns.org/
- 本次部署：https://c34cfec9.studynote-42b.pages.dev/
- 上一生产部署：https://8c34d090.studynote-42b.pages.dev/

## 发布内容

课程笔记、站点实现、检查脚本、测试和维护文档分别迁入 content/、website/、scripts/、tests/、docs/。构建配置与依赖入口移至根目录，发布产物统一写入 dist/。课程注册信息集中在 website/courses.json；调度页面与测试共用 scheduling.mjs。

## 发布命令与结果

在仓库根目录执行：

~~~sh
wrangler pages deploy dist --project-name=studynote --branch=main --commit-dirty=true
~~~

Wrangler 返回 Deployment complete；上传 27 个变化文件，复用 56 个已有文件，并应用 _headers。按本地工作区直接发布，Git 未提交、未推送；Worker、DNS 和凭据未修改。

## 核验结果

| 检查 | 结果 |
| --- | --- |
| 发布前完整检查 | 目录与源码链接、12 章笔记、46 条修订保护项、构建测试、调度测试及 131973 个练习模型案例通过 |
| 严格构建与站内链接 | 24 个 HTML、1890 条链接、15 张课程插图；断链、坏锚点和坏插图均为 0 |
| 发布前本地浏览器 | 13 组交互检查通过，无页面脚本异常 |
| 生产域名文件比对 | 83 个公开构建文件返回预期状态，内容与本地构建一致 |
| 独立部署地址 | 23 个内容页返回 HTTP 200，SHA-256 与本地构建一致 |
| 不存在的页面 | 生产域名与独立部署地址各检查一处，均返回 HTTP 404，错误页内容正确 |
| 生产浏览器 | 13 组检查通过，涵盖进度保存、三种调度算法、计算练习、24 题自测与错题重练、键盘及 320/390/1280 px 布局；无页面脚本异常 |

HTTP 内容核验共 108 项，完成时间为 2026-11-04T02:03:09+08:00。生产 HTML 仅移除 Cloudflare 注入的统计脚本，robots.txt 仅移除 Cloudflare Managed Content 前缀后比较 SHA-256；保留原始摘要和转换记录，其余字节不作宽松处理。

发布日志、逐文件 HTTP 摘要、浏览器检查 JSON 和 13 张截图保存在本机忽略目录 artifacts/deploy/2026-11-04-structure/。
