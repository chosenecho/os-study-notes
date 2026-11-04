# Material 官方风格迁移计划

日期：2026-11-04。状态：待实施，本次完成现状核对、参考站源码调研与方案。

## 采用方案

以 [Material 官方 Getting started 页面][material-docs] 为视觉基准，直接采用主题的布局、配色、导航、搜索和内容组件。课程分组参考 CS 自学指南与 OI Wiki，图解阅读参考 Hello 算法。

用户约束：**狠狠借鉴，少写自定义代码。** 优先级为：主题已有功能 → 上游现成配置或实现 → 本项目必要适配。采用单一主题，不混搭不同站点的视觉样式。

## 项目现状

- [mkdocs.yml](../../mkdocs.yml) 已配置 `theme.name: material`；[requirements.txt](../../requirements.txt) 锁定 `mkdocs-material==9.7.7`。本次主要是回归官方主题风格。
- [notes.css](../../website/src/assets/notes.css) 覆盖了主题页眉、搜索框、标题、正文宽度、目录和表格；这些覆盖是优先删减对象。
- [hooks.py](../../website/hooks.py) 承担课程生成、答案折叠、章节导航、CSS 内联、公式资源注入和搜索产物处理，不能整体删除。
- [前端交互][local-interactions]、练习模块与本地 KaTeX 提供复习进度、字号、图像放大、计算练习和自测，先保留功能，再减少重复实现。
- 当前工作区已有结构调整与部署相关改动；实施从当前工作区继续，先保存基线，不重置到旧版本。

## 已查阅的上游源码

链接固定到调研时的提交，实施前重新核对所需功能与本地锁定版本的兼容性。

| 参考 | 已查源码 | 采用内容 |
| --- | --- | --- |
| Material 官方站 | [配置][material-config]、[模板][material-main]、[样式][material-style] | 主视觉、导航、原生组件 |
| CS 自学指南 | [配置][cs-config] | 课程分组、配置优先 |
| OI Wiki | [配置][oi-config]、[样式][oi-style] | 顶部主题分类、章节树 |
| Hello 算法 | [配置][hello-config]、[模板][hello-main]、[样式][hello-style] | 课程阅读、图文与练习衔接 |

源码核对结果：官方配置已包含 `navigation.tabs`、`navigation.indexes`、`navigation.footer`、搜索与目录功能。CS 自学指南的配置没有额外挂载 `extra_css`。OI Wiki 使用自带主题目录；Hello 算法有较多自定义样式和首页动画。后两者参考内容组织，避免引入整套定制依赖。官方站的品牌公告、社交入口与产品首页模板也不移植。

下载的源码快照与来源清单位于本地忽略目录 `artifacts/research/2026-11-04-material/`，不进入站点发布产物。摘取代码时保留相应上游许可与来源说明。

## 实施顺序

### 先做原生主题样板

选首页、操作系统第 3 章、计算机组成原理第 2 章、一个交互练习页作对照，记录现有路径、锚点和交互结果。

修改 [mkdocs.yml](../../mkdocs.yml)：

- 从官方配置摘取 `navigation.tabs`、`navigation.indexes`、`navigation.footer`，保留现有 `navigation.sections`、`navigation.top`、`toc.follow`、搜索与代码复制。
- 配色直接采用官方的浅色 `default + indigo`、深色 `slate + black`，强调色采用 `indigo`，移除自定义 `primary: custom`。
- 保持中文界面、中英文搜索和本地资源；保留 `font: false`，适配现有资源策略，不引入在线字体。
- 顶部入口沿用：首页、操作系统概论、计算机组成原理、复习速查、交互练习。课程内使用主题原生左侧导航，右侧保留原生页内目录。

先关闭上述样板中的全局外观覆盖，直接看主题默认效果。只有实际出现的中文排版或功能问题才补局部规则。

### 删减 CSS，采用原生组件

集中处理 [notes.css](../../website/src/assets/notes.css)：

- 删除页眉、搜索、标题、页面网格、正文宽度及侧栏的重复外观覆盖，恢复主题默认值。
- 首页沿用 Material `grid cards`，按钮改用 `md-button`，提示与折叠答案使用现有 Markdown 扩展及主题样式。
- 复习工具栏和练习控件引用主题颜色变量；保留必要的进度状态、实验可视化、图像放大、打印和无障碍规则。
- 既有表格、公式和目录补丁逐项对照验证；已由主题解决的删除，仍可复现的问题保留最小修复。

不另建配色系统、字体系统、页面框架或动画首页；不修改主题包内文件。

### 补齐课程入口，减少重复导航

- [website/src/index.md](../../website/src/index.md) 保留课程卡片、继续复习和练习入口，完整章节表交给课程目录页。
- 复用 `content/courses/*/README.md` 生成课程目录页，在现有输出目录增加 `index.md`，配合 `navigation.indexes`，不再维护一份重复的课程介绍。
- 在 [hooks.py](../../website/hooks.py) 中核对生成路径与相对链接；原有章节路径、标题、锚点和课程间链接保持兼容。
- 检查原生页脚的上一页、下一页及跨课程顺序，确认可替代后删除 `chapter_nav()` 的重复输出。
- 保留 [main.html](../../website/overrides/main.html) 中的存储容错和分享元数据。
- 保留 [404.html](../../website/overrides/404.html) 的错误页语义，仅作必要适配。

### 保留交互，验证后才删除补丁

- 保留现有复习记录键 `os-notes:completed:v1`、字号键 `os-notes:font-size:v1`，避免丢失已有浏览器数据。
- 继续复用现有调度、计算练习与题库模块，不重写算法。
- 首轮不启用 `navigation.instant`。现有脚本包含一次性初始化，直接开启可能使跨页后的公式、进度或实验失效；需要时再按官方生命周期统一适配并验证。
- CSS 拆分或删除时，同步调整 `on_post_build()` 的内联处理与构建测试，避免构建仍读取已移除文件。

## 验收与发布

- 执行现有 `npm run check` 与 `npm run test:browser`，保留内容、修订保护、模型、严格构建和链接检查。
- 在现有浏览器检查中补齐原生导航、课程目录、中文搜索、主题切换、进度与字号持久化、公式、图片、答案折叠和键盘操作。
- 检查桌面、平板和窄屏下的正文、长目录、宽表格及练习控件；与官方站对照，优先通过配置修正差异。
- 使用现有 ESA staging 流程预览，验证路径、404、响应头及本地资源加载后，再按 [部署文档](../deployment.md) 发布；保留上一部署版本用于回退。
- 交付时列出删除的主题覆盖、保留的必要适配及上游来源，不新增一套通用组件库。

## 引擎的后续安排

截至 2026-11-04，官方[仓库说明][material-readme]与安装页宣布：Material for MkDocs 于 **2027-05-05** 结束支持，此前继续提供关键修复和安全更新。

官方后继项目为 Zensical，其 `classic` 变体用于保留 Material 外观。

[Zensical 迁移文档](https://zensical.org/docs/compatibility/mkdocs/migration/) 当前将 `hooks` 列为不支持的配置。本项目依赖该入口生成课程与处理产物，不能直接替换构建命令。

本轮先沿用锁定的 Material，完成官方风格回归。后续在结束支持日期前单独评估 Zensical：优先复用现有生成函数、将构建前后处理改为显式命令，再检查模板、Markdown 扩展、搜索和产物一致性。实施时重新核对官方兼容性说明。

[material-docs]: https://squidfunk.github.io/mkdocs-material/getting-started/
[local-interactions]: ../../website/src/assets/interactions.js
[material-config]: https://github.com/squidfunk/mkdocs-material/blob/7590e14da9fcab7c81bb2496a4c3389f0901988e/mkdocs.yml
[material-main]: https://github.com/squidfunk/mkdocs-material/blob/7590e14da9fcab7c81bb2496a4c3389f0901988e/src/overrides/main.html
[material-style]: https://github.com/squidfunk/mkdocs-material/blob/7590e14da9fcab7c81bb2496a4c3389f0901988e/src/overrides/assets/stylesheets/custom.scss
[cs-config]: https://github.com/PKUFlyingPig/cs-self-learning/blob/2c591834a1e4101e2e7579dc7f49bdeb4a6153a2/mkdocs.yml
[oi-config]: https://github.com/OI-wiki/OI-wiki/blob/2454a13c56a1ae215da54e3c301843040a4825d8/mkdocs.yml
[oi-style]: https://github.com/OI-wiki/OI-wiki/blob/2454a13c56a1ae215da54e3c301843040a4825d8/docs/_static/css/extra.css
[hello-config]: https://github.com/krahets/hello-algo/blob/24b3eed029cbbd86604d9c3327f61df6f1ab74fc/mkdocs.yml
[hello-main]: https://github.com/krahets/hello-algo/blob/24b3eed029cbbd86604d9c3327f61df6f1ab74fc/overrides/main.html
[hello-style]: https://github.com/krahets/hello-algo/blob/24b3eed029cbbd86604d9c3327f61df6f1ab74fc/overrides/stylesheets/extra.css
[material-readme]: https://github.com/squidfunk/mkdocs-material/blob/7590e14da9fcab7c81bb2496a4c3389f0901988e/README.md
