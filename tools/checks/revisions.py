"""Protect technical distinctions while allowing wholly new teaching examples."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
OS = ROOT / 'docs/courses/operating-systems'
CO = ROOT / 'docs/courses/computer-organization'
required = {
    OS / 'chapter-01.md': ['按字编址', '按字节编址', '并发', '并行', 'PC'],
    OS / 'chapter-02.md': ['中断隐指令', 'Mesa', 'while', 'P(full)', 'V(empty)', '饥饿'],
    OS / 'chapter-03.md': ['平均周转时间', 'Work+Allocation', '不是 Max 或 Need', '不安全', '逐分量', 'LLF'],
    OS / 'chapter-04.md': ['TLB 未命中不等于缺页', '10 位目录', '哈希', '状态演进表', '119.9992', '伙伴关系'],
    OS / 'chapter-05.md': ['链接分配与混合索引', '已经缓存', '262662', '索引块本身不算文件内容'],
    OS / 'chapter-06.md': ['两种等待', 'DMA 周期挪用', '逐步累加', '23 ms', '不是备份替代品'],
    CO / 'chapter-01.md': ['动态执行指令数', '平均 CPI', '0.15 s', '0.16 s', '指令集'],
    CO / 'chapter-02.md': ['Split Lock', '进位与有符号溢出', 'C0B80000', '综合征 6', '恢复余数', '舍入'],
    CO / 'chapter-03.md': ['EA1', 'EA2', '按字编址', 'PC+4', '符号扩展', '延迟槽'],
    CO / 'chapter-04.md': ['max(', '关键路径', 'load-use', '精确异常', '不能消除真正的数据依赖'],
    CO / 'chapter-05.md': ['位扩展', '字扩展', '除数别写错', '索引 6 位', '额外惩罚', '0x3124'],
    CO / 'chapter-06.md': ['现代架构下的 DMA', 'DMA 周期挪用', 'IOMMU', '0.4%', '事务层有效值'],
}
errors = []
checks = 0
for path, markers in required.items():
    text = path.read_text(encoding='utf-8')
    for marker in markers:
        checks += 1
        if marker not in text:
            errors.append(f'{path.parent.name}/{path.name}: missing {marker}')
table = (OS / 'chapter-06.md').read_text(encoding='utf-8').split('| 比较项 |', 1)[1].split(chr(10)*2, 1)[0]
shared = [line for line in table.splitlines() if line.startswith('| ')]
co6 = (CO / 'chapter-06.md').read_text(encoding='utf-8')
for row in shared:
    checks += 1
    if row not in co6:
        errors.append('OS/CO I/O comparison tables disagree: ' + row)
print(f'Technical regressions: {checks} distinctions across {len(required)} chapters')
if errors:
    print(chr(10).join(errors))
    sys.exit(1)
