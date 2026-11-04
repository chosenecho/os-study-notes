# 公开历史清理记录

## 已完成的操作

2026-11-04，[PR #4](https://github.com/chosenecho/studynote/pull/4) 检查通过并合并后，维护者明确确认改写 main 和删除旧远端分支。以合并后的同一文件树制作无父提交的新根，核对文件树完全相同，再使用逐引用的 force-with-lease 校验和原子推送更新远端。

干净根提交为 2dcfc856a94fef36b6db0233907f2b48d1005f6b。改写完成时，远端只剩 main，main 的可达提交数为一。后续修改应从此干净根的后代开始，不能合并或推送仍含旧祖先的本地分支。

已删除四个远端分支：codex/material-native、codex/textbook-attribution、codex/homepage-copyright-only，以及本轮已合并的 codex/open-original-notes。其他本地工作树、分支及未提交修改未重置。

## 私有备份

旧正文、插图及原公开归档保存为忽略提交的本地对照副本。远端改写前再次生成完整 Git bundle，并通过完整性校验：local/content-review/ready-for-history-cleanup-20261104.bundle。SHA-256 为 F95990956C73FE93DF9E5B671687965E98C60863BD30DFB123A419F969DDDAE3。

该备份包含旧引用、已合并内容和干净根。备份及旧材料只能私下保管，不能发布为仓库附件或重新推送。较早的 pre-cleanup-20261104.bundle 保留改写前的引用，不包含后来制作的干净根。

## 已有克隆与后续同步

main 已改变历史和提交标识。已有克隆优先重新克隆；如有未提交修改，先私下备份，再把需要保留且可以公开的修改移到干净历史上。不要直接合并旧 main、其他旧分支或 bundle 中的引用。旧提交链接、比较基准和 PR 关联可能失效。

## 尚未清除的副本

GitHub 的已合并 PR 引用和缓存、已有外部克隆、搜索引擎缓存及云端历史部署不随 main 改写消失。不能把当前远端分支检查通过表述为所有副本已撤回，也不能保证零版权风险。

仓库 API 在 2026-11-04 的改写前快照中没有返回 fork、发行版附件或 Actions 附件；该快照不代表没有外部克隆或后续副本。已合并 PR 的差异仍可能保留旧材料，必要时按平台流程联系 GitHub Support，另行申请清除关联引用与缓存。官方流程见 [Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)。

生产部署沿用 ESA 加速与 ECS 静态托管，不把现有域名迁回 Pages。旧服务器发布目录和云端项目没有自动删除；旧材料不得作为回退版本再次公开。
