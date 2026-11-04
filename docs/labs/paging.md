---
description: 逐步比较 FIFO、LRU、OPT 的页框状态、淘汰页与缺页次数。
---

# 页面置换练习

输入页框数与访问序列，逐步比较 FIFO、LRU、OPT 的页框状态和缺页次数。

<div data-study-lab="paging"><p>正在载入练习；若长时间未出现操作区，请刷新页面。</p></div>
<noscript>本练习需要 JavaScript。可先手算：3 个空页框，访问串 2、3、4、2、5、3、6，分别用 FIFO、LRU 和 OPT 处理。</noscript>

## 模型约定

初始页框为空，首次装入也算缺页；不考虑预取和脏页写回。FIFO 命中不改变装入次序，LRU 命中会更新最近访问时间。OPT 看未来下一次访问，永不再用的页优先淘汰；并列时选择编号较小的页框。它用于比较理论最优结果，不能直接在线实现。

FIFO 可能出现增加页框反而增加缺页的异常。

[回看内存管理](../courses/operating-systems/chapter-04.md) · [全部交互练习](index.md)
