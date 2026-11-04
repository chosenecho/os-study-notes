# 术语与缩写表

两门课共用的速查表。OS = 操作系统概论，CO = 计算机组成原理；“回查章节”指适合复习该概念的位置，不表示缩写首次出现的位置。可按缩写检索，再通过章节链接查看正文和适用条件。易混的计算口径另见[易错点清单](pitfalls.md)。

| 缩写 | 中文名称 | 英文全称 | 回查章节 | 备注 |
| --- | --- | --- | --- | --- |
| PCB | 进程控制块 | Process Control Block | [OS 第 2 章](../courses/operating-systems/chapter-02.md) | 进程存在的唯一标志，进程表就是 PCB 的集合 |
| PV | P 操作与 V 操作 | Passeren / Vrijgeven（荷兰语原词） | [OS 第 2 章](../courses/operating-systems/chapter-02.md) | 代码中对应 `wait(s)`、`signal(s)`；P/V 不是英文缩写 |
| PIT | 可编程间隔定时器 | Programmable Interval Timer | [OS 第 2 章](../courses/operating-systems/chapter-02.md) | 时钟中断的来源之一，时间片靠它计时 |
| RTC | 实时时钟 | Real-Time Clock | [OS 第 2 章](../courses/operating-systems/chapter-02.md) | 由电池供电，用于记录当前日期和时间 |
| FCFS | 先来先服务 | First-Come, First-Served | [OS 第 3 章](../courses/operating-systems/chapter-03.md) | 按到达先后排队；计算时仍要检查作业是否已到达 |
| SJF / SPF | 短作业优先 / 短进程优先 | Shortest Job First / Shortest Process First | [OS 第 3 章](../courses/operating-systems/chapter-03.md) | 名称随调度对象区分；先确认是否可抢占，本站实验采用非抢占 SPF |
| RR | 时间片轮转 | Round Robin | [OS 第 3 章](../courses/operating-systems/chapter-03.md) | 记录剩余服务时间、就绪队列与新到达进程的入队时机 |
| HRRN | 最高响应比优先 | Highest Response Ratio Next | [OS 第 3 章](../courses/operating-systems/chapter-03.md) | 响应比 =（等待时间 + 服务时间）/ 服务时间；每次调度重新计算 |
| SDT | 系统设备表 | System Device Table | [OS 第 6 章](../courses/operating-systems/chapter-06.md) | 全系统一张，每条指向一个 DCT |
| DCT | 设备控制表 | Device Control Table | [OS 第 6 章](../courses/operating-systems/chapter-06.md) | 记录设备状态、等待队列与指向 COCT 的指针 |
| COCT | 控制器控制表 | Controller Control Table | [OS 第 6 章](../courses/operating-systems/chapter-06.md) | 一个控制器一张，指向所接通道的 CHCT |
| CHCT | 通道控制表 | Channel Control Table | [OS 第 6 章](../courses/operating-systems/chapter-06.md) | 保存通道状态和等待队列；设备分配按设备、控制器、通道逐级检查 |
| FAT | 文件分配表 | File Allocation Table | [OS 第 5 章](../courses/operating-systems/chapter-05.md) | 显式链接分配：按卷集中保存各簇的后继簇号 |
| SPOOLing | 假脱机 | Simultaneous Peripheral Operations On-Line | [OS 第 6 章](../courses/operating-systems/chapter-06.md) | 用磁盘上的输入井、输出井把独占设备改成共享 |
| TLB | 快表 | Translation Lookaside Buffer | [OS 第 4 章](../courses/operating-systems/chapter-04.md) | 页表项的高速缓存，命中就不必再访存查页表 |
| FIFO | 先进先出 | First In, First Out | [OS 第 4 章](../courses/operating-systems/chapter-04.md) | 按装入时间淘汰最早进入的页；命中不改变装入次序 |
| LRU | 最近最久未使用 | Least Recently Used | [OS 第 4 章](../courses/operating-systems/chapter-04.md) | 按最近访问时间淘汰最久未用的页；命中也要更新使用信息 |
| LFU | 最少使用 / 最不经常使用 | Least Frequently Used | [OS 第 4 章](../courses/operating-systems/chapter-04.md) | 按访问次数淘汰；历史计数可能需要老化，和 LRU 的时间次序不同 |
| OPT | 最佳置换 | Optimal | [OS 第 4 章](../courses/operating-systems/chapter-04.md) | 淘汰未来最久才访问或不再访问的页；需预知未来，作为理论对照 |
| EAT | 有效访存时间 | Effective Access Time | [OS 第 4 章](../courses/operating-systems/chapter-04.md) | 本章缺页模型中 `m` 是正常访问耗时，`p` 是缺页率；先判断给的是额外开销还是缺页总时间 |
| AMAT | 平均访存时间 | Average Memory Access Time | [CO 第 5 章](../courses/computer-organization/chapter-05.md) | 本章 Cache 模型中 `m = 1 − h` 是缺失率；EAT、AMAT 都是平均耗时，符号按题设定义 |
| CPI | 每指令时钟周期数 | Cycles Per Instruction | [CO 第 1 章](../courses/computer-organization/chapter-01.md) | 执行时间 = 指令条数 × CPI ÷ 主频 |
| MIPS | 每秒百万条指令 | Million Instructions Per Second | [CO 第 1 章](../courses/computer-organization/chapter-01.md) | 比性能时须考虑程序、指令集和指令条数；第 3 章同名的 MIPS 指令集不是这个性能指标 |
| ISA | 指令集体系结构 | Instruction Set Architecture | [CO 第 1 章](../courses/computer-organization/chapter-01.md) | 软件与硬件的接口约定，规定程序可见的机器行为 |
| DMA | 直接存储器访问 | Direct Memory Access | [OS 第 6 章](../courses/operating-systems/chapter-06.md) | CPU 负责初始化与收尾，DMA 负责数据传输，仍可能争用访存资源 |
| RAID | 独立磁盘冗余阵列 | Redundant Array of Independent Disks | [CO 第 6 章](../courses/computer-organization/chapter-06.md) | 教材用 RAID 0/1/5 讲容量、可靠性与写惩罚 |
| DRAM | 动态随机存取存储器 | Dynamic Random Access Memory | [CO 第 5 章](../courses/computer-organization/chapter-05.md) | 靠电容电荷存储信息，需要定期刷新，常用于主存 |
| SRAM | 静态随机存取存储器 | Static Random Access Memory | [CO 第 5 章](../courses/computer-organization/chapter-05.md) | 访问快、成本较高，无需刷新，常用于 Cache |
| CISC | 复杂指令集计算机 | Complex Instruction Set Computer | [CO 第 3 章](../courses/computer-organization/chapter-03.md) | 教材以复杂指令、可变长度等典型特点作对照，具体格式依指令集而定 |
| RISC | 精简指令集计算机 | Reduced Instruction Set Computer | [CO 第 3 章](../courses/computer-organization/chapter-03.md) | 本课以 MIPS 的定长指令、load/store 结构等特点为例，不把定长视为所有 RISC 的必备条件 |
| PC | 程序计数器 | Program Counter | [OS 第 1 章](../courses/operating-systems/chapter-01.md) | 指向下一条要取的指令地址 |
| IR | 指令寄存器 | Instruction Register | [OS 第 1 章](../courses/operating-systems/chapter-01.md) | 存放正在执行的那条指令 |
| PSW | 程序状态字 | Program Status Word | [OS 第 2 章](../courses/operating-systems/chapter-02.md) | 中断与进程切换时要保存的现场之一 |
| ALU | 算术逻辑单元 | Arithmetic Logic Unit | [CO 第 1 章](../courses/computer-organization/chapter-01.md) | 数据通路里真正做运算的部件 |
| IDT | 中断描述符表 | Interrupt Descriptor Table | [OS 第 2 章](../courses/operating-systems/chapter-02.md) | 按中断号查中断服务程序入口 |
| BIOS | 基本输入输出系统 | Basic Input/Output System | 笔记未出现 | 保留备查 |
| PCI | 外设部件互连 | Peripheral Component Interconnect | [CO 第 6 章](../courses/computer-organization/chapter-06.md) | 教材年代的总线实例，规格不能当今天的产品参数 |
| USB | 通用串行总线 | Universal Serial Bus | [OS 第 1 章](../courses/operating-systems/chapter-01.md) | 即插即用的串行总线，作外设举例出现 |
| ASCII | 美国信息交换标准代码 | American Standard Code for Information Interchange | [OS 第 5 章](../courses/operating-systems/chapter-05.md) | 7 位编码 128 个字符，第 8 位常作校验或扩展 |
| IEEE 754 | 浮点算术标准 | IEEE Standard for Floating-Point Arithmetic | [CO 第 2 章](../courses/computer-organization/chapter-02.md) | 本课的二进制单精度为 1+8+23 位、双精度为 1+11+52 位；阶码全 0/全 1 须另判，单精度全 1 为 255，双精度为 2047 |
| GB 2312 | 信息交换用汉字编码字符集 | —（国标编号，无英文全称） | [CO 第 2 章](../courses/computer-organization/chapter-02.md) | 区位码编码，与 ASCII 混排时按字节区分 |
| HT | 超线程 | Hyper-Threading | 笔记未出现 | 保留备查；它是 SMT 的一种商业实现名 |
| CRC | 循环冗余校验 | Cyclic Redundancy Check | [CO 第 2 章](../courses/computer-organization/chapter-02.md) | 模 2 除法取余数，余数拼在数据后一起发送 |
| EPROM | 可擦除可编程只读存储器 | Erasable Programmable Read-Only Memory | [CO 第 5 章](../courses/computer-organization/chapter-05.md) | 紫外光擦除，写入次数有限 |
| Flash | 闪存 | Flash Memory | [CO 第 5 章](../courses/computer-organization/chapter-05.md) | 非易失性电擦写存储；NAND 通常按页读取和编程、按块擦除，NOR 的操作粒度另看器件 |
| Cache | 高速缓存 | Cache Memory | [OS 第 4 章](../courses/operating-systems/chapter-04.md) | 两书都讲，CO 的映射与缺失分析更细 |
| MMU | 存储管理单元 | Memory Management Unit | [OS 第 4 章](../courses/operating-systems/chapter-04.md) | 硬件做逻辑地址到物理地址的转换 |
