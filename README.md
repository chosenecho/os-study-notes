# 课程学习笔记

操作系统概论、计算机组成原理的章节笔记与交互练习，使用 MkDocs Material 发布为文档站。

站点地址：https://chosenecho.top/，托管于阿里云 ESA Functions & Pages。

- [操作系统概论](content/courses/operating-systems/README.md)
- [计算机组成原理](content/courses/computer-organization/README.md)
- [易错点清单](content/reference/pitfalls.md) · [术语与缩写表](content/reference/glossary.md)

## 开始使用

需要 Python 3.10+；开发与测试使用 Node.js 22+。在仓库根目录执行：

~~~sh
python -m pip install -r requirements.txt
npm ci
npm run dev
~~~

打开 http://127.0.0.1:8000/。只构建站点时无需 Node.js：

~~~sh
python -m mkdocs build --strict
~~~

发布产物写入 dist/。

## 仓库结构

~~~text
content/                 课程笔记与共用速查
  courses/
    operating-systems/   操作系统概论
    computer-organization/ 计算机组成原理
  reference/             易错点、术语表
website/                 站点实现
  courses.json           课程注册信息
  hooks.py               内容转换与产物处理
  src/                   手写页面、样式、交互与第三方资源
  overrides/             Material 模板覆盖
  .generated/            构建中间文件，自动重建
scripts/                 内容、结构与站内链接检查
tests/                   单元测试与浏览器测试
docs/                    开发、部署、第三方资源说明与历史记录
local/                   本地教材、真题与旧科目归档，不提交
artifacts/               测试报告与截图，不提交
dist/                    发布产物，不提交
mkdocs.yml               站点配置
requirements.txt         Python 依赖
package.json             开发命令与测试依赖
esa.jsonc                ESA 项目与静态资源路由配置
esa/site.json            域名、响应头、缓存与 HTTPS 规则
~~~

## 检查

~~~sh
npm run check
npx playwright install chromium
npm run test:browser
~~~

check 依次检查目录与源码链接、笔记结构、修订项、构建逻辑、练习模型、严格构建和产物链接。浏览器测试自行启动本地服务器，验证练习操作、题库解析、错题重练、键盘操作和不同屏幕宽度。CI 执行同一套命令。

## 维护

- [开发与内容约定](docs/development.md)：修改笔记、添加课程、运行检查。
- [构建与部署](docs/deployment.md)：产物目录、域名设置与发布命令。
- [KaTeX 资源](docs/vendor/katex.md)：第三方文件及更新方式。
- [历史审计记录](docs/history/qa/README.md)：原审计轮次与报告。

课程文件统一命名为 chapter-01.md 等，中文章名保留在正文标题与课程目录中。源码只维护在 content/ 和 website/；生成目录每次构建重建。教材、扫描件放 local/materials/，旧科目资料放 local/archive/。
