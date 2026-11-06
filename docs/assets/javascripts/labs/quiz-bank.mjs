// Independently authored questions. IDs and optionIds are permanent; semantic changes bump revision.
export const questions = [
  {
    "id": 1,
    "course": "os",
    "chapter": 1,
    "prompt": "单核 CPU 上两个进程并发执行，意味着什么？",
    "options": [
      "两者每个时刻都同时占用 CPU",
      "两者的执行在一段时间内交错推进",
      "两者一定使用不同 CPU",
      "两者的执行顺序和速度完全固定"
    ],
    "answer": 1,
    "explanation": "并发描述一段时间内的推进关系；单核通过交替执行实现，并不等于同一时刻并行。 异步意味着推进节奏受调度与等待条件影响，并发不承诺固定顺序。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "1:0",
      "1:1",
      "1:2",
      "1:3"
    ],
    "sections": [
      3
    ],
    "origin": "original"
  },
  {
    "id": 2,
    "course": "os",
    "chapter": 1,
    "prompt": "采用多道批处理后，能否断言平均周转时间一定缩短？",
    "options": [
      "能，因为吞吐量总是等于周转时间的倒数",
      "不能，要看作业组合、调度和资源竞争",
      "能，因为每个作业都独占 CPU",
      "不能，因为多道程序一定降低吞吐量"
    ],
    "answer": 1,
    "explanation": "多道程序可提高资源利用率，但单个作业可能等待更久。吞吐量与平均周转时间是不同指标。 不能保证周转时间缩短，也不能反向断言吞吐量必然下降；应分别核对两个指标。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "2:0",
      "2:1",
      "2:2",
      "2:3"
    ],
    "sections": [
      2
    ],
    "origin": "original"
  },
  {
    "id": 3,
    "course": "os",
    "chapter": 2,
    "prompt": "某进程正在等待磁盘 I/O 完成，通常处于哪种状态？",
    "options": [
      "运行",
      "就绪",
      "阻塞",
      "挂起，且一定已被换出内存"
    ],
    "answer": 2,
    "explanation": "等待外部事件时处于阻塞态；I/O 完成后通常先回到就绪态，再等待调度。 阻塞说明等待事件，挂起涉及另一种管理条件；不能由 I/O 等待推出换出。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "3:0",
      "3:1",
      "3:2",
      "3:3"
    ],
    "sections": [
      3
    ],
    "origin": "original"
  },
  {
    "id": 4,
    "course": "os",
    "chapter": 2,
    "prompt": "按读、加、写可交错的模型，共享变量初值为 0，两个进程各做一次 counter++，无同步时可能得到什么？",
    "options": [
      "只能得到 2",
      "可能得到 1 或 2",
      "一定得到 0",
      "只能得到 1"
    ],
    "answer": 1,
    "explanation": "两者都先读到 0，再各自写入 1，会丢失一次更新；按顺序完成则得到 2。 先读再写可丢失更新，但若两个读加写过程顺序完成也能得到 2。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "4:0",
      "4:1",
      "4:2",
      "4:3"
    ],
    "sections": [
      1,
      9
    ],
    "origin": "original"
  },
  {
    "id": 5,
    "course": "os",
    "chapter": 3,
    "prompt": "单 CPU、无 I/O，RR 时间片为 2。仅 P1 就绪且还需运行 5 个时间单位，时间片到期后怎样？",
    "options": [
      "P1 必须空等其他进程到达",
      "P1 可以继续获得 CPU",
      "P1 必须阻塞",
      "P1 必须等待一次 I/O 完成后才可再运行"
    ],
    "answer": 1,
    "explanation": "没有其他就绪进程时，当前进程可继续运行；时间片到期并不自动产生等待事件。忽略调度开销。 题设没有 I/O，时间片耗尽只触发调度，不会凭空产生阻塞条件。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "5:0",
      "5:1",
      "5:2",
      "5:3"
    ],
    "sections": [
      4
    ],
    "origin": "original"
  },
  {
    "id": 6,
    "course": "os",
    "chapter": 3,
    "prompt": "银行家算法判定试分配后不安全，说明什么？",
    "options": [
      "系统此刻必然已经死锁",
      "当前无法保证所有进程按最大需求完成",
      "本次请求一定超过 Available",
      "所有进程一定无法按实际需求结束"
    ],
    "answer": 1,
    "explanation": "不安全表示找不到保证完成的安全序列，不等于已经死锁。请求可不超过 Available，却仍在试分配后不安全。 不安全针对最大需求的保证；实际后续需求若更少，仍可能完成。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "6:0",
      "6:1",
      "6:2",
      "6:3"
    ],
    "sections": [
      9,
      10
    ],
    "origin": "original"
  },
  {
    "id": 7,
    "course": "os",
    "chapter": 4,
    "prompt": "页大小为 1024 字节，逻辑地址为 2500，页号和页内偏移是多少？",
    "options": [
      "页号 2，偏移 452",
      "页号 3，偏移 452",
      "页号 2，偏移 500",
      "页号 2，偏移 451"
    ],
    "answer": 0,
    "explanation": "2500 = 2 × 1024 + 452。页号从 0 开始，偏移小于页大小。 按 0 编号，偏移直接取余数，不需要再减 1。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "7:0",
      "7:1",
      "7:2",
      "7:3"
    ],
    "sections": [
      4
    ],
    "origin": "original"
  },
  {
    "id": 8,
    "course": "os",
    "chapter": 4,
    "prompt": "FIFO 页面置换中，访问一个已经驻留的页，会怎样影响其淘汰次序？",
    "options": [
      "移到最新装入位置",
      "保持装入次序",
      "立即淘汰该页",
      "每次命中就把装入时间改为当前时间"
    ],
    "answer": 1,
    "explanation": "FIFO 根据装入时间，而不是最近访问时间；命中会改变 LRU 的使用记录，但不改变 FIFO 装入次序。 更新最近使用信息属于 LRU 的判断方向，FIFO 的装入次序保持不变。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "8:0",
      "8:1",
      "8:2",
      "8:3"
    ],
    "sections": [
      10
    ],
    "origin": "original"
  },
  {
    "id": 9,
    "course": "os",
    "chapter": 5,
    "prompt": "在没有目录项缓存的简化模型中，按绝对路径找文件，通常怎样处理？",
    "options": [
      "从根目录开始逐级查目录项",
      "只读文件最后一级名字即可",
      "先把整个磁盘内容读入内存",
      "从进程当前目录开始，不处理开头的根标记"
    ],
    "answer": 0,
    "explanation": "路径中的每一级提供下一级目录或目标文件的定位信息。实际磁盘访问次数仍取决于缓存、目录和索引结构。 当前目录用于解释相对路径；本题已指定绝对路径，应从根开始。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "9:0",
      "9:1",
      "9:2",
      "9:3"
    ],
    "sections": [
      3
    ],
    "origin": "original"
  },
  {
    "id": 10,
    "course": "os",
    "chapter": 5,
    "prompt": "一个索引块有 1024 字节，每个索引项占 3 字节，最多存多少个完整索引项？",
    "options": [
      "341",
      "342",
      "必须正好整除，否则完全不能用",
      "340，因为必须再预留一个索引项保存余数"
    ],
    "answer": 0,
    "explanation": "⌊1024 ÷ 3⌋ = 341，剩余 1 字节不能凑成完整表项；应按完整表项向下取整。 题目没有规定这种附加项；只按完整项数取整，不自行扣除容量。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "10:0",
      "10:1",
      "10:2",
      "10:3"
    ],
    "sections": [
      7
    ],
    "origin": "original"
  },
  {
    "id": 11,
    "course": "os",
    "chapter": 6,
    "prompt": "发起阻塞式 I/O 后，能否说整个 CPU 一定空闲？",
    "options": [
      "能，进程阻塞就等于 CPU 停机",
      "不能，CPU 可以运行其他就绪进程",
      "不能，因为阻塞进程仍占着 CPU 忙等",
      "不能，因为等待 I/O 的进程必须在 CPU 上运行中断处理"
    ],
    "answer": 1,
    "explanation": "阻塞描述进程状态。若有其他就绪进程，调度器可以切换执行；只有没有可运行任务等情况下 CPU 才可能空闲。 等待时不由该进程一直执行中断处理；外设完成后的中断是另一时点。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "11:0",
      "11:1",
      "11:2",
      "11:3"
    ],
    "sections": [
      4
    ],
    "origin": "original"
  },
  {
    "id": 12,
    "course": "os",
    "chapter": 6,
    "prompt": "DMA 方式下，哪项说法合适？",
    "options": [
      "CPU 完全不参与任何阶段",
      "DMA 控制器承担数据搬运，CPU 仍可能参与准备和完成处理",
      "所有系统中 Cache 都天然一致",
      "DMA 会自动绕过全部地址和访问权限检查"
    ],
    "answer": 1,
    "explanation": "DMA 减少 CPU 逐字搬运，但控制准备、完成通知以及缓存一致性处理仍依平台和接口而定。 搬运职责转给控制器不等于取消访问约束；仍需按系统条件准备合法传输。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "12:0",
      "12:1",
      "12:2",
      "12:3"
    ],
    "sections": [
      2
    ],
    "origin": "original"
  },
  {
    "id": 13,
    "course": "co",
    "chapter": 1,
    "prompt": "同一任务指令数为 10⁶，CPI 为 2，主频为 1 GHz，CPU 时间是多少？",
    "options": [
      "2 ms",
      "0.5 ms",
      "2 s",
      "0.002 ms"
    ],
    "answer": 0,
    "explanation": "CPU 时间 = 指令数 × CPI ÷ 主频 = 2 × 10⁶ ÷ 10⁹ s = 0.002 s。 0.002 的单位是秒，乘 1000 才得到 2 ms；结果必须连同单位转换。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "13:0",
      "13:1",
      "13:2",
      "13:3"
    ],
    "sections": [
      5
    ],
    "origin": "original"
  },
  {
    "id": 14,
    "course": "co",
    "chapter": 1,
    "prompt": "两个程序各运行一次，评价总完成时间时应首先比较什么？",
    "options": [
      "各程序耗时之和",
      "各程序耗时的几何平均",
      "只比较其中较短程序",
      "只比较两个程序 CPI 的算术平均"
    ],
    "answer": 0,
    "explanation": "工作负载明确为各运行一次时，总耗时是直接目标。归一化比值的几何平均可用于综合相对性能，但不代替该工作负载的实际耗时。 CPI 还要与指令数和频率组合才能得到时间；平均 CPI 不直接给出总耗时。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "14:0",
      "14:1",
      "14:2",
      "14:3"
    ],
    "sections": [
      5
    ],
    "origin": "original"
  },
  {
    "id": 15,
    "course": "co",
    "chapter": 2,
    "prompt": "8 位补码执行 100 + 40，哪个结论正确？",
    "options": [
      "结果 140，可直接用 8 位有符号数表示",
      "截断解释为 −116，并发生有符号溢出",
      "最高位为 1，所以两个输入都是负数",
      "截断为 −116，只发生无符号进位而无有符号溢出"
    ],
    "answer": 1,
    "explanation": "8 位补码范围为 −128 到 127。140 的低 8 位为 10001100，按补码解释为 −116，真实和超出范围。 100+40=140 未超过无符号 8 位上限 255，却超过有符号上限 127；进位与溢出不是同一判断。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "15:0",
      "15:1",
      "15:2",
      "15:3"
    ],
    "sections": [
      2,
      7
    ],
    "origin": "original"
  },
  {
    "id": 16,
    "course": "co",
    "chapter": 2,
    "prompt": "8 位补码 −3 为 11111101，算术右移一位后表示什么？",
    "options": [
      "−1",
      "−2",
      "126",
      "−6"
    ],
    "answer": 1,
    "explanation": "算术右移复制符号位，得到 11111110，即 −2。对负奇数不能直接当作向 0 截断的除法。 −6 对应扩大数值幅度的方向；本题右移复制符号位后应按新位串重新解释。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "16:0",
      "16:1",
      "16:2",
      "16:3"
    ],
    "sections": [
      2
    ],
    "origin": "original"
  },
  {
    "id": 17,
    "course": "co",
    "chapter": 3,
    "prompt": "一条指令的寻址方式主要用于确定什么？",
    "options": [
      "操作数或其有效地址的取得方式",
      "整个程序需要多少页框",
      "磁盘转速",
      "所有指令统一使用的执行周期数"
    ],
    "answer": 0,
    "explanation": "寻址方式说明怎样取得操作数或形成有效地址，与具体指令格式和体系结构有关。 寻址方式回答操作数在哪里及怎样取得，不直接规定固定执行时长。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "17:0",
      "17:1",
      "17:2",
      "17:3"
    ],
    "sections": [
      2
    ],
    "origin": "original"
  },
  {
    "id": 18,
    "course": "co",
    "chapter": 3,
    "prompt": "分析循环汇编时，最先核对哪组信息最有帮助？",
    "options": [
      "只数源代码行数",
      "初值、每轮更新、比较与跳转条件",
      "只看寄存器名字是否熟悉",
      "只核对位宽，忽略比较与跳转的位置"
    ],
    "answer": 1,
    "explanation": "循环次数依赖初值、步长和终止条件；还要检查比较发生在更新前还是更新后，不能只凭循环外观判断。 即使位宽已知，先比较还是先更新仍会影响循环次数，必须跟踪控制流。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "18:0",
      "18:1",
      "18:2",
      "18:3"
    ],
    "sections": [
      4
    ],
    "origin": "original"
  },
  {
    "id": 19,
    "course": "co",
    "chapter": 4,
    "prompt": "引入流水线，能否断言单条指令从开始到结束一定更快？",
    "options": [
      "能，流水级越多延迟一定越短",
      "不能，流水主要改善多条指令重叠时的吞吐率",
      "能，因为流水消除了所有相关",
      "不能，因为所有指令仍必须等前一条完全结束才启动"
    ],
    "answer": 1,
    "explanation": "流水寄存器、分段与停顿都会影响单条延迟。理想吞吐率改善不等于单条指令延迟必然缩短。 不能保证单条更快的原因不是取消重叠；流水正是让不同指令占用不同阶段。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "19:0",
      "19:1",
      "19:2",
      "19:3"
    ],
    "sections": [
      4
    ],
    "origin": "original"
  },
  {
    "id": 20,
    "course": "co",
    "chapter": 4,
    "prompt": "常见 load/store 数据通路中，sw 指令主要把什么写到哪里？",
    "options": [
      "寄存器中的数据写到存储器",
      "存储器数据写回目的寄存器",
      "把 PC 的值作为每条指令结果写回",
      "把存储器读取的数据写进基址寄存器"
    ],
    "answer": 0,
    "explanation": "sw 是存储指令，通常读取地址基址寄存器和待写数据寄存器，把数据写入有效地址指向的存储单元，不做通用目的寄存器写回。 基址寄存器参与形成地址；sw 的数据方向是寄存器到存储器，不能与 load 写回混淆。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "20:0",
      "20:1",
      "20:2",
      "20:3"
    ],
    "sections": [
      3
    ],
    "origin": "original"
  },
  {
    "id": 21,
    "course": "co",
    "chapter": 5,
    "prompt": "直接映射 Cache 有 4 行、块大小 16 字节，字节地址 64 对应哪一行？",
    "options": [
      "第 0 行",
      "第 1 行",
      "第 4 行",
      "第 3 行"
    ],
    "answer": 0,
    "explanation": "主存块号 = 64 ÷ 16 = 4，行号 = 4 mod 4 = 0。行号与块号不同。 行号从 0 开始，块号 4 对 4 取余是 0，不是将块号减 1。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "21:0",
      "21:1",
      "21:2",
      "21:3"
    ],
    "sections": [
      5
    ],
    "origin": "original"
  },
  {
    "id": 22,
    "course": "co",
    "chapter": 5,
    "prompt": "直接映射 Cache 中两个不同主存块落到同一行，会怎样？",
    "options": [
      "因为行号相同，所以一定命中",
      "还要比较有效位和标记，可能发生冲突替换",
      "两块一定能同时保存在该行",
      "只要标记相同即可忽略有效位"
    ],
    "answer": 1,
    "explanation": "一行只能保存一个块；行号选中候选位置，有效位与标记决定是否命中。 无效行即使残留同样标记也不能视为命中；两个条件须同时满足。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "22:0",
      "22:1",
      "22:2",
      "22:3"
    ],
    "sections": [
      5
    ],
    "origin": "original"
  },
  {
    "id": 23,
    "course": "co",
    "chapter": 6,
    "prompt": "所有 RAID 级别都能容忍一块磁盘损坏吗？",
    "options": [
      "能，RAID 这个名字就保证冗余",
      "不能，例如 RAID 0 没有冗余",
      "能，条带化就等于备份",
      "不能，因为任何带校验的 RAID 也都不具容错能力"
    ],
    "answer": 1,
    "explanation": "RAID 0 仅做条带化，没有容错冗余。其他级别的容错能力也需按具体组织判断；RAID 不代替独立备份。 反例 RAID 0 足以否定全称命题，不能据此把所有其他级别的冗余作用一并否定。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "23:0",
      "23:1",
      "23:2",
      "23:3"
    ],
    "sections": [
      2
    ],
    "origin": "original"
  },
  {
    "id": 24,
    "course": "co",
    "chapter": 6,
    "prompt": "计算总线峰值传输率时，哪一组信息直接相关？",
    "options": [
      "每次传输的数据位数、传输频率与每周期传输次数",
      "只看 CPU 主频",
      "只看内存总容量",
      "地址线位数乘 CPU 主频"
    ],
    "answer": 0,
    "explanation": "峰值数据率可按每次字节数 × 每秒传输次数估算，并核对是否每周期多次传输。实际有效带宽还受协议、等待等开销影响。 地址线宽决定可区分地址数，不能代替每次搬运的数据位数；总线频率也不必等于 CPU 主频。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "24:0",
      "24:1",
      "24:2",
      "24:3"
    ],
    "sections": [
      3
    ],
    "origin": "original"
  },
  {
    "id": 25,
    "course": "cn",
    "chapter": 1,
    "prompt": "仅提高链路发送速率，哪一项不会因此按同比例缩短？",
    "options": [
      "同一分组的发送时间",
      "同距离、同传播速度下的传播时间",
      "把同样位数推入链路的时间",
      "传播延迟会减少到原来的一半，不论发送速率提高多少"
    ],
    "answer": 1,
    "explanation": "传播时间取决于距离与传播速度。发送速率提高改变发送时间，不能把两种延迟混成一个量。 在距离和传播速度固定时，传播延迟不变；其计算式中没有发送速率。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "25:0",
      "25:1",
      "25:2",
      "25:3"
    ],
    "sections": [
      4
    ],
    "origin": "original"
  },
  {
    "id": 26,
    "course": "cn",
    "chapter": 1,
    "prompt": "一间机房同时被描述为“有线、专用、局域网”，应怎样判断？",
    "options": [
      "标签互相矛盾",
      "分别依据介质、用途所有权和范围，可以并存",
      "只能保留范围分类",
      "只有公用网才可能采用有线传输"
    ],
    "answer": 1,
    "explanation": "网络存在多种分类维度。有线、专用与局域网分别回答不同问题，并不要求在三者之间单选。 所有权与介质彼此独立，专用网络也能使用双绞线或光纤。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "26:0",
      "26:1",
      "26:2",
      "26:3"
    ],
    "sections": [
      2
    ],
    "origin": "original"
  },
  {
    "id": 27,
    "course": "cn",
    "chapter": 2,
    "prompt": "6 kHz 抽样、每样本固定 10 bit、不计开销时，PCM 输出码率为多少？",
    "options": [
      "60 kbit/s",
      "6 kbit/s",
      "600 bit/s",
      "60000 B/s"
    ],
    "answer": 0,
    "explanation": "每秒 6000 个样本，每个 10 bit，得到 60000 bit/s。样本频率与每样本位数要相乘。 6000×10 得到的是 bit/s，换成 B/s 还需除以 8，不能只替换单位标签。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "27:0",
      "27:1",
      "27:2",
      "27:3"
    ],
    "sections": [
      6
    ],
    "origin": "original"
  },
  {
    "id": 28,
    "course": "cn",
    "chapter": 2,
    "prompt": "一个偶校验码字有两个位同时翻转，哪种判断正确？",
    "options": [
      "一定检出且定位",
      "可能仍满足偶校验，不能据通过断定无错",
      "校验位会自动恢复原数据",
      "只要校验位本身没翻转，就一定检出"
    ],
    "answer": 1,
    "explanation": "偶数个位翻转可能保持 1 的个数的奇偶性。单个奇偶校验位既不能保证检出这种情况，也不能定位纠正。 任意两个位翻转都可能保持整体奇偶性，包括两个数据位；不能只检查校验位。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "28:0",
      "28:1",
      "28:2",
      "28:3"
    ],
    "sections": [
      9
    ],
    "origin": "original"
  },
  {
    "id": 29,
    "course": "cn",
    "chapter": 3,
    "prompt": "TCP 从序号 4001 起连续收到 300 B 数据，下一个期望字节为多少？",
    "options": [
      "4300",
      "4301",
      "4002",
      "4302"
    ],
    "answer": 1,
    "explanation": "TCP 按字节编号。4001 到 4300 共 300 字节，累积确认指向下一个期望字节 4301。 4001 已经是题设首个数据字节，不再额外加入 SYN 占号；下一期望为 4001+300。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "29:0",
      "29:1",
      "29:2",
      "29:3"
    ],
    "sections": [
      5
    ],
    "origin": "original"
  },
  {
    "id": 30,
    "course": "cn",
    "chapter": 3,
    "prompt": "接收窗口与拥塞窗口分别主要约束什么？",
    "options": [
      "前者接收缓存，后者网络承载能力",
      "两者都只表示应用文件大小",
      "前者路由表，后者 MAC 表",
      "前者限制网络负载，后者限制接收缓存"
    ],
    "answer": 0,
    "explanation": "流量控制保护接收端能力，拥塞控制调节对网络的负担。发送量可能同时受两类窗口限制。 这把两种窗口的保护对象颠倒；还须扣除已在途且未确认的数据才能算可新增发送量。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "30:0",
      "30:1",
      "30:2",
      "30:3"
    ],
    "sections": [
      6,
      7
    ],
    "origin": "original"
  },
  {
    "id": 31,
    "course": "cn",
    "chapter": 4,
    "prompt": "交换机从端口 2 收到源 A、目的 B 的帧，学习地址位置时看什么？",
    "options": [
      "目的 B 与任意空端口",
      "源 A 与入端口 2",
      "只看 IP 前缀",
      "目的 B 与入端口 2"
    ],
    "answer": 1,
    "explanation": "交换机以源地址和入端口学习 A 的位置，再以目的地址 B 查转发表；学习与转发使用的地址角色不同。 把未知目的绑定入端口会学错位置；能由收到的帧确定的是源 A 的方向。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "31:0",
      "31:1",
      "31:2",
      "31:3"
    ],
    "sections": [
      4
    ],
    "origin": "original"
  },
  {
    "id": 32,
    "course": "cn",
    "chapter": 4,
    "prompt": "两台交换机均创建 VLAN 20，Trunk 却不允许 VLAN 20，能否只凭创建成功保证跨交换机通信？",
    "options": [
      "能，VLAN 名称会自动打通链路",
      "不能，还需核对端口成员和中继许可等条件",
      "能，只要双方电源正常",
      "只需把两端 VLAN 20 改成相同名称"
    ],
    "answer": 1,
    "explanation": "VLAN 定义、端口成员和中继承载是不同配置。存在相同 VID 不能代替互联链路的正确配置。 VID、成员和承载配置才决定本题逻辑范围；相同名称不能修复 Trunk 许可缺失。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "32:0",
      "32:1",
      "32:2",
      "32:3"
    ],
    "sections": [
      5,
      6
    ],
    "origin": "original"
  },
  {
    "id": 33,
    "course": "cn",
    "chapter": 5,
    "prompt": "172.18.40.147/26 所属网络地址是什么？",
    "options": [
      "172.18.40.0",
      "172.18.40.128",
      "172.18.40.192",
      "172.18.40.147"
    ],
    "answer": 1,
    "explanation": "/26 最后字节掩码为 192，147 与 192 按位与为 128。地址块为 128 到 191。 该值仍含主机位，是接口地址；求网络地址必须清零 6 位主机部分。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "33:0",
      "33:1",
      "33:2",
      "33:3"
    ],
    "sections": [
      4
    ],
    "origin": "original"
  },
  {
    "id": 34,
    "course": "cn",
    "chapter": 5,
    "prompt": "目的地址同时匹配 /16、/22、/25 三项，应首先按何原则选项？",
    "options": [
      "取表中最先出现者",
      "取匹配项中前缀最长的 /25",
      "总用默认路由",
      "取覆盖地址最多的 /16"
    ],
    "answer": 1,
    "explanation": "最长前缀匹配在成功匹配的路由中选最具体的一项；不能用存放顺序或地址类别替代前缀比较。 覆盖越大通常越不具体；最长匹配选择更精确的 /25，而非最大地址块。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "34:0",
      "34:1",
      "34:2",
      "34:3"
    ],
    "sections": [
      7
    ],
    "origin": "original"
  },
  {
    "id": 35,
    "course": "cn",
    "chapter": 6,
    "prompt": "HTTP 无状态是否意味着每个请求必须新建 TCP 连接？",
    "options": [
      "是，无状态等于没有任何连接",
      "否，业务状态与连接是否复用是两个问题",
      "是，所以 HTTP 不能用 TCP",
      "否，因为所有请求天然共享服务器购物车"
    ],
    "answer": 1,
    "explanation": "HTTP 的业务状态与持续连接不是同一概念。本课程基于 TCP 的模型仍可用持续连接承载多个交互。 不必新建 TCP 的结论与购物车无关；业务会话仍需应用机制建立和关联。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "35:0",
      "35:1",
      "35:2",
      "35:3"
    ],
    "sections": [
      5
    ],
    "origin": "original"
  },
  {
    "id": 36,
    "course": "cn",
    "chapter": 6,
    "prompt": "服务器保存购物车，浏览器保存会话标识，怎样理解？",
    "options": [
      "Session 与 Cookie 可配合关联请求",
      "两者互斥，不能同时存在",
      "浏览器有标识就自动有加密",
      "Session 的全部购物车内容必须复制到 Cookie"
    ],
    "answer": 0,
    "explanation": "Session 保存服务端状态，Cookie 可以带回关联标识。状态位置不同而可协作；标识存在不自动保证保密。 可只传标识，由服务器查询状态；不要求把服务端会话内容完整复制给客户端。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "36:0",
      "36:1",
      "36:2",
      "36:3"
    ],
    "sections": [
      6
    ],
    "origin": "original"
  },
  {
    "id": 37,
    "course": "cn",
    "chapter": 7,
    "prompt": "Get 轮询与 Trap 通报的发起方向分别是？",
    "options": [
      "都只能由代理发起",
      "Get 由管理站、Trap 由代理发起",
      "Get 由代理、Trap 由管理站发起",
      "都只能由管理站发起"
    ],
    "answer": 1,
    "explanation": "轮询从管理站读取开始，Trap 从代理报告事件开始。两者可以配合监控，不能将事件通报当作轮询本身。 Trap 的特点正是代理主动报告事件；有 Get 轮询不代表所有管理报文同向。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "37:0",
      "37:1",
      "37:2",
      "37:3"
    ],
    "sections": [
      5
    ],
    "origin": "original"
  },
  {
    "id": 38,
    "course": "cn",
    "chapter": 7,
    "prompt": "SMI 与 MIB 的对应关系是什么？",
    "options": [
      "SMI 规定描述规则，MIB 组织被管对象信息",
      "SMI 是一台设备，MIB 是网线",
      "二者都表示某次查询的请求编号",
      "SMI 保存接口当前计数，MIB 规定变量编码规则"
    ],
    "answer": 0,
    "explanation": "SMI 处理命名、类型和表示，MIB 是管理对象信息集合；具体请求还要用请求标识等字段关联。 这把描述规则与对象信息的角色倒置；需把类型、命名规则和实例值分开。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "38:0",
      "38:1",
      "38:2",
      "38:3"
    ],
    "sections": [
      2,
      5
    ],
    "origin": "original"
  },
  {
    "id": 39,
    "course": "cn",
    "chapter": 8,
    "prompt": "本地账户与域账户的主要管理位置分别是？",
    "options": [
      "本机安全数据库与域目录服务",
      "同一浏览器 Cookie 文件",
      "交换机 MAC 表与 IP 路由表",
      "域账户只保存在每台成员机各自的 SAM 中"
    ],
    "answer": 0,
    "explanation": "本地账户由本机管理，域账户在域目录服务范围管理。身份来源要与资源授权条件分别分析。 教材模型中域账户由域目录服务管理，本地 SAM 负责本机账户，不能混为独立副本。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "39:0",
      "39:1",
      "39:2",
      "39:3"
    ],
    "sections": [
      5
    ],
    "origin": "original"
  },
  {
    "id": 40,
    "course": "cn",
    "chapter": 8,
    "prompt": "把一个域直接等同一个物理站点，是否准确？",
    "options": [
      "准确，两者都是一条线缆",
      "不准确，域是逻辑管理，站点反映物理连接",
      "准确，OU 只是另一种网线",
      "准确，因为一个域只允许一个 IP 子网"
    ],
    "answer": 1,
    "explanation": "域与站点描述不同维度，一个域可以跨站点，站点也可涉及多个域；不能把子网、楼宇和域机械等同。 逻辑管理边界不由单一子网固定，一个域可以跨物理站点组织成员。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "40:0",
      "40:1",
      "40:2",
      "40:3"
    ],
    "sections": [
      6
    ],
    "origin": "original"
  },
  {
    "id": 41,
    "course": "cn",
    "chapter": 9,
    "prompt": "看见 IPsec AH 就能认定内容已被加密吗？",
    "options": [
      "能，AH 这个名称本身即表示保密",
      "不能，AH 本身不负责内容加密",
      "能，所有网络层字段都会隐藏",
      "不能，因为 AH 连完整性检查也不提供"
    ],
    "answer": 1,
    "explanation": "AH 提供鉴别与完整性等保护，不负责内容加密。应核对实际采用的机制和保护范围，不能只凭名称推断。 否定保密能力不等于否定鉴别与完整性保护，应分别核对安全目标。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "41:0",
      "41:1",
      "41:2",
      "41:3"
    ],
    "sections": [
      6
    ],
    "origin": "original"
  },
  {
    "id": 42,
    "course": "cn",
    "chapter": 9,
    "prompt": "A 要让 B 验证由 A 签署的内容，公钥签名模型中采用什么方向？",
    "options": [
      "A 私钥签名，A 公钥验证",
      "B 私钥签名，A 公钥验证",
      "用双方 MAC 地址当签名密钥",
      "A 公钥签名，A 私钥验证"
    ],
    "answer": 0,
    "explanation": "公钥签名用签署者私钥生成、相应公钥验证。保密发送给 B 则是另一任务，不能把两个密钥方向混用。 签署者应独自掌握生成签名的私钥，验证方使用公钥，方向不能颠倒。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "42:0",
      "42:1",
      "42:2",
      "42:3"
    ],
    "sections": [
      3,
      5
    ],
    "origin": "original"
  },
  {
    "id": 43,
    "course": "mm",
    "chapter": 1,
    "prompt": "导览内容保存在存储卡中。按媒体分类，存储卡主要属于哪一类？",
    "options": [
      "存储媒体",
      "感觉媒体",
      "表示媒体",
      "传输媒体"
    ],
    "answer": 0,
    "explanation": "分类时先确定观察对象。这里问的是承载数据的存储实体，而不是用户感官或文本、图像等信息表示。 存储卡在题设中负责保存，不是正在跨地点传送信号的通道；分类须看具体角色。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "43:0",
      "43:1",
      "43:2",
      "43:3"
    ],
    "sections": [
      1
    ],
    "origin": "original"
  },
  {
    "id": 44,
    "course": "mm",
    "chapter": 1,
    "prompt": "流媒体在尚未接收全部文件时开始播放，首先依赖什么组织方式？",
    "options": [
      "边接收、缓存、边播放",
      "必须先下载完整文件",
      "完全取消网络传输",
      "无需任何缓存，任意网络速率下均连续播放"
    ],
    "answer": 0,
    "explanation": "流媒体通过接收、缓存和播放的配合提供连续内容。能提前开始播放不意味着不需要网络、缓冲或足够传输条件。 提前播放仍受到达速度和缓冲条件限制，流式组织不保证任意链路无停顿。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "44:0",
      "44:1",
      "44:2",
      "44:3"
    ],
    "sections": [
      5
    ],
    "origin": "original"
  },
  {
    "id": 45,
    "course": "mm",
    "chapter": 2,
    "prompt": "模拟旁白送入计算机成为可编辑数字音频，声卡在此链路主要承担什么？",
    "options": [
      "信号转换与音频输入输出",
      "只保存显示器像素",
      "替代所有外围设备",
      "只在播放时输出，录音时不参与转换"
    ],
    "answer": 0,
    "explanation": "声卡负责相应音频输入输出及信号转换。要沿信息路径确定板卡职责，不能把显示、存储和音频功能混为一项。 题设是模拟声音进入主机，需音频输入和数字化，不能只检查输出方向。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "45:0",
      "45:1",
      "45:2",
      "45:3"
    ],
    "sections": [
      3
    ],
    "origin": "original"
  },
  {
    "id": 46,
    "course": "mm",
    "chapter": 2,
    "prompt": "某创作平台无法识别音频设备，为什么还要检查操作系统和驱动？",
    "options": [
      "应用依赖系统及设备支持",
      "平台可直接取消全部驱动",
      "只要改文件名即可",
      "设备已插线就能证明所有软件层均已可用"
    ],
    "answer": 0,
    "explanation": "应用软件、操作系统和设备支持处在不同层次。创作平台需要可用的运行与设备环境，不能由一个应用名称推断整个链路已正常。 物理连接不能证明驱动匹配或系统已向应用暴露可用设备，应逐层核对。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "46:0",
      "46:1",
      "46:2",
      "46:3"
    ],
    "sections": [
      7,
      8
    ],
    "origin": "original"
  },
  {
    "id": 47,
    "course": "mm",
    "chapter": 3,
    "prompt": "键盘输入码、汉字内部表示和字形显示的关系，应怎样辨认？",
    "options": [
      "输入、内部编码和字形属于不同环节",
      "输入码就是屏幕上的点阵",
      "三者必定是同一个数字",
      "更换字体必然改变所选字符的内部编码"
    ],
    "answer": 0,
    "explanation": "输入码用于输入，内部编码用于计算机表示，字形用于显示或输出。解题先定位环节，不能把键盘操作直接等同字形数据。 字形和字体属于显示层；相同字符改字体不等于改变内部字符身份。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "47:0",
      "47:1",
      "47:2",
      "47:3"
    ],
    "sections": [
      2
    ],
    "origin": "original"
  },
  {
    "id": 48,
    "course": "mm",
    "chapter": 3,
    "prompt": "OCR 输出没有乱码，是否足以认定已终校？",
    "options": [
      "足够，字符能显示就是准确",
      "不足，还需对照原稿核对结构与字词",
      "足够，不必检查表格",
      "足够，只要 OCR 软件没有标出可疑字"
    ],
    "answer": 1,
    "explanation": "可显示只证明文本能够呈现，不能保证识别准确。终校还应对照扫描件核对文字、标点、公式、表格和阅读顺序。 未被标疑只是软件没有报告，仍可能有错识或漏行，应按原稿核对。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "48:0",
      "48:1",
      "48:2",
      "48:3"
    ],
    "sections": [
      6
    ],
    "origin": "original"
  },
  {
    "id": 49,
    "course": "mm",
    "chapter": 4,
    "prompt": "展板标志要反复缩放并修改轮廓，哪种表示更便于按几何对象组织？",
    "options": [
      "矢量图形",
      "只保留平面截图",
      "把图形改名为照片",
      "固定像素截图不断放大即可恢复任意精细轮廓"
    ],
    "answer": 0,
    "explanation": "矢量图形按几何对象及参数组织。照片的纹理通常按像素表示，文件名称变化不会自动改变实际的数据表示结构。 放大已有像素不会补回几何信息；可编辑轮廓需要按对象及参数组织。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "49:0",
      "49:1",
      "49:2",
      "49:3"
    ],
    "sections": [
      1
    ],
    "origin": "original"
  },
  {
    "id": 50,
    "course": "mm",
    "chapter": 4,
    "prompt": "640×480 像素、16 位，忽略全部开销的未压缩像素数据量是多少？",
    "options": [
      "614400 B",
      "9830400 B",
      "614400 bit",
      "307200 B"
    ],
    "answer": 0,
    "explanation": "像素数为640×480，每像素16÷8=2字节，乘积为614400字节。这只是像素数据，不是任意压缩图像文件的实际长度。 640×480 是像素数，16 位相当于每像素 2 B，不能按每像素 1 B 计算。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "50:0",
      "50:1",
      "50:2",
      "50:3"
    ],
    "sections": [
      2,
      5
    ],
    "origin": "original"
  },
  {
    "id": 51,
    "course": "mm",
    "chapter": 5,
    "prompt": "每秒采样次数和每个样本的量化位数分别约束什么？",
    "options": [
      "时间取样密度与幅值表示",
      "二者都只表示声道数",
      "二者都只表示歌曲时长",
      "时间取样密度与声道的数量"
    ],
    "answer": 0,
    "explanation": "采样频率描述时间上的取样密度，量化位数影响幅值离散表示。它们都不能代替声道数、时长或压缩后的码率。 量化位数决定幅值表示级数，声道数量是另一个独立参数。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "51:0",
      "51:1",
      "51:2",
      "51:3"
    ],
    "sections": [
      2
    ],
    "origin": "original"
  },
  {
    "id": 52,
    "course": "mm",
    "chapter": 5,
    "prompt": "10000次/秒、8位、单声道、2秒的未压缩PCM，仅采样数据占多少？",
    "options": [
      "20000 B",
      "160000 B",
      "20000 KiB",
      "10000 B"
    ],
    "answer": 0,
    "explanation": "按10000×8×1×2÷8计算为20000字节。每秒数据量为10000 B，题设持续2秒，因此总量为20000 B；选10000 B会漏乘时长。题目仅计未压缩PCM采样数据，忽略文件头等开销，不能直接套到任意压缩文件。",
    "revision": 2,
    "legacyRevision": 1,
    "optionIds": [
      "52:0",
      "52:1",
      "52:2",
      "52:3"
    ],
    "sections": [
      3
    ],
    "origin": "original"
  },
  {
    "id": 53,
    "course": "mm",
    "chapter": 6,
    "prompt": "把字幕放进时间线并调整片段顺序，说明完成了哪个环节？",
    "options": [
      "进行了内容编辑",
      "已经确定所有编码参数",
      "已经验证最终交付环境",
      "已将影片导出成目标播放文件"
    ],
    "answer": 0,
    "explanation": "字幕和顺序属于编辑内容。压缩参数、影片输出与独立播放验证是其他环节，不能从一次时间线操作推断全部完成。 时间线编辑和输出是不同阶段，还应选择输出条件并独立验证结果。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "53:0",
      "53:1",
      "53:2",
      "53:3"
    ],
    "sections": [
      3
    ],
    "origin": "original"
  },
  {
    "id": 54,
    "course": "mm",
    "chapter": 6,
    "prompt": "交付时只给了剪辑工程文件，应首先补查什么？",
    "options": [
      "关联素材及影片输出是否齐全",
      "文件名是否最长",
      "是否删除全部源素材",
      "只要工程能在原机打开，就不必检查交付环境"
    ],
    "answer": 0,
    "explanation": "工程用于继续编辑，可能引用外部素材。交付还需确认素材、输出文件和目标环境播放结果，保存工程不等于生成可用发行影片。 原机可能仍能访问本地素材；需在交付环境核对素材与输出，不能以原机替代。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "54:0",
      "54:1",
      "54:2",
      "54:3"
    ],
    "sections": [
      4
    ],
    "origin": "original"
  },
  {
    "id": 55,
    "course": "mm",
    "chapter": 7,
    "prompt": "共72帧按18帧/秒完整播放一次，在恒定帧率下时长是多少？",
    "options": [
      "4秒",
      "18秒",
      "1296秒",
      "约 3.94 秒，必须扣去第一帧"
    ],
    "answer": 0,
    "explanation": "按题目给出的完整帧计数，时长为72÷18=4秒。计算需说明帧数与帧率，画面是否重复不会自行删除时间轴中的帧。 题设明确按 72 个完整帧时长计，不能改成首末帧时间戳间隔的 71/18 秒。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "55:0",
      "55:1",
      "55:2",
      "55:3"
    ],
    "sections": [
      5,
      10
    ],
    "origin": "original"
  },
  {
    "id": 56,
    "course": "mm",
    "chapter": 7,
    "prompt": "让轮廓逐渐变形，与只让实例沿路径移动，为什么要分开设计？",
    "options": [
      "形状变化与位置变化的控制条件不同",
      "二者只靠重命名图层即可",
      "所有动画都不需要关键帧",
      "只需改变帧率，就能同时决定轮廓与运动路径"
    ],
    "answer": 0,
    "explanation": "形状补间处理轮廓变化，路径运动处理位置轨迹，还要分别检查对象条件和关键帧。需要局部显露时，另有遮罩控制任务。 帧率改变时间密度，不定义轮廓对应或几何轨迹；仍需分别设计变化。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "56:0",
      "56:1",
      "56:2",
      "56:3"
    ],
    "sections": [
      6,
      7
    ],
    "origin": "original"
  },
  {
    "id": 57,
    "course": "mm",
    "chapter": 8,
    "prompt": "根目录下pages/map.html引用assets/icon.png，使用文档相对路径应写哪一项？",
    "options": [
      "../assets/icon.png",
      "assets/icon.png",
      "pages/assets/icon.png",
      "../../assets/icon.png"
    ],
    "answer": 0,
    "explanation": "当前文档位于pages，先回到根目录再进入assets，因此使用../assets/icon.png。文档移动后应按新的参照位置重新核对路径。 当前文档只在根目录下一级，回退一次即可；回退两次超出题设站点根层级。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "57:0",
      "57:1",
      "57:2",
      "57:3"
    ],
    "sections": [
      4
    ],
    "origin": "original"
  },
  {
    "id": 58,
    "course": "mm",
    "chapter": 8,
    "prompt": "图像编辑器与多媒体创作平台的选型，应该先比较什么？",
    "options": [
      "作品需要的媒体组织和交互能力",
      "只比较软件名称长度",
      "只看能否打开一张图片",
      "只比较可导出的静态图片分辨率"
    ],
    "answer": 0,
    "explanation": "平台选型须对应作品结构、媒体组合、控制和发布等任务。能编辑单张图像只覆盖一个素材环节，不能证明可完成整个交互作品。 分辨率覆盖素材输出的一部分，无法证明页面导航、媒体编排和交互控制能力。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "58:0",
      "58:1",
      "58:2",
      "58:3"
    ],
    "sections": [
      1,
      2
    ],
    "origin": "original"
  },
  {
    "id": 59,
    "course": "mm",
    "chapter": 9,
    "prompt": "内容错字、按钮难找和异机无法播放，应怎样进入测试记录？",
    "options": [
      "分别核查内容、可用性和兼容性",
      "统一标记为已通过",
      "只记录文件是否存在",
      "都归为性能问题，保留一个“失败”就足够"
    ],
    "answer": 0,
    "explanation": "测试应按问题维度记录条件、预期和实际结果。内容正确、操作可用与运行兼容需要分别检查，一个入口能打开无法覆盖所有问题。 记录应保留问题维度、环境与复现条件，混合成一项会丢失修复与复测依据。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "59:0",
      "59:1",
      "59:2",
      "59:3"
    ],
    "sections": [
      3
    ],
    "origin": "original"
  },
  {
    "id": 60,
    "course": "mm",
    "chapter": 9,
    "prompt": "客户确认后新增片段，排期与估价应如何处理？",
    "options": [
      "登记变更并核对受影响任务与资源",
      "把人数翻倍直接写成工期减半",
      "保持原估价并删除变更记录",
      "只重新估算编码时间，其余交付日期保持不变"
    ],
    "answer": 0,
    "explanation": "范围变化会影响任务、素材、测试和交付安排，应留下确认与版本记录后重新估算。人员、时间和资金不是无条件线性互换的数量。 新增片段还会影响素材、确认、测试和发布等依赖，不能只改一项编码估算。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "60:0",
      "60:1",
      "60:2",
      "60:3"
    ],
    "sections": [
      4,
      6
    ],
    "origin": "original"
  },
  {
    "id": 61,
    "course": "mm",
    "chapter": 1,
    "prompt": "导览系统按访客选择改变后续内容，“交互性”在这里主要表现为什么？",
    "options": [
      "媒体全部改成静态图像",
      "用户操作影响系统响应和内容路径",
      "只把多个文件放进同一文件夹",
      "必须按唯一顺序播放"
    ],
    "answer": 1,
    "explanation": "访客选择是输入，系统据此改变响应或内容路径，体现交互性。多种素材共同出现涉及多样性与集成，不能仅由文件数量认定已经实现交互。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "61:0",
      "61:1",
      "61:2",
      "61:3"
    ],
    "sections": [
      3,
      4
    ],
    "origin": "original"
  },
  {
    "id": 62,
    "course": "mm",
    "chapter": 1,
    "prompt": "复习发展阶段与发展趋势时，怎样整理材料才能避免把二者混为同一分类？",
    "options": [
      "把所有软件名称按字母排列",
      "把趋势当作准确发布日期",
      "阶段按教材历程与事件整理，趋势按技术变化方向整理",
      "只凭设备售价确定阶段"
    ],
    "answer": 2,
    "explanation": "教材按历程组织阶段，并列出集成化、智能化、嵌入化、网络化等趋势。判断阶段要联系该版教材事件；描述趋势是在说明变化方向，不能把方向名称当成年份或产品发布日期。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "62:0",
      "62:1",
      "62:2",
      "62:3"
    ],
    "sections": [
      6,
      7
    ],
    "origin": "original"
  },
  {
    "id": 63,
    "course": "mm",
    "chapter": 2,
    "prompt": "普通个人计算机增加适用的多媒体软硬件后用于制作作品，最合适的判断是什么？",
    "options": [
      "可按多媒体个人计算机理解，再检查各环节能力",
      "已经必然成为专为一项任务设计的专用系统",
      "显示器较大就等于输入设备齐全",
      "只需查主机名称，不必检查软件"
    ],
    "answer": 0,
    "explanation": "多媒体个人计算机是在普通计算机基础上配置多媒体能力。是否满足制作需求仍要沿采集、加工、存储、集成与演播检查，增加设备不自动等于为特定用途专门设计的系统。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "63:0",
      "63:1",
      "63:2",
      "63:3"
    ],
    "sections": [
      1,
      2
    ],
    "origin": "original"
  },
  {
    "id": 64,
    "course": "mm",
    "chapter": 2,
    "prompt": "把纸质说明转成可编辑文字，再印成校样，哪组设备与任务匹配？",
    "options": [
      "音箱负责扫描，硬盘负责打印",
      "显示器同时完成纸张采集和实体打印",
      "打印机负责字符识别，扫描仪负责扬声",
      "扫描仪获取页面，识别与编辑软件处理文字，打印机输出校样"
    ],
    "answer": 3,
    "explanation": "扫描仪属于输入设备，先获得页面图像；可编辑文字还需识别与处理。打印机负责实体输出，存储设备负责保存。输入、处理、存储和输出承担不同任务。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "64:0",
      "64:1",
      "64:2",
      "64:3"
    ],
    "sections": [
      4,
      5,
      6
    ],
    "origin": "original"
  },
  {
    "id": 65,
    "course": "mm",
    "chapter": 3,
    "prompt": "一份说明保留文字属性和图文排版，另一份通过链接连接内容节点，应分别从什么角度辨认？",
    "options": [
      "二者都只按文件名长短区分",
      "前者关注格式文本，后者关注超文本组织",
      "前者只能是扫描照片",
      "只要有标题就必然是超文本"
    ],
    "answer": 1,
    "explanation": "格式文本关注文字及版面等格式，超文本关注内容节点和链接关系。两种观察角度不能只靠标题或扩展名互换，需看实际组织与处理要求。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "65:0",
      "65:1",
      "65:2",
      "65:3"
    ],
    "sections": [
      4
    ],
    "origin": "original"
  },
  {
    "id": 66,
    "course": "mm",
    "chapter": 3,
    "prompt": "Word 中改字、调整段落版面、插入图像后，准备输出校样还应做什么？",
    "options": [
      "改完字就删除可编辑文档",
      "只检查文件扩展名",
      "保存工作文档并做打印预览，核对文字、分页和图文位置",
      "把图像存在硬盘上即算插入成功"
    ],
    "answer": 2,
    "explanation": "内容编辑、版面安排与非文本内容排版属于不同检查对象。保存便于返工的文档后，还须在打印预览中检查分页与图文呈现；文件存在并不代表排版或打印结果正确。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "66:0",
      "66:1",
      "66:2",
      "66:3"
    ],
    "sections": [
      7,
      8
    ],
    "origin": "original"
  },
  {
    "id": 67,
    "course": "mm",
    "chapter": 4,
    "prompt": "彩色照片先转成灰度，再切回 RGB 模式，最合理的结果预期是什么？",
    "options": [
      "模式改变不会自动恢复丢失的原始颜色",
      "所有原始颜色必然准确恢复",
      "像素数必然翻倍",
      "工作稿图层必然全部恢复"
    ],
    "answer": 0,
    "explanation": "灰度保留亮度层次，已经丢失的原始颜色不能由再次选择 RGB 自动找回。需保留彩色原件；颜色模式、像素数量和编辑图层分别记录。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "67:0",
      "67:1",
      "67:2",
      "67:3"
    ],
    "sections": [
      3
    ],
    "origin": "original"
  },
  {
    "id": 68,
    "course": "mm",
    "chapter": 4,
    "prompt": "说明图交付后仍要反复改字和调整蒙版，保存时应优先安排什么？",
    "options": [
      "只保留一次平面截图",
      "只改变输出扩展名",
      "为了减少文件数删除图层",
      "保留含编辑结构的工作稿，另存目标用途的输出副本"
    ],
    "answer": 3,
    "explanation": "可编辑工作稿保存图层、文字和蒙版等关系，输出副本面向播放、显示或印刷用途。两种保存目的不同，平面输出与改扩展名不能替代原编辑结构。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "68:0",
      "68:1",
      "68:2",
      "68:3"
    ],
    "sections": [
      4,
      5
    ],
    "origin": "original"
  },
  {
    "id": 69,
    "course": "mm",
    "chapter": 5,
    "prompt": "把一份 MIDI 文件直接当成已录制旁白来核算 PCM 采样字节数，问题在哪里？",
    "options": [
      "MIDI 的时长总是零",
      "MIDI 描述演奏相关信息，不能直接等同录音波形采样",
      "MIDI 必然比任何 WAV 文件更大",
      "所有音频文件都按相同采样率保存"
    ],
    "answer": 1,
    "explanation": "MIDI 与波形录音描述的对象不同。PCM 数据量关系须有采样率、每样本位数、声道、时长及未压缩条件，不能从 MIDI 名称补出这些参数。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "69:0",
      "69:1",
      "69:2",
      "69:3"
    ],
    "sections": [
      4,
      5
    ],
    "origin": "original"
  },
  {
    "id": 70,
    "course": "mm",
    "chapter": 5,
    "prompt": "需要处理录音背景噪声时，哪种安排符合本章降噪任务的检查顺序？",
    "options": [
      "把整段所需人声选为噪声样本",
      "处理强度设最大即可验收",
      "留原件，选合适噪声样本，处理后比较背景与人声",
      "输出文件生成就免试听"
    ],
    "answer": 2,
    "explanation": "先保留原件，噪声样本应对应背景噪声而非所需语音，再比较处理前后效果。降噪可能影响人声，强度或输出成功提示不能替代试听与返工检查。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "70:0",
      "70:1",
      "70:2",
      "70:3"
    ],
    "sections": [
      6
    ],
    "origin": "original"
  },
  {
    "id": 71,
    "course": "mm",
    "chapter": 6,
    "prompt": "PAL、H.264 与 MOV 同时出现在制作记录中，应怎样理解？",
    "options": [
      "分别涉及电视制式、视频编码及文件格式，不能当作同一层次",
      "都是模拟视频输入接口",
      "都是改变片段顺序的方法",
      "只要扩展名相同，编码和制式一定相同"
    ],
    "answer": 0,
    "explanation": "PAL 属于模拟电视制式，H.264 属于视频编码，MOV 用作文件格式名称。作答时先确定信号、制式、编码或文件这一层次；扩展名不足以说明整个输入和编码条件。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "71:0",
      "71:1",
      "71:2",
      "71:3"
    ],
    "sections": [
      1,
      3
    ],
    "origin": "original"
  },
  {
    "id": 72,
    "course": "mm",
    "chapter": 6,
    "prompt": "录屏范围只包含窗口一半，随后转换文件成功。下一步最合适的处理是什么？",
    "options": [
      "将转换成功登记为内容验收通过",
      "只把文件改名为“完整”",
      "删掉检查记录以免重复操作",
      "修正采集范围并试录，再核查正式素材及最终输出"
    ],
    "answer": 3,
    "explanation": "转换成功不能补回采集时未记录的窗口内容。应回到采集环节检查范围、操作和声音，重做必要素材，并完整播放最终输出，分别记录采集、转换与内容检查。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "72:0",
      "72:1",
      "72:2",
      "72:3"
    ],
    "sections": [
      4
    ],
    "origin": "original"
  },
  {
    "id": 73,
    "course": "mm",
    "chapter": 7,
    "prompt": "Animate 中准备改文档条件，却一直选中标题对象。应先检查什么？",
    "options": [
      "标题文字是否足够长",
      "当前选中的是文档、帧还是对象，以及目标属性所属层次",
      "只需提高输出文件大小",
      "更换背景即可修改所有文档条件"
    ],
    "answer": 1,
    "explanation": "属性面板按当前对象显示相应属性。文档条件与文字字号、颜色等对象属性不同，先辨认选择范围及目标层次，才能判断设置为何没有作用到预期对象。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "73:0",
      "73:1",
      "73:2",
      "73:3"
    ],
    "sections": [
      3,
      4
    ],
    "origin": "original"
  },
  {
    "id": 74,
    "course": "mm",
    "chapter": 7,
    "prompt": "Maya 模型已经建立，为什么还不能把三维动画项目登记为全部完成？",
    "options": [
      "建模后所有动作都会自动出现",
      "渲染一张图可以证明全段运动正确",
      "还要按任务检查材质、动画、灯光、渲染和后期等成果",
      "只需把模型文件扩展名改成视频格式"
    ],
    "answer": 2,
    "explanation": "建模主要解决形体。动画项目还需相应的时间变化、外观、照明、渲染与后期输出；具体是否需要角色绑定由项目任务决定。静态模型或单张画面不证明完整动画已检查。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "74:0",
      "74:1",
      "74:2",
      "74:3"
    ],
    "sections": [
      9
    ],
    "origin": "original"
  },
  {
    "id": 75,
    "course": "mm",
    "chapter": 8,
    "prompt": "自启动方案已生成 ISO，但没有刻录设备。哪些状态可以如实登记？",
    "options": [
      "映像生成已发生；刻录、读取及使用端运行仍待验证",
      "全部交付已经通过",
      "所有盘片写入速度都已验证",
      "菜单文件存在等于全部媒体可以播放"
    ],
    "answer": 0,
    "explanation": "映像生成、实体写入、读取、启动和媒体播放是不同环节。缺少设备或目标运行环境时，记录已观察到的输出，并保留未执行环节，不能由 ISO 文件存在扩大为整体验收。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "75:0",
      "75:1",
      "75:2",
      "75:3"
    ],
    "sections": [
      4
    ],
    "origin": "original"
  },
  {
    "id": 76,
    "course": "mm",
    "chapter": 8,
    "prompt": "教材说网络型作品便于共享，怎样在本章范围内理解这一特点？",
    "options": [
      "任何网络作品都必然比任何本地文件小",
      "只要联网就无需检查媒体引用",
      "浏览器入口存在即可证明全部页面正确",
      "多人可经网络访问作品，仍须检查站点、资源与链接"
    ],
    "answer": 3,
    "explanation": "共享性说明访问与使用方式，不能推出任意体积比较或内容正确性。网络作品仍依赖站点组织、资源位置、导航和目标环境中的实际访问结果。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "76:0",
      "76:1",
      "76:2",
      "76:3"
    ],
    "sections": [
      3
    ],
    "origin": "original"
  },
  {
    "id": 77,
    "course": "mm",
    "chapter": 9,
    "prompt": "访客自由选择区域，但每段安全演示必须顺序播放，适合怎样说明组织结构？",
    "options": [
      "只能称完全线性，区域选择不计",
      "可按复合结构说明，并分别设计导航与片段内部顺序",
      "只要有视频就是层次结构",
      "结构由文件扩展名唯一决定"
    ],
    "answer": 1,
    "explanation": "自由选择与内部固定顺序可以结合为复合结构。导航图表示内容关系和跳转，屏幕脚本安排各屏内容与操作，不能仅凭媒体类型判断组织结构。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "77:0",
      "77:1",
      "77:2",
      "77:3"
    ],
    "sections": [
      5
    ],
    "origin": "original"
  },
  {
    "id": 78,
    "course": "mm",
    "chapter": 9,
    "prompt": "客户确认脚本后新增区域，任务估价应从哪里重新核对？",
    "options": [
      "只重新计算按钮文字的字数",
      "把人数翻倍，工期一律减半",
      "从范围变更回查脚本、素材、集成、确认、测试与发布依赖",
      "保留原报价并删除客户确认记录"
    ],
    "answer": 2,
    "explanation": "新增内容可能影响多个阶段及其依赖。应记录变更与确认，再按任务和人员核对工作、沟通、工具学习及交付条件；没有依据时不填写固定工时比例或人数换算公式。",
    "revision": 1,
    "legacyRevision": 1,
    "optionIds": [
      "78:0",
      "78:1",
      "78:2",
      "78:3"
    ],
    "sections": [
      1,
      2,
      4
    ],
    "origin": "original"
  }
];

export function questionSource(question, courses) {
 const course = courses.find(c => c.id === question.course);
 if (!course || question.chapter < 1 || question.chapter > course.chapters) throw new Error('Unknown quiz chapter');
 return '../../courses/'+course.slug+'/chapter-'+String(question.chapter).padStart(2,'0')+'/#s'+question.sections[0];
}
