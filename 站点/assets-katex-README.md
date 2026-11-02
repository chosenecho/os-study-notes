# KaTeX 0.16.11（vendored）

这里不是手写代码，是从 KaTeX 官方发行包原样拷进来的。**升级时整目录替换**，不要逐文件改。

| 文件 | 用途 |
|---|---|
| `katex.min.js` | 渲染引擎，275,414 B |
| `katex.min.css` | 样式 + 20 个 `@font-face` 声明 |
| `contrib/auto-render.min.js` | 自动扫描 `\(...\)` / `\[...\]` 并渲染 |
| `fonts/*.woff2` | 20 个字体，共 259,792 B |

总 23 文件 / 562,022 B。

版本号没有写在文件名里，只以 `version:"0.16.11"` 存在于 `katex.min.js` 尾部。升级时从 <https://github.com/KaTeX/KaTeX/releases> 取同名文件覆盖，再用 `grep version: katex.min.js` 复核。

授权见同目录 `LICENSE`（MIT，Copyright (c) 2013-2024 Khan Academy）。

**为什么是自托管而不是 CDN**：`站点/src/_headers` 的 CSP 是 `script-src 'self'`、`font-src 'self'`，走 CDN 会被自己挡掉。

**怎么只用在该用的页面**：`站点/hooks.py` 的 `on_post_build` 扫 `chapter-*/index.html`，只有渲染结果里出现 `class="arithmatex"` 才注入两个 script 标签。所以哪门课的笔记先写公式，哪门课就自动生效。
