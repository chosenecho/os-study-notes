# 许可与版权

studynote 按文件用途和来源分别授权。以下许可仅适用于贡献者有权授权的部分，不代表贡献者拥有教材或其他第三方作品的权利。

## 站点代码：Apache-2.0

除下述内容与第三方文件外，本项目自行编写的站点代码、构建脚本、测试、配置和软件使用文档采用 [Apache License 2.0](LICENSE)。允许使用、修改、商业使用与再分发；再分发时须遵守许可中的版权、许可、修改说明等要求。专利授权、专利诉讼终止条件、商标限制和免责条款以许可原文为准。

网站沿用 MkDocs Material 的主题与组件，其代码保留上游 MIT 许可，不改为本项目的 Apache-2.0。

## 已核验的原创学习内容：CC BY 4.0

[内容权利清单](config/content-rights.json)中状态为 `cleared`、许可为 `CC-BY-4.0` 且文件摘要一致的原创文字，采用 [Creative Commons Attribution 4.0 International](LICENSES/CC-BY-4.0.txt)。当前范围为首页和自编交互练习的说明页。

可以分享、改编和商业使用；须保留适当署名、来源及许可链接，并说明是否修改，不得暗示原作者认可改编成果。转载时可使用：

> 来源：studynote contributors，studynote，https://github.com/chosenecho/studynote；CC BY 4.0，https://creativecommons.org/licenses/by/4.0/；修改情况：按实际填写。

这段署名不能用于为教材原题、教材答案或来源未核验的插图取得使用权。代码文件内的自编题库随该代码文件适用 Apache-2.0。

## 待核验内容不授予开放许可

维护者于 2026-11-04 确认：教材原题、附录答案和教材插图未取得或尚未核验公开传播与再许可授权。

`docs/courses/` 的章节、课程说明和插图，以及尚待逐项核验的 `docs/reference/`，暂不纳入本项目的开放许可。章节混有自行整理的说明与教材材料，当前不能把整份文件当作 CC BY 内容转载。引用出处、学习用途或附上 LICENSE 均不能替代所需授权。

后续应逐项核对来源，取得覆盖预期用途的授权，或移除不具备传播依据的表达与图像，改用独立撰写的讲解和自编题。核验后再更新权利清单及文件摘要。历史审计记录、教材、扫描件及未列入已核验范围的第三方材料也不因仓库带有 LICENSE 而获得本项目授权。

`npm run check:rights` 检查清单、文件摘要和未登记内容；生产及测试环境的发布命令在上传前强制执行。当前存在待核验项，发布会停止。本地构建仅用于审阅，不表示产物可以公开传播。此检查依赖人工核验记录，不能自行判断授权是否合法有效。

仓库已有的公开副本、Git 历史及已上线内容不会因为新增许可和发布检查而自动撤回；这些副本中的教材材料仍需单独处理。

## 第三方资源与贡献

第三方资源保持各自的许可及版权声明，见[第三方资源说明](THIRD_PARTY_NOTICES.md)。请在再分发源码或站点产物时一并保留相应许可与通知。

贡献代码时，请确认有权按 Apache-2.0 提交；贡献原创学习文字时，请确认有权按 CC BY 4.0 提交，并在权利清单中记录来源和核验依据。第三方作品必须单独注明来源、权利人、具体许可及适用范围，不能只声明“来自网络”。不要求贡献者转让著作权。

许可选择参考：[Apache-2.0 原文](https://www.apache.org/licenses/LICENSE-2.0.txt)、[CC BY 4.0 原文](https://creativecommons.org/licenses/by/4.0/legalcode)、[Creative Commons 关于许可权限的说明](https://creativecommons.org/faq/#who-gives-permission-to-use-material-offered-under-creative-commons-licenses)。许可中的免责条款不构成对第三方权利的保证。
