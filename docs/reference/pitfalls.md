# 易错点清单

用本表回查解题条件。条目按本项目的讲解与自编练习整理，不是教材勘误表，也不预测考试频率。

## 操作系统概论

| 章节 | 容易混淆的判断 | 回查方式 |
| --- | --- | --- |
| [简介](../courses/operating-systems/chapter-01.md) | 并发不要求同时执行；地址数不必等于字节数 | 写出处理器数量、编址单位与字长 |
| [进程](../courses/operating-systems/chapter-02.md) | 就绪还未获得 CPU；阻塞还缺事件条件 | 逐步写状态转换，不把唤醒直接画成运行 |
| [同步](../courses/operating-systems/chapter-02.md#s10) | 互斥锁不能代替数据可用条件 | 先列 empty/full 等资源约束，再安排 P/V 次序 |
| [调度与死锁](../courses/operating-systems/chapter-03.md) | 响应、等待、周转分别统计不同区间；不安全不等于已死锁 | 画到达与完成时间线；安全检查逐分量比较 |
| [内存](../courses/operating-systems/chapter-04.md) | TLB 未命中不等于缺页；FIFO 命中不更新装入次序 | 将地址缓存、驻留状态和置换队列分开记录 |
| [文件](../courses/operating-systems/chapter-05.md) | 链式文件未必连续；索引块不是文件内容 | 先画定位路径，再按缓存条件计算读盘次数 |
| [I/O](../courses/operating-systems/chapter-06.md) | 进程阻塞不等于 CPU 停机；DMA 也有准备与完成开销 | 分清调度状态、数据搬运与共享总线竞争 |

## 计算机组成原理

| 章节 | 容易混淆的判断 | 回查方式 |
| --- | --- | --- |
| [系统](../courses/computer-organization/chapter-01.md) | 主频高不保证同任务更快 | 同时比较指令数、平均 CPI 与主频 |
| [数据](../courses/computer-organization/chapter-02.md) | 进位不等于有符号溢出；位型顺序不等于字节端序 | 固定位宽，分别解释无符号与补码值 |
| [指令](../courses/computer-organization/chapter-03.md) | 字节偏移不等于数组下标；PC 相对分支有规定基准 | 先求有效地址，再追踪分支目标与延迟槽模型 |
| [处理器](../courses/computer-organization/chapter-04.md) | 流水稳态吞吐不等于单条延迟；转发不能提前生成数据 | 画阶段时间线，标出结果产生和使用的时刻 |
| [存储](../courses/computer-organization/chapter-05.md) | Cache 组号不等于主存块号；额外未命中惩罚不同于完整时间 | 按容量、块大小和路数拆位，先确认 AMAT 定义 |
| [互连与 I/O](../courses/computer-organization/chapter-06.md) | 总线节拍峰值不等于事务有效带宽 | 统计每事务实际交付字节与总耗时 |

## 计算前的检查

1. 抄下题设的单位、编号起点、位宽、编址单位与初始状态。
2. 写清算法变体：是否抢占、如何处理同一时刻事件、扫描方向及边界。
3. 把时间统一到同一量级，把位与字节分开，KiB 与 kB 不混用。
4. 用可复核条件验算：页内偏移小于页大小、余数在合法范围、安全向量逐分量满足、文件索引只统计内容块。
5. 对模型未规定的行为写出假设，不把某个教学模型推广到全部现代硬件。

可在[交互练习](../labs/index.md)中更换输入，观察初始条件改变后结论是否仍成立。

## 计算机网络技术

| 章节 | 容易混淆的判断 | 回查方式 |
| --- | --- | --- |
| [网络概论](../courses/computer-networks/chapter-01.md) | 提高速率缩短发送时间，不按同比例缩短传播时间 | 分别写位数/速率与距离/传播速度 |
| [数据通信](../courses/computer-networks/chapter-02.md) | Baud 不必等于 bit/s；抽样不等于量化；奇偶校验通过不证明无错 | 写每码元状态数、每样本位数与检错条件 |
| [协议与体系](../courses/computer-networks/chapter-03.md) | TCP 按字节确认；接收窗口不等于拥塞窗口 | 写下一期望字节与两类约束的对象 |
| [局域网](../courses/computer-networks/chapter-04.md) | 源地址学习与目的地址转发分开；VLAN 创建不代替 Trunk 许可 | 逐帧更新表，逐链路检查成员与承载 |
| [网络互联](../courses/computer-networks/chapter-05.md) | 地址块总数与主机数不同；ARP 找下一跳而非远端；片偏移按 8 B | 先按位与，再查最长前缀和链路目的 |
| [网络应用](../courses/computer-networks/chapter-06.md) | HTTP 无状态不等于不能复用 TCP；Cookie 与 Session 可配合 | 画请求路径与状态保存位置 |
| [网络管理](../courses/computer-networks/chapter-07.md) | Trap 由代理主动报告，不能当作 Get 轮询本身 | 区分操作发起者、对象名与请求编号 |
| [网络操作系统](../courses/computer-networks/chapter-08.md) | 装角色不等于完成域配置；域不等于站点 | 查名称解析、账户与目录状态，并标明旧版环境 |
| [网络安全](../courses/computer-networks/chapter-09.md) | 加密、摘要、签名与访问控制职责不同；NAT 不等于保密 | 写保护目标、密钥归属、验证和授权条件 |
