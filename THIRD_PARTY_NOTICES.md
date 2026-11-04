# 第三方资源说明

本项目直接使用 MkDocs Material 的主题与组件，并保留其上游许可。以下资源不改为本项目的 Apache-2.0 或原创文字许可；修改、分发时应分别遵守原许可。

## 主题与公式

| 资源 | 本次核对版本 | 许可及声明 |
| --- | --- | --- |
| [MkDocs Material](https://github.com/squidfunk/mkdocs-material/tree/9.7.7) | 9.7.7 | [MIT，原版权声明](LICENSES/third-party/mkdocs-material-MIT.txt) |
| [MkDocs](https://github.com/mkdocs/mkdocs/tree/1.6.1) | 1.6.1 | [BSD，原版权声明](LICENSES/third-party/mkdocs-BSD.txt) |
| [KaTeX](https://github.com/KaTeX/KaTeX/tree/v0.16.11) | 0.16.11 | [MIT，Khan Academy](LICENSES/third-party/katex-MIT.txt)；资源目录内的原 LICENSE 同时保留 |
| [KaTeX 字体](https://github.com/KaTeX/katex-fonts) | KaTeX 0.16.11 随附的字体 | [MIT，Khan Academy](LICENSES/third-party/katex-fonts-MIT.txt) |
| [Material Design Icons](https://github.com/Templarian/MaterialDesign-SVG/tree/v7.4.47) | @mdi/svg 7.4.47 | [Apache-2.0 及原版权声明](LICENSES/third-party/mdi-svg-LICENSE.txt) |
| [Font Awesome Free](https://github.com/FortAwesome/Font-Awesome/tree/7.1.0) | 7.1.0 | [原许可与署名，Fonticons, Inc.](LICENSES/third-party/fontawesome-LICENSE.txt)；主题中的 GitHub SVG 图标按 CC BY 4.0 使用 |

Material 原生导航、搜索、配色、卡片和折叠组件用于本站；本项目的内容生成、复习工具、实验、打印和少量样式位于 `docs/assets/`、`theme/` 和 `tools/mkdocs/`。主题覆盖及资源裁剪属于本站的构建处理，不代表上游认可本站教材内容或许可结论。本次主题迁移未引入其他学习站点的文章、题目或图片。

## 主题分发的浏览器依赖

版本以 Material 9.7.7 的上游锁文件和本机安装包的浏览器 bundle source map 为核对依据。以下许可文件随源码和站点产物一同保留。

| 依赖 | 版本 | 许可及声明 |
| --- | --- | --- |
| clipboard.js | 2.0.11 | [MIT，Zeno Rocha](LICENSES/third-party/clipboard-LICENSE) |
| good-listener | 1.2.2 | MIT，Zeno Rocha；[上游署名](LICENSES/third-party/good-listener-copyright.txt)，MIT 条文见 clipboard.js 许可 |
| delegate | 3.2.0 | MIT，Zeno Rocha；[上游署名](LICENSES/third-party/delegate-copyright.txt)，MIT 条文见 clipboard.js 许可 |
| select | 1.1.2 | MIT，Zeno Rocha；[上游署名](LICENSES/third-party/select-copyright.txt)，MIT 条文见 clipboard.js 许可 |
| tiny-emitter | 2.1.0 | [MIT，原版权声明](LICENSES/third-party/tiny-emitter-LICENSE) |
| escape-html | 1.0.3 | [MIT，原版权声明](LICENSES/third-party/escape-html-LICENSE) |
| focus-visible | 5.2.1 | [上游许可通知](LICENSES/third-party/focus-visible-LICENSE.txt)及 [W3C Software and Document License 2015](LICENSES/third-party/W3C-Software-and-Document-2015.txt) |
| RxJS | 7.8.2 | [Apache-2.0 及原版权声明](LICENSES/third-party/rxjs-LICENSE.txt) |
| tslib | 2.7.0 | [0BSD，Microsoft Corporation](LICENSES/third-party/tslib-LICENSE.txt) |
| Lunr | 2.3.9 | [MIT，Oliver Nightingale](LICENSES/third-party/lunr-LICENSE) |
| lunr-languages | 1.14.0 | [MPL-1.1 原文](LICENSES/third-party/lunr-languages-LICENSE)，各文件署名见下列源码 |

`lunr-languages` 的中文语言包和 stemmer 支持文件保留 Felix Lian、Oleg Mazko 等上游署名。站点使用 Material 分发的压缩文件，对应的未压缩源码随站点提供：

- [lunr.zh.js](LICENSES/third-party/lunr-languages/lunr.zh.js)
- [lunr.multi.js](LICENSES/third-party/lunr-languages/lunr.multi.js)
- [lunr.stemmer.support.js](LICENSES/third-party/lunr-languages/lunr.stemmer.support.js)

这些源码从锁定的 npm 1.14.0 发行包取得，未修改。本站不修改搜索算法源码；构建仅移除未使用的语言包和 source map。分发含这些文件的产物时，请保留许可、署名、本说明和对应源码的获取方式；不能把本项目根 LICENSE 当作这些文件的许可。

## 更新与核对

[来源与文件摘要](LICENSES/third-party/SOURCES.json)记录上游来源、发行包完整性摘要和本次分发的许可文件摘要，核对日期为 2026-11-04。Material、图标或公式资源升级后，需重新核对实际分发的文件与许可，不能沿用旧版本结论。

构建时，`LICENSE`、`NOTICE`、`LICENSES/`、本说明和许可范围说明一起进入站点产物。网站的“许可与版权”页面提供入口。第三方教材内容的待核验状态见[权利清单](config/content-rights.json)；本页列出的软件许可不覆盖教材。
