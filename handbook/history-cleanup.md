# 公开历史清理待办

## 已完成的准备

2026-11-04 已在独立工作树整理当前公开内容，并将旧正文、插图和公开归档保存为忽略提交的本地对照副本。完整 Git bundle 已创建并通过完整性校验，位置为 local/content-review/pre-cleanup-20261104.bundle。备份含旧材料，只能私下保管，不能作为公开发行附件。

该备份保留改写前可达历史；它不包含尚未提交的新内容。执行远端改写前应再次备份最新引用，并核对可恢复性。

## 核查快照

仓库为公开的 chosenecho/studynote。此次核查发现 main 之外还有 codex/material-native、codex/textbook-attribution、codex/homepage-copyright-only 三个远端分支。旧正文能从这些分支、main 的早期提交及已合并 PR 查到，普通删除或合并不会撤回它们。

GitHub API 本次返回没有发行版附件、没有仓库 fork、没有 Actions 附件；这是 2026-11-04 的查询快照，不是永久保证，也不代表没有克隆或缓存。新 PR 的删除差异也可能保留旧材料。

## 建议执行方案

在本轮 PR 检查并合并后，以清理后的树制作不含旧祖先的新根提交；再次生成并校验私有备份，再用明确的旧提交校验值强制更新 main，删除已核对的三个旧分支。当前任务分支也应删除，避免它继续暴露旧祖先。保护规则若阻止改写，应按仓库管理流程处理，不能绕开。

此操作会改变 main 的历史与提交标识。其他工作树和已有克隆需要重新同步或重新克隆；旧提交链接、比较基准及 PR 关联可能失效。不能对其他本地工作树执行重置，尤其不能丢弃未提交修改。

GitHub 的 PR 引用和缓存、既有外部克隆、搜索引擎缓存及站点历史部署要分别处理；重写 main 无法保证这些副本消失。必要时按平台流程联系 GitHub Support 或相关持有人。官方说明见 [Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)。

远端历史改写与删除分支需要用户对上述具体影响确认。当前内容整理不自动执行强推、删除其他工作树或删除云端项目。
