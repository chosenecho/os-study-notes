---
description: 进程调度实验：用 FCFS、非抢占 SPF 与时间片轮转跑同一组作业，比较甘特图与周转时间。
---

# 进程调度实验

修改参数后点击“运行”，查看时间轴与计算结果。

<div class="scheduler" data-scheduler>
  <form>
    <div class="lab-controls"><label>调度算法<select name="algorithm"><option value="fcfs">FCFS · 先来先服务</option><option value="spf">SPF · 短进程优先</option><option value="rr">RR · 时间片轮转</option></select></label><label>时间片<input name="quantum" type="number" min="1" max="100" value="2" required /></label></div>
    <table class="input-table"><thead><tr><th>进程</th><th>到达时刻</th><th>服务时间</th></tr></thead><tbody><tr><th>P1</th><td><input name="arrival-0" aria-label="P1 到达时刻" type="number" min="0" max="100" value="0" required></td><td><input name="burst-0" aria-label="P1 服务时间" type="number" min="1" max="100" value="5" required></td></tr><tr><th>P2</th><td><input name="arrival-1" aria-label="P2 到达时刻" type="number" min="0" max="100" value="1" required></td><td><input name="burst-1" aria-label="P2 服务时间" type="number" min="1" max="100" value="3" required></td></tr><tr><th>P3</th><td><input name="arrival-2" aria-label="P3 到达时刻" type="number" min="0" max="100" value="2" required></td><td><input name="burst-2" aria-label="P3 服务时间" type="number" min="1" max="100" value="1" required></td></tr><tr><th>P4</th><td><input name="arrival-3" aria-label="P4 到达时刻" type="number" min="0" max="100" value="4" required></td><td><input name="burst-3" aria-label="P4 服务时间" type="number" min="1" max="100" value="2" required></td></tr></tbody></table>
    <div class="lab-buttons"><button type="submit" class="md-button md-button--primary">运行</button><button class="md-button" type="reset">恢复示例</button></div>
  </form>
  <div class="lab-results" aria-live="polite" aria-atomic="true"></div>
  <noscript><p class="lab-noscript">这个实验需要 JavaScript 才能运行：请启用 JavaScript 后刷新页面。</p></noscript>
</div>

约定：单 CPU，无 I/O 阻塞，忽略切换开销；SPF 为非抢占算法。轮转调度在时间片边界先加入新到达进程，再将未完成进程放回队尾。

周转时间 = 完成时刻 − 到达时刻；带权周转时间 = 周转时间 ÷ 服务时间。

## 自编算例：FCFS 的周转时间

采用上面的默认输入，时间单位统一为毫秒（ms）。FCFS 按到达顺序执行，P1 占用 [0,5)，P2 占用 [5,8)，P3 占用 [8,9)，P4 占用 [9,11)。方括号左端计入、右端不计入。

| 进程 | 到达 / ms | 服务 / ms | 完成 / ms | 周转 / ms | 带权周转 |
| --- | --- | --- | --- | --- | --- |
| P1 | 0 | 5 | 5 | 5 | 1 |
| P2 | 1 | 3 | 8 | 7 | 7/3 |
| P3 | 2 | 1 | 9 | 7 | 7 |
| P4 | 4 | 2 | 11 | 7 | 7/2 |

例如 P2 的周转时间为 8 − 1 = 7 ms，带权值为 7 ÷ 3，没有时间单位。平均周转时间为 (5 + 7 + 7 + 7) ÷ 4 = **6.5 ms**，平均带权周转时间为 **83/24，约 3.4583**。完整定义与另一组自编输入见[周转与带权周转](../courses/operating-systems/chapter-03.md#s3)。

## 对照实验

1. 把四个进程的到达时刻都改成 0，比较 FCFS 与 SPF。到达时刻相同的 FCFS 按表格顺序处理。
2. 恢复示例，把时间片改为 1，再改为 20。比较 RR 的执行顺序与平均周转时间。

[全部交互练习](index.md) · [回看调度与死锁](../courses/operating-systems/chapter-03.md)
