---
description: 进程调度实验：用 FCFS、非抢占 SPF 与时间片轮转跑同一组作业，比较甘特图与周转时间。
---

# 进程调度实验

修改参数后点击“运行”，查看时间轴与计算结果。


<div class="scheduler" data-scheduler>
  <form>
    <div class="lab-controls"><label>调度算法<select name="algorithm"><option value="fcfs">FCFS · 先来先服务</option><option value="spf">SPF · 短进程优先</option><option value="rr">RR · 时间片轮转</option></select></label><label>时间片<input name="quantum" type="number" min="1" max="100" value="2" required /></label></div>
    <table class="input-table"><thead><tr><th>进程</th><th>到达时刻</th><th>服务时间</th></tr></thead><tbody><tr><th>P1</th><td><input name="arrival-0" aria-label="P1 到达时刻" type="number" min="0" max="100" value="0" required></td><td><input name="burst-0" aria-label="P1 服务时间" type="number" min="1" max="100" value="5" required></td></tr><tr><th>P2</th><td><input name="arrival-1" aria-label="P2 到达时刻" type="number" min="0" max="100" value="1" required></td><td><input name="burst-1" aria-label="P2 服务时间" type="number" min="1" max="100" value="3" required></td></tr><tr><th>P3</th><td><input name="arrival-2" aria-label="P3 到达时刻" type="number" min="0" max="100" value="2" required></td><td><input name="burst-2" aria-label="P3 服务时间" type="number" min="1" max="100" value="1" required></td></tr><tr><th>P4</th><td><input name="arrival-3" aria-label="P4 到达时刻" type="number" min="0" max="100" value="4" required></td><td><input name="burst-3" aria-label="P4 服务时间" type="number" min="1" max="100" value="2" required></td></tr></tbody></table>
    <div class="lab-buttons"><button type="submit" class="primary-link">运行</button><button type="reset">恢复示例</button></div>
  </form>
  <div class="lab-results" aria-live="polite" aria-atomic="true"></div>
  <noscript><p class="lab-noscript">这个实验需要 JavaScript 才能运行：请启用 JavaScript 后刷新页面。</p></noscript>
</div>


约定：单 CPU，无 I/O 阻塞，忽略切换开销；SPF 为非抢占算法。轮转调度在时间片边界先加入新到达进程，再将未完成进程放回队尾。

周转时间 = 完成时刻 − 到达时刻；带权周转时间 = 周转时间 ÷ 服务时间。

## 再试两组边界

1. 把四个进程的到达时刻都改成 0，比较 FCFS 与 SPF。先猜执行顺序，再计算平均周转时间。到达时刻相同的 FCFS 按表格顺序处理。
2. 恢复示例，把时间片改为 1，再改为 20。先预测 RR 在“大时间片”下是否会表现得像 FCFS，运行后核对。这个模型忽略上下文切换开销，不能据此认为时间片越小总是越好。

[全部交互练习](index.md) · [回看调度与死锁](../chapters/chapter-3.md)
