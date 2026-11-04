"""Verify that every item in archive/qa/rounds/r5/修订规范与勘误清单.md actually landed.

Structural integrity is covered by check-notes.py; this file answers a
different question: did the specific technical fix / 补强 / 顺色 edit survive?

Run from the repo root:
    python tools/checks/revisions.py
"""
from pathlib import Path
import sys

REPO = Path(__file__).resolve().parents[2]
OS = REPO / 'docs/courses/operating-systems'
CO = REPO / 'docs/courses/computer-organization'

# file -> markers that MUST be present
MUST_HAVE = {
    OS / 'chapter-01.md': [
        ('按字编址与按字节编址对照', '按字节编址'),
        ('闭卷复习已改号为第 9 节', '## 9 闭卷复习'),
    ],
    OS / 'chapter-02.md': [
        ('中断隐指令硬件阶段', '中断隐指令'),
        ('读者—写者自习室心智模型', '自习室'),
        ('Mesa 语义说明', 'Mesa'),
        ('条件等待改 while', 'while'),
    ],
    OS / 'chapter-03.md': [
        ('接收第 1 章迁入的周转时间真题', '教材综合题'),
        ('银行家算法过程表', '安全性检查过程表'),
        ('Work+Allocation 列', 'Work+Allocation'),
    ],
    OS / 'chapter-04.md': [
        ('两级页表反差算例', '反差算例'),
        ('反置页表哈希', '哈希'),
        ('页面置换状态演进表', '状态演进表'),
    ],
    OS / 'chapter-05.md': [
        ('FAT 与 i 结点对照', '链接分配与混合索引'),
        ('最大文件长度自编例', '16 GB'),
    ],
    OS / 'chapter-06.md': [
        ('跨课程对照节', '两种「等待」'),
        ('磁盘调度逐步累加', '逐步累加'),
        ('进程阻塞与 DMA 分开', 'DMA 周期挪用'),
    ],
    CO / 'chapter-01.md': [
        ('M2 峰值 750 MIPS', '750 MIPS'),
        ('M1 每条快 0.133 ns', '0.133'),
        ('附录频率与题干不符的说明', '附录'),
    ],
    CO / 'chapter-02.md': [
        ('除法口诀', '口诀'),
        ('除法逐步追踪', '追踪'),
        ('内存对齐硬件代价', 'Split Lock'),
    ],
    CO / 'chapter-03.md': [
        ('锁存 EA1', 'EA1'),
        ('锁存 EA2', 'EA2'),
        ('按字编址步长说明', '按字编址'),
    ],
    CO / 'chapter-04.md': [
        ('习题 12 不采信附录答案', '附录答案不采信'),
        ('习题 3 显式 max 路径', 'max('),
    ],
    CO / 'chapter-05.md': [
        ('地址拆分第一步', '第一步，展开'),
        ('地址拆分第三步', '第三步，重新聚合'),
        ('习题 15 除数提醒', '除数别写错'),
    ],
    CO / 'chapter-06.md': [
        ('DMA 与 Cache 一致性节', '现代架构下的 DMA'),
        ('进程阻塞与 DMA 分开', 'DMA 周期挪用'),
    ],
}

# file -> strings that MUST NOT remain
MUST_NOT_HAVE = {
    OS / 'chapter-01.md': [
        ('第 9 节拓展应已迁出', '## 9 拓展'),
        ('周转时间真题应已迁走', '平均作业周转时间 ＝'),
    ],
    CO / 'chapter-05.md': [
        ('错误的除法公式应已改掉', '(0/4)mod8'),
        ('错误的除法公式应已改掉', '[63/4]'),
        ('感叹号句应已重写', '从而使命中率提高'),
    ],
    CO / 'chapter-03.md': [
        ('丢失间接层的记号应已改掉', 'M[R5]←M[R[R5]]'),
    ],
    CO / 'chapter-04.md': [
        ('凭空多出的 7 条指令答案应已删除', 'lw   $2, 100($6)'),
    ],
}

failures = []
checks = 0


def content(path):
    return path.read_text(encoding='utf-8')


for path, markers in MUST_HAVE.items():
    if not path.exists():
        failures.append(f'缺少文件 {path.name}')
        continue
    text = content(path)
    for label, needle in markers:
        checks += 1
        if needle not in text:
            failures.append(f'{path.name}: 缺少「{label}」（未找到 {needle!r}）')

for path, markers in MUST_NOT_HAVE.items():
    if not path.exists():
        continue
    text = content(path)
    for label, needle in markers:
        checks += 1
        if needle in text:
            failures.append(f'{path.name}: 仍残留「{label}」（{needle!r}）')

# The two courses carry the same 进程阻塞 / DMA 周期挪用 table, so the shared
# rows must agree verbatim in both files.
os6 = content(OS / 'chapter-06.md')
co6 = content(CO / 'chapter-06.md')
shared_rows = [
    '| 发生在哪一层 | 操作系统软件：内核将进程置为阻塞并挂入等待队列，按需进行上下文切换 | 硬件电路：DMA 控制器向总线仲裁器申请使用权 |',
    '| 时间尺度 | 等待时长取决于设备与调度，不能由“阻塞”一词确定 | 占用单个或若干存储周期；实际时长取决于硬件与传输方式 |',
    '| 此时 CPU 在干什么 | 有其他就绪任务时可转去执行；否则可能运行空闲任务 | 需要使用同一总线或主存的 CPU 访问可能延迟，其他可独立进行的运算仍可推进 |',
    '| 由谁发起 | 进程执行系统调用后条件未满足，或等待的事件尚未发生 | 外设控制器或 DMA 引擎发起总线请求 |',
    '| 如何恢复 | 事件完成后唤醒进程，重新进入就绪队列，等调度程序选中 | 总线可用后，受延迟的访存可继续，无需为此进行进程调度 |',
    '| 对执行的影响 | 涉及进程状态与调度；阻塞调用完成后才继续执行后续代码 | 不改变程序的指令语义，但可能增加执行时间 |',
]
for row in shared_rows:
    checks += 1
    for label, text in (('操作系统概论第6章', os6), ('计算机组成原理第6章', co6)):
        if row not in text:
            failures.append(f'{label}: 跨课程对照表该行不一致或缺失：{row[:24]}…')

print(f'核验 {checks} 条修订项，覆盖 {len(MUST_HAVE)} 篇笔记')

if failures:
    print(f'\n{len(failures)} 处未达标：')
    for item in failures:
        print('  -', item)
    sys.exit(1)

print('全部修订项已落地')
