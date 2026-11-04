# 开发与内容约定

## 源文件与构建

MkDocs 直接读取 `docs/`。课程位于 `docs/courses/<slug>/`，入口为 `index.md`，章节为 `chapter-NN.md`；共用速查位于 `docs/reference/`，交互练习页面位于 `docs/labs/`。Markdown 使用相对路径，课程插图放在本课程的 `figures/` 中。

`config/courses.json` 注册课程的 `id`、`slug`、`title` 和 `chapters`。源码路径直接决定网址；复习记录标识统一为 `<id>-<章号>`。

构建由 `mkdocs.yml` 注册的原生钩子处理：

- `tools/mkdocs/content.py`：通过 `on_page_markdown` 添加复习工具栏、进度标记、折叠答案和图片尺寸。课程入口的“资料与核对规则”“资料依据与使用边界”“原有笔记处理”章节仅保留在源码中。
- `tools/mkdocs/licenses.py`：通过 `on_files` 将根目录许可说明、`LICENSE`、`NOTICE`、`LICENSES/` 和权利清单作为虚拟文件提供给站点。
- `tools/mkdocs/assets.py`：处理构建产物，内联阅读样式、按公式标记注入 KaTeX，清理未使用的搜索语言包与 source map。

钩子不写入 `docs/`。课程之间的链接保留原生 Markdown 路径，不再另设输出目录或改写章节文件名。

## 前端与主题

`docs/assets/javascripts/reader.mjs` 负责复习记录、字号、图片预览、搜索和无障碍适配。`labs/loader.mjs` 按页面加载实验；调度页面使用 `labs/scheduler.mjs`，其模型为 `labs/scheduling.mjs`。其他实验与题库分别使用 `labs/labs.mjs`、`labs/labs-core.mjs` 和 `labs/quiz-bank.mjs`。单元测试直接导入页面使用的模型。

阅读和实验样式位于 `docs/assets/stylesheets/`；KaTeX 原发行文件位于 `docs/assets/vendor/katex/`，保留其 LICENSE。模板覆盖位于 `theme/`。

页面采用 Material 原生导航、课程索引、页脚、配色、卡片、按钮和折叠组件。新增页面先使用 `mkdocs.yml` 和 Markdown 扩展，样式仅补充阅读、实验、打印与无障碍需求。

Material 9.7.7 的搜索分享会先保存旧链接再更新链接。`initSearchShareCopy()` 在点击捕获阶段同步复制属性，仍由上游 ClipboardJS 执行复制。主题升级后重新检查，确认上游修复后移除此适配。

## 修改与添加课程

1. 修改对应章节，保留首行标题、大纲依据、复习导航与教材习题结构；插图使用本课程的相对路径。
2. 新课程在 `config/courses.json` 注册，并添加 `index.md` 和连续编号的 `chapter-NN.md`。
3. 更新 `mkdocs.yml` 导航、`docs/index.md` 课程卡片及 `reader.mjs` 的课程进度配置；需要自测时补充题库。
4. 调整 `tools/checks/notes.py` 与 `tools/checks/revisions.py` 的检查范围，补充相应测试。
5. 完成内容权利核验记录后运行检查；涉及交互时运行浏览器测试。

## 内容权利

许可范围见 [LICENSING.md](../LICENSING.md)。新增或修改学习文字、插图后，在 `config/content-rights.json` 记录来源、核验结论和依据。只有确认具备相应授权后才设为 `cleared`，填写许可、核验日期和文件 SHA-256；Markdown、SVG 和 TXT 先统一为 LF 换行。正文变化后须重新核验，不能只更新摘要。不能确认的材料保持 `pending`，或从发布内容中移除。

第三方许可、署名与 MPL 搜索语言包对应源码随站点分发。更新依赖时，重新核对实际分发文件，并更新 [第三方资源说明](../THIRD_PARTY_NOTICES.md)。

## 检查入口

| 命令 | 范围 |
| --- | --- |
| `npm run check:structure` | 课程注册、文件编号、源码链接与目录边界 |
| `npm run check:notes` | 笔记结构、图片引用与行文规则 |
| `npm run check:revisions` | 已核对技术修订 |
| `npm run test:unit` | 原生构建钩子、许可分发、权利检查与练习模型 |
| `npm run build` | MkDocs 严格构建 |
| `npm run check:links` | 产物链接、锚点与图片 |
| `npm run test:browser` | 主题、搜索、阅读控制、实验、打印与窄屏 |
| `npm run check:rights` | 发布内容的核验记录、摘要与未登记文件 |

`npm run check` 依次执行结构、笔记、修订、单元测试、构建与产物链接检查。发布命令另在上传前强制执行权利检查。

Playwright 为仓库锁定的开发依赖。浏览器证据默认写入 `artifacts/browser/labs/`；`STUDY_BASE_URL` 和 `STUDY_OUTPUT_DIR` 可指定站点与证据目录。

## 历史与私有材料

`archive/` 保留历史报告、脚本和方案，记录中的旧路径与当时测量值保留原貌。当前检查统一从 `package.json` 启动。

`local/` 整体忽略提交，其中的独立 Git 仓库保留内部结构。构建不读取私有教材、扫描件或历史审计记录。
