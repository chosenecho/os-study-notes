# KaTeX 静态资源

资源位于 docs/assets/vendor/katex/。版本标记以 katex.min.js 内的 version 为准，许可见同目录 LICENSE。

| 文件 | 用途 |
| --- | --- |
| katex.min.js | 公式渲染 |
| katex.min.css | 公式样式与字体声明 |
| contrib/auto-render.min.js | 页面公式扫描 |
| fonts/*.woff2 | 公式字体 |

升级时从 KaTeX 官方发行包整体替换所需文件并保留许可，随后执行严格构建和浏览器检查。不要单独修改压缩文件。

ESA 响应头规则中的 CSP 使用同源脚本与字体资源，规则来源为 config/esa-site.json。tools/mkdocs/assets.py 扫描构建页的公式标记，按需插入渲染脚本。公式样式列在 mkdocs.yml 中。

KaTeX 及字体的许可与来源同时收录在 [第三方资源说明](../../THIRD_PARTY_NOTICES.md)，构建时一并复制到站点。升级时同步核对公式字体的许可，不要只替换 JavaScript。
