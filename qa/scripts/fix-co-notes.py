import pathlib, re
root = pathlib.Path("课程/计算机组成原理")
changed = []
for p in sorted(root.glob("第*_笔记.md")):
    t = p.read_text(encoding="utf-8")
    new = re.sub(r"^## (\d+) 教材本章习题\s*$", r"## \1 本章自测题（自编）", t, flags=re.M)
    new = new.replace("本节按“单项选择题／填空题／简答题”分节，答案依据教材附录。", "题目与答案均为自编，用于自测；点开每题可查看参考答案。")
    if new != t:
        p.write_text(new, encoding="utf-8")
        changed.append(p.name)
print(len(changed), changed)
