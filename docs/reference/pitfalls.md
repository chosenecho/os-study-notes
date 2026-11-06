# 易错点清单

## 操作系统概论

| 章节 | 易混概念 | 区别 |
| --- | --- | --- |
| [简介](../courses/operating-systems/chapter-01.md#s3) | 并发 / 并行 | 同一时段内推进 / 同一时刻执行 |
| [简介](../courses/operating-systems/chapter-01.md#s6) | 地址数 / 字节数 | 字节数 = 地址数 × 编址单位字节数 |
| [进程](../courses/operating-systems/chapter-02.md#s3) | 就绪 / 阻塞 | 等 CPU / 等事件或资源；唤醒后先就绪 |
| [同步](../courses/operating-systems/chapter-02.md#s10) | 互斥 / 条件等待 | mutex 保护访问；empty、full 记录空位与成品 |
| [调度](../courses/operating-systems/chapter-03.md#s3) | 周转 / 等待时间 | 无 I/O 时：等待 = 周转 − 服务时间 |
| [死锁](../courses/operating-systems/chapter-03.md#s9) | 不安全 / 已死锁 | 无完成保证 / 已形成无法推进的相互等待 |
| [内存](../courses/operating-systems/chapter-04.md#s5) | TLB 未命中 / 缺页 | 无缓存转换 / 合法页未驻留 |
| [置换](../courses/operating-systems/chapter-04.md#s10) | FIFO / LRU 命中 | 保留装入次序 / 更新最近使用次序 |
| [文件](../courses/operating-systems/chapter-05.md#s4) | 链查找 / 读盘次数 | 链指针可能已缓存；索引块另计 |
| [I/O](../courses/operating-systems/chapter-06.md#s2) | 进程阻塞 / DMA 争用 | 调度状态 / 硬件传输资源竞争 |

## 计算机组成原理

| 章节 | 易混概念 | 区别 |
| --- | --- | --- |
| [性能](../courses/computer-organization/chapter-01.md#s5) | 主频 / CPU 时间 | CPU 时间 = 动态指令数 × 平均 CPI ÷ 主频 |
| [运算](../courses/computer-organization/chapter-02.md#s7) | 加法进位 / 有符号溢出 | 无符号和越界 / 补码和越界 |
| [端序](../courses/computer-organization/chapter-02.md#s5) | 编码位序 / 字节端序 | 位串的解释 / 多字节值的存放次序 |
| [指令](../courses/computer-organization/chapter-03.md#s4) | 数组下标 / 字节偏移 | 字节偏移 = 下标 × 元素字节数 |
| [流水线](../courses/computer-organization/chapter-04.md#s4) | 吞吐率 / 单条延迟 | 单位时间完成量 / 一条指令用时 |
| [冒险](../courses/computer-organization/chapter-04.md#s6) | 转发 / 提前产生结果 | 转发仅传递已生成的数据 |
| [Cache](../courses/computer-organization/chapter-05.md#s5) | 主存块号 / 组号 | 组号 = 主存块号 mod 组数 |
| [总线](../courses/computer-organization/chapter-06.md#s3) | 峰值带宽 | 每次传输字节数 × 每秒传输次数 |
| [总线](../courses/computer-organization/chapter-06.md#s3) | 有效带宽 | 交付字节数 ÷ 事务总耗时 |

## 访存时间

完整未命中时间包含本次访问的全部耗时；额外惩罚只计算超出命中时间的部分。两种写法见[Cache 性能](../courses/computer-organization/chapter-05.md#s5)：

- 给额外惩罚 $P$：$AMAT=T_h+mP$。
- 给完整未命中时间 $T_m$：$AMAT=(1-m)T_h+mT_m$。

$m$ 为未命中率，$T_h$ 为命中时间，各时间量使用同一单位。[缺页平均耗时](../courses/operating-systems/chapter-04.md#s11)也按同样方式加权。

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

## 多媒体技术及应用 {#multimedia}

| 章节 | 易混概念 | 回查方式 |
| --- | --- | --- |
| [基础知识](../courses/multimedia-technology/chapter-01.md#s8) | 媒体角色、系统特征与应用领域 | 先确定对象与分类维度 |
| [计算机系统](../courses/multimedia-technology/chapter-02.md#s1) | 接线成功、设备可用与作品可用 | 沿采集到演播逐层检查 |
| [文本](../courses/multimedia-technology/chapter-03.md#s6) | 页图、OCR 字符与校对结果 | 对照原页检查文字和结构 |
| [图像](../courses/multimedia-technology/chapter-04.md#s5) | 像素数、物理尺寸与文件字节数 | 写 ppi、位深和开销条件 |
| [音频](../courses/multimedia-technology/chapter-05.md#s3) | bit/s、B/s 与 PCM 总量 | 单位先统一，压缩文件另判 |
| [视频](../courses/multimedia-technology/chapter-06.md#s3) | 帧与场、制式与编码、工程与影片 | 分类后分别核对输入与交付 |
| [动画](../courses/multimedia-technology/chapter-07.md#s10) | 完整帧数与首末时间戳间隔 | 明确计数、恒定帧率及导出范围 |
| [制作工具](../courses/multimedia-technology/chapter-08.md#s4) | 文档参照、映像生成与目标端运行 | 逐级算路径，逐环节登记验证 |
| [项目开发](../courses/multimedia-technology/chapter-09.md#s6) | 制作端预览与交付验收 | 保留版本、环境、预期和实际 |

旧软件任务按教材版本学习，缺少运行条件时保留待实测状态。已登记的 OCR 错误和原书疑点见对应正文，不据存疑数值编制唯一答案。
