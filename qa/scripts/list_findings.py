import json
import sys
from pathlib import Path

out_lines = []
for arg in sys.argv[1:]:
    p = Path(arg)
    if not p.exists():
        out_lines.append(f"!! missing {p}")
        continue
    d = json.loads(p.read_text(encoding="utf-8"))
    fs = d.get("findings", [])
    out_lines.append(f"===== {p.name}: {len(fs)} findings")
    for f in fs:
        out_lines.append(f"{f.get('severity')} {f.get('id')} [{f.get('scope','-')}] {f.get('title')}")
        for k in ("device", "url", "expected", "actual", "source", "fix"):
            v = f.get(k)
            if v:
                out_lines.append(f"  {k}: {v}")
        m = f.get("measurements")
        if m:
            out_lines.append(f"  measurements: {json.dumps(m, ensure_ascii=False)[:600]}")
        ev = f.get("evidence") or []
        if ev:
            out_lines.append(f"  evidence: {ev}")
        st = f.get("steps")
        if st:
            out_lines.append(f"  steps: {json.dumps(st, ensure_ascii=False)[:400]}")
        out_lines.append("")

target = Path(sys.argv[0]).parent.parent / "artifacts" / "lead" / "findings-merged.txt"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text("\n".join(out_lines), encoding="utf-8")
print(f"wrote {target} ({len(out_lines)} lines)")
