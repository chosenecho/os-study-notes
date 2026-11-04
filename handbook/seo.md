# 搜索与 AI 引用维护

## 构建检查

`npm run check` 在严格构建、内容和链接检查后执行 SEO 检查。单独复查已有产物：

```sh
npm run check:seo
npm run test:browser
```

[SEO 检查器](../tools/checks/seo.py)从 Sitemap 读取页面清单。它逐页检查标题、摘要、自指 canonical、noindex、分享元数据和结构化数据，并查找未进入 Sitemap 的 HTML。重复标题阻止通过；重复摘要先报告供编辑判断。结果写入忽略目录 `artifacts/seo/check.json`。它检查静态产物，不能判断搜索引擎是否已抓取或收录。

[浏览器检查](../tests/browser/seo-checks.mjs)复核渲染后的 JSON-LD、可见面包屑、预览站点内链、错误页与压缩 Sitemap。另在关闭 JavaScript 后读取算例。常规浏览器回归继续覆盖主题、搜索、公式、进度、练习、键盘和窄屏阅读。

## 新增课程与页面

- [课程注册表](../config/courses.json)维护课程名称和目录。首页摘要从注册表生成，课程入口使用课程专属标题；导航短标签保持“课程概览”。
- [内容钩子](../tools/mkdocs/content.py)生成课程和章节的元数据；[许可钩子](../tools/mkdocs/licenses.py)维护虚拟许可页面摘要。其他页面在 Markdown front matter 中写与正文对应的 `description`，必要时写 `title`，不自行附加站点名。
- [SEO 钩子](../tools/mkdocs/seo.py)生成与可见导航一致的层级。新增页面类型时同时核对父级 URL；没有实际入口页的分类不虚构链接。
- 首页输出 `WebSite`，其余正常页面输出 `BreadcrumbList`；[主题](../theme/main.html)用 `tojson` 序列化，避免手工拼接 JSON。标记不承诺富媒体结果或 AI 引用。
- [Sitemap 模板](../theme/sitemap.xml)省略 `lastmod`。当前 MkDocs 的 `Page.update_date` 来自构建日期，并非编辑修订日期；只有引入可维护、可核验的实质修订记录后才能恢复它。
- 学习内容仍执行[内容规则](content-policy.md)：独立讲解、自编数据和解析，先核对再更新对应文件的权利记录。现有六个静态算例由[模型一致性测试](../tests/unit/lab-examples.test.mjs)核验。

## 性能复测

```sh
npm run build
npm run measure:performance
```

也可指定一份未修改的旧构建目录和报告位置：

```sh
node tests/browser/performance.mjs artifacts/old-build artifacts/seo/performance-before.json
```

[测量脚本](../tests/browser/performance.mjs)抽取首页、长章节、含公式章节和页面置换练习。每种设备与页面使用独立浏览器上下文重复三次，记录 LCP、CLS、资源传输量、视口溢出和 JSON-LD 数量。网络及 CPU 模拟参数保存在报告中；比较前后结果时应使用相同参数、浏览器和主机，并串行运行，不同时重建被测目录。

这是本地实验室导航样本，不是线上真实用户分布，也没有测量 INP。保留原始样本，按页面和设备比较中位数；不要把一个评分或本地毫秒数当成排名或现场性能结论。动态练习区预留的是最小高度，结果仍可自然展开；调整表单时要重跑延迟加载与窄屏测试。

## 发布与效果记录

发布沿用 [ECS 流程](deployment.md)。本地检查通过后，线上仍要复核状态码、根域名跳转、canonical、robots、Sitemap、缓存和真实错误页。`User-Agent` 模拟请求不能证明真实机器人抓取，机器人验证与访问日志另行核对。

站长平台有权限后记录 Sitemap 提交、索引状态、页面与查询的展现和点击。SEO 配置通过、搜索引擎重新抓取和排名变化是不同结果，分别记录日期与证据。

GEO 人工复测使用[计划中的六个学习问题](plans/2026-11-04-seo-geo.md)。每条记录包含时间、平台、模型或模式、联网状态、语言与地区、完整问题、回答证据、引用 URL、是否指向本站以及答案准确性。保留失败请求，分别统计品牌提及和带链接引用的分子、分母。使用同一组问题重复抽样，不将单次回答归因为优化效果。

没有站长后台、真实爬虫日志或可复核的 AI 回答样本时，相应指标记为缺测。当前未创建定时任务。
