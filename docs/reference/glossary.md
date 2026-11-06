# 术语与缩写表

OS：操作系统概论；CO：计算机组成原理；CN：计算机网络技术；MM：多媒体技术及应用。

| 术语 | 含义 | 章节 |
| --- | --- | --- |
| OS | 操作系统 | [OS 1](../courses/operating-systems/chapter-01.md) |
| PCB | 进程控制块 | [OS 2](../courses/operating-systems/chapter-02.md#s2) |
| P/V | 信号量操作：P 等待，V 发信号 | [OS 2](../courses/operating-systems/chapter-02.md#s10) |
| Mesa | 条件通知后等待者重新竞争锁的管程语义 | [OS 2](../courses/operating-systems/chapter-02.md#s12) |
| IPC | 进程间通信 | [OS 2](../courses/operating-systems/chapter-02.md#s13) |
| FCFS | 先来先服务 | [OS 3](../courses/operating-systems/chapter-03.md#s4) · [调度实验](../labs/scheduling.md) |
| RR | 时间片轮转 | [OS 3](../courses/operating-systems/chapter-03.md#s4) |
| EDF | 最早截止时间优先 | [OS 3](../courses/operating-systems/chapter-03.md#s5) |
| LLF | 最小松弛度优先 | [OS 3](../courses/operating-systems/chapter-03.md#s5) |
| Need | 最大剩余资源需求 | [OS 3](../courses/operating-systems/chapter-03.md#s10) · [安全性练习](../labs/banker.md) |
| Allocation | 当前已分配资源量 | [OS 3](../courses/operating-systems/chapter-03.md#s10) |
| 页号 / 页内偏移 | 分页地址的两部分，转换时保留页内偏移 | [OS 4](../courses/operating-systems/chapter-04.md#s4) · [地址转换](../labs/address.md) |
| TLB | 地址转换缓存 | [OS 4](../courses/operating-systems/chapter-04.md#s5) |
| FIFO | 先进先出：淘汰最早装入的页 | [OS 4](../courses/operating-systems/chapter-04.md#s10) · [置换练习](../labs/paging.md) |
| LRU | 最近最久未使用：淘汰最久未访问的页 | [OS 4](../courses/operating-systems/chapter-04.md#s10) |
| OPT | 最佳置换：淘汰未来最晚再用的页 | [OS 4](../courses/operating-systems/chapter-04.md#s10) |
| FAT | 文件分配表，保存簇链信息 | [OS 5](../courses/operating-systems/chapter-05.md#s5) |
| i 结点 | 保存文件属性与数据定位信息的结构 | [OS 5](../courses/operating-systems/chapter-05.md#s7) |
| SPOOLing | 假脱机，以磁盘队列暂存设备作业 | [OS 6](../courses/operating-systems/chapter-06.md#s6) |
| PC | 程序计数器，记录指令位置 | [CO 1](../courses/computer-organization/chapter-01.md#s4) |
| IR | 指令寄存器，暂存当前指令 | [CO 1](../courses/computer-organization/chapter-01.md#s4) |
| ISA | 指令集体系结构，规定机器级可见行为 | [CO 1](../courses/computer-organization/chapter-01.md#s3) |
| CPI | 每条指令平均消耗的时钟周期数 | [CO 1](../courses/computer-organization/chapter-01.md#s5) |
| BCD | 对十进制各数字分别编码的表示 | [CO 2](../courses/computer-organization/chapter-02.md#s1) |
| ALU | 算术逻辑单元 | [CO 2](../courses/computer-organization/chapter-02.md#s7) |
| 进位 / 有符号溢出 | 无符号输出进位与带符号范围越界，判断依据不同 | [CO 2](../courses/computer-organization/chapter-02.md#s7) · [补码练习](../labs/complement.md) |
| EA | 有效地址，由寻址方式确定 | [CO 3](../courses/computer-organization/chapter-03.md#s2) |
| RAW | 先写后读的真数据依赖，不能靠重命名消除 | [CO 4](../courses/computer-organization/chapter-04.md#s6) |
| SRAM | 静态随机存储器，通电保持电路状态 | [CO 5](../courses/computer-organization/chapter-05.md#s2) |
| DRAM | 动态随机存储器，靠电荷存储、需刷新 | [CO 5](../courses/computer-organization/chapter-05.md#s2) |
| Cache | 高速缓存，按块保存主存内容 | [CO 5](../courses/computer-organization/chapter-05.md#s5) · [映射练习](../labs/cache.md) |
| AMAT | 平均存储访问时间 | [CO 5](../courses/computer-organization/chapter-05.md#s5) |
| DMA | 直接存储器访问，由设备侧或专门引擎搬运数据 | [CO 6](../courses/computer-organization/chapter-06.md#s5) |
| IOMMU | I/O 存储管理单元，负责设备地址转换与隔离 | [CO 6](../courses/computer-organization/chapter-06.md#s5) |

## 计算机网络技术

| 术语 | 含义 | 章节 |
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

## 多媒体技术及应用 {#multimedia}

| 术语 | 含义 | 章节 |
| --- | --- | --- |
| 表示媒体 / 存储媒体 | 信息的表达形式 / 保存信息的实体 | [MM 1](../courses/multimedia-technology/chapter-01.md#s1) |
| 实时 / 顺序流式传输 | 本版按现场传输与顺序下载播放区分的方法 | [MM 1](../courses/multimedia-technology/chapter-01.md#s5) |
| 输入码 / 内部编码 / 字形 | 输入、计算机表示及显示输出的不同环节 | [MM 3](../courses/multimedia-technology/chapter-03.md#s2) |
| OCR | 从页图识别字符；仍需对照原页校对 | [MM 3](../courses/multimedia-technology/chapter-03.md#s6) |
| 像素尺寸 / ppi / dpi | 像素数量 / 每英寸像素数 / 设备每英寸点数 | [MM 4](../courses/multimedia-technology/chapter-04.md#s2) |
| 位深 / 像素数据量 | 每像素存储位数 / 指定条件下的像素总字节数 | [MM 4](../courses/multimedia-technology/chapter-04.md#s5) |
| 采样 / 量化 / 编码 | 时间取样 / 幅值离散化 / 数字表示 | [MM 5](../courses/multimedia-technology/chapter-05.md#s2) |
| PCM 数据量 | 未压缩采样数据；须给采样率、位数、声道和时长 | [MM 5](../courses/multimedia-technology/chapter-05.md#s3) |
| MIDI | 演奏相关消息，不直接等同波形采样 | [MM 5](../courses/multimedia-technology/chapter-05.md#s4) |
| 制式 / 编码 / 文件格式 | 信号组织 / 编码方法 / 文件组织 | [MM 6](../courses/multimedia-technology/chapter-06.md#s3) |
| 工程 / 输出 | 继续编辑的组织关系 / 面向使用端的交付结果 | [MM 6](../courses/multimedia-technology/chapter-06.md#s4) |
| 普通帧 / 关键帧 / 空白关键帧 | 延续内容 / 定义内容或变化 / 不继承左侧内容 | [MM 7](../courses/multimedia-technology/chapter-07.md#s5) |
| 动作补间 / 形状补间 | 实例等对象的属性变化 / 形状轮廓变化 | [MM 7](../courses/multimedia-technology/chapter-07.md#s6) |
| 文档相对路径 | 从当前文档目录解释的资源位置 | [MM 8](../courses/multimedia-technology/chapter-08.md#s4) |
| 导航图 / 屏幕脚本 | 内容关系和跳转 / 各屏内容、媒体及操作 | [MM 9](../courses/multimedia-technology/chapter-09.md#s5) |
