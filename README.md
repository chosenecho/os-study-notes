# studynote

操作系统概论、计算机组成原理的章节笔记与交互练习，使用 MkDocs Material 发布。

网站：https://chosenecho.top/ · 仓库：https://github.com/chosenecho/studynote

**版权核验中：**教材原题、附录答案和插图未取得或尚未核验公开传播与再许可授权，相关文件不在项目开放许可范围内。发布命令会停止上传；已有公开副本和历史记录仍需单独处理。

- [操作系统概论](docs/courses/operating-systems/index.md)
- [计算机组成原理](docs/courses/computer-organization/index.md)
- [易错点](docs/reference/pitfalls.md) · [术语表](docs/reference/glossary.md)

## 本地运行

需要 Python 3.10+；开发与测试使用 Node.js 22+。在仓库根目录执行：

```sh
python -m pip install -r requirements.txt
npm ci
npm run dev
```

打开 http://127.0.0.1:8000/。仅构建站点可直接执行 `python -m mkdocs build --strict`，产物写入 `dist/`。

## 目录

```text
docs/                    MkDocs 直接读取的站点源文件
  courses/               课程 index.md、chapter-NN.md 与随文 figures/
  reference/             易错点与术语表
  labs/                  交互练习页面
  assets/
    javascripts/         阅读交互与 labs/ 实验模块
    stylesheets/         阅读与实验样式
    images/              站点图标
    vendor/              保留原发行文件的 KaTeX
config/                  课程注册、内容权利清单、ESA 域名规则
theme/                   Material 模板覆盖
tools/
  mkdocs/                内容处理、许可分发与产物处理钩子
  checks/                结构、笔记、修订、权利与链接检查
  deploy/                ESA 配置同步工具
tests/                   单元测试与浏览器测试
handbook/                开发、部署与第三方资源维护说明
archive/                 历史审计、发布记录与方案
LICENSES/                第三方声明、许可原文与对应源码
```

首页为 `docs/index.md`，课程入口为各课程的 `index.md`。源码文件名与网址一致，例如 `docs/courses/operating-systems/chapter-01.md` 对应 `/courses/operating-systems/chapter-01/`。构建直接处理源页面，许可下载通过 MkDocs 虚拟文件提供。

根目录保留 `mkdocs.yml`、`esa.jsonc`、依赖清单与许可入口。`local/` 用于私有教材和独立归档，`artifacts/` 用于报告与截图；它们和 `dist/` 均不提交。

## 检查与维护

```sh
npm run check
npx playwright install chromium
npm run test:browser
```

CI 执行同一套检查。公开发布另须通过 `npm run check:rights`，核验记录位于 [config/content-rights.json](config/content-rights.json)。普通构建和测试不会授予内容传播权限。

- [开发约定](handbook/development.md)
- [构建与部署](handbook/deployment.md)
- [KaTeX 维护](handbook/vendor/katex.md)
- [许可与版权](LICENSING.md)：代码采用 Apache-2.0，已核验的原创学习文字采用 CC BY 4.0；待核验材料与第三方资源另行处理。
- [第三方资源说明](THIRD_PARTY_NOTICES.md)
- [历史审计](archive/qa/README.md)
