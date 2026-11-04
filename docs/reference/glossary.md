# 术语与缩写表

本表给出阅读入口；精确定义、条件与计算见相应章节。同一缩写出现在不同资料中时，应先确认上下文。

| 术语 | 本站含义与辨析 | 回查 |
| --- | --- | --- |
| OS | 操作系统，负责资源管理与受控服务 | [OS 1](../courses/operating-systems/chapter-01.md) |
| PCB | 进程控制块，保存管理与恢复执行所需信息 | [OS 2](../courses/operating-systems/chapter-02.md#s2) |
| P/V | 信号量的获取与归还操作，数值约定需明确 | [OS 2](../courses/operating-systems/chapter-02.md#s10) |
| Mesa | 条件通知后等待者重新竞争锁的管程语义 | [OS 2](../courses/operating-systems/chapter-02.md#s12) |
| IPC | 进程间通信，可采用共享存储、管道或消息等形式 | [OS 2](../courses/operating-systems/chapter-02.md#s13) |
| FCFS | 先到先服务，先固定到达次序及同刻规则 | [OS 3](../courses/operating-systems/chapter-03.md#s4) · [调度实验](../labs/scheduling.md) |
| RR | 时间片轮转，片长与切换成本影响结果 | [OS 3](../courses/operating-systems/chapter-03.md#s4) |
| EDF / LLF | 分别按最近截止时间与最小松弛度选任务 | [OS 3](../courses/operating-systems/chapter-03.md#s5) |
| Need / Allocation | 最大剩余需求与当前已分配量，不可互换 | [OS 3](../courses/operating-systems/chapter-03.md#s10) · [安全性练习](../labs/banker.md) |
| 页号 / 页内偏移 | 分页地址的两部分，转换时保留页内偏移 | [OS 4](../courses/operating-systems/chapter-04.md#s4) · [地址转换](../labs/address.md) |
| TLB | 地址转换缓存，未命中不必缺页 | [OS 4](../courses/operating-systems/chapter-04.md#s5) |
| FIFO / LRU / OPT | 按装入次序、近期使用或未来使用决定置换 | [OS 4](../courses/operating-systems/chapter-04.md#s10) · [置换练习](../labs/paging.md) |
| FAT | 文件分配表，集中保存簇链信息 | [OS 5](../courses/operating-systems/chapter-05.md#s5) |
| i 结点 | UNIX 风格文件元数据结构，不是文件名本身 | [OS 5](../courses/operating-systems/chapter-05.md#s7) |
| SPOOLing | 以队列暂存并安排独占设备作业 | [OS 6](../courses/operating-systems/chapter-06.md#s6) |
| PC / IR | 程序计数器与指令寄存器；实际语义依 ISA | [CO 1](../courses/computer-organization/chapter-01.md#s4) |
| ISA | 指令集体系结构，规定机器级可见行为 | [CO 1](../courses/computer-organization/chapter-01.md#s3) |
| CPI | 每条指令平均消耗的时钟周期数 | [CO 1](../courses/computer-organization/chapter-01.md#s5) |
| BCD | 对十进制各数字分别编码的表示 | [CO 2](../courses/computer-organization/chapter-02.md#s1) |
| ALU | 算术逻辑单元，依控制选择具体功能 | [CO 2](../courses/computer-organization/chapter-02.md#s7) |
| 进位 / 有符号溢出 | 无符号输出进位与带符号范围越界，判断依据不同 | [CO 2](../courses/computer-organization/chapter-02.md#s7) · [补码练习](../labs/complement.md) |
| EA | 有效地址，按寻址方式计算的目标位置 | [CO 3](../courses/computer-organization/chapter-03.md#s2) |
| RAW | 先写后读的真数据依赖，不能靠重命名消除 | [CO 4](../courses/computer-organization/chapter-04.md#s6) |
| SRAM / DRAM | 两类易失随机存储，刷新与电路组织不同 | [CO 5](../courses/computer-organization/chapter-05.md#s2) |
| Cache / AMAT | 数据缓存与平均访问时间，代价统计口径需明确 | [CO 5](../courses/computer-organization/chapter-05.md#s5) · [映射练习](../labs/cache.md) |
| DMA / IOMMU | 设备直接搬运数据的机制及设备地址转换、隔离设施 | [CO 6](../courses/computer-organization/chapter-06.md#s5) |

CPU 的存储总线竞争与操作系统进程阻塞处在不同层次，见操作系统与组成原理的 I/O 章节。容量记号使用 B 表示字节、bit 表示位；KiB=1024 B，十进制速率按题设换算。

## 计算机网络技术

| 术语 | 本站含义与辨析 | 回查 |
| --- | --- | --- |
| LAN / WAN | 局域网与广域网，分类范围不直接决定实测速率 | [CN 1](../courses/computer-networks/chapter-01.md#s2) |
| Baud / bit/s | 每秒码元数与每秒比特数，取决于每码元的状态数 | [CN 2](../courses/computer-networks/chapter-02.md#s3) |
| PCM | 抽样、量化、编码，三步改变的维度不同 | [CN 2](../courses/computer-networks/chapter-02.md#s6) |
| FDM / TDM / WDM / CDM | 按频带、时间、光波长或码片区分多路数据 | [CN 2](../courses/computer-networks/chapter-02.md#s7) |
| ARQ / FEC | 反馈重传与接收端前向纠错 | [CN 2](../courses/computer-networks/chapter-02.md#s8) |
| PDU / SDU / PCI | 本层协议单元、上交服务数据与协议控制信息 | [CN 3](../courses/computer-networks/chapter-03.md#s2) |
| TCP / UDP | 连接与可靠传输、字节组织，同无连接报文服务区别 | [CN 3](../courses/computer-networks/chapter-03.md#s4) |
| rwnd / cwnd | 接收窗口与拥塞窗口，约束不同来源的负担 | [CN 3](../courses/computer-networks/chapter-03.md#s6) |
| CSMA/CD / CSMA/CA | 共享以太网冲突检测与无线冲突避免 | [CN 4](../courses/computer-networks/chapter-04.md#s7) |
| MAC / VLAN / Trunk | 链路地址、逻辑广播范围与跨交换机承载 | [CN 4](../courses/computer-networks/chapter-04.md#s5) |
| CIDR | 用网络前缀界定地址块，并支持路由聚合 | [CN 5](../courses/computer-networks/chapter-05.md#s5) |
| NAT | 地址转换及返回映射，不等于加密 | [CN 5](../courses/computer-networks/chapter-05.md#s6) |
| ARP / DHCP | 本地链路地址解析与动态配置分配 | [CN 5](../courses/computer-networks/chapter-05.md#s8) |
| ICMP / IGMP | 控制差错与查询、多播本地成员关系 | [CN 5](../courses/computer-networks/chapter-05.md#s8) |
| DNS / URL / HTTP | 名字解析、资源定位与请求响应分工 | [CN 6](../courses/computer-networks/chapter-06.md#s5) |
| SMTP / POP3 / IMAP | 邮件发送与读取管理，不能互换 | [CN 6](../courses/computer-networks/chapter-06.md#s4) |
| Cookie / Session | 客户端关联数据与服务器侧会话状态可配合 | [CN 6](../courses/computer-networks/chapter-06.md#s6) |
| SNMP / SMI / MIB | 管理协议、对象描述规则与对象信息集合 | [CN 7](../courses/computer-networks/chapter-07.md#s5) |
| OID / Trap | 对象标识与代理主动事件通报 | [CN 7](../courses/computer-networks/chapter-07.md#s5) |
| AD / OU / LDAP | 活动目录、域内组织单元与目录访问协议 | [CN 8](../courses/computer-networks/chapter-08.md#s6) |
| IPsec / AH / ESP | 网络层安全体系及其中不同保护机制 | [CN 9](../courses/computer-networks/chapter-09.md#s6) |
| CA / KDC | 证书身份绑定与密钥分配中心，信任职责不同 | [CN 9](../courses/computer-networks/chapter-09.md#s4) |
