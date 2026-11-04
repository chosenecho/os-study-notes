# 开发与内容约定

## 内容与站点边界

课程正文放 content/courses/，共用速查放 content/reference/。每门课包含 README.md、chapter-NN.md，可在 figures/ 放课程自有 SVG。Markdown 中使用相对路径；图片必须指向本课程内的 SVG 文件。

website/src/ 保存首页、练习页与前端资源；website/overrides/ 保存主题模板。KaTeX 在 website/src/assets/katex/，保留原发行文件与 LICENSE。

website/hooks.py 在构建前清理 website/.generated/，复制手写站点页面，再根据 website/courses.json 生成章节与速查页。它添加复习工具栏、折叠答案和章节导航，并改写课程链接。构建后按公式标记注入 KaTeX、内联阅读样式并裁剪未使用的主题资源。

调度算法统一由 website/src/assets/scheduling.mjs 导出，页面与单元测试直接导入同一份模型。其他练习模型与题库分别在 labs-core.mjs、quiz-bank.mjs。

## 修改课程

1. 修改对应章节，保留首行标题、大纲依据、复习导航与教材习题结构。
2. 图片放入课程 figures/，使用相对路径引用。
3. 运行 npm run check；涉及交互时再运行 npm run test:browser。

生成目录只保留受版本控制的空文件 .gitkeep；这是 MkDocs 在执行构建钩子前检查 docs_dir 所需的目录占位文件。

## 添加课程

1. 新建 content/courses/课程标识/，添加 README.md 和连续编号的 chapter-NN.md。
2. 在 website/courses.json 注册 id、slug、title、chapters、output、progress_prefix。构建器会复用章节生成与 SVG 复制流程。
3. 更新 mkdocs.yml 的导航、website/src/index.md 的课程卡片与章节入口。
4. 更新 website/src/assets/interactions.js 的课程进度配置。
5. 调整 scripts/check-notes.py 的内容检查范围；需要自测时补充 quiz-bank.mjs 与相应测试。

课程注册表管理构建元数据；首页与进度交互仍需显式维护。

## 检查入口

| 命令 | 检查范围 |
| --- | --- |
| npm run check:structure | 课程注册、文件编号、源码链接、退役目录 |
| npm run check:notes | 章节结构、图片引用与行文规则 |
| npm run check:revisions | 已核对技术修订的保护项 |
| npm run test:unit | 构建生命周期与练习模型 |
| npm run build | MkDocs 严格构建 |
| npm run check:links | 产物链接、锚点与图片 |
| npm run test:browser | 页面练习、题库、键盘与窄屏 |

Playwright 是仓库内锁定的开发依赖，不再依赖用户目录中的全局安装。浏览器测试的报告与截图写入 artifacts/browser/labs/；STUDY_BASE_URL 可指定被测站点，STUDY_OUTPUT_DIR 可指定证据目录。

## 历史资料

docs/history/qa/ 保留原审计报告、轮次记录和退役脚本，供追溯；记录中的旧路径与当时测量值保留原貌。当前检查统一从 package.json 启动。历史脚本不作为当前检查入口。

local/ 整体忽略提交；其中可能存在独立 Git 仓库，归档时保留其内部结构。构建不读取教材、扫描件或历史审计记录。
