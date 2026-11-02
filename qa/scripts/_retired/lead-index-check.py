import json, re
j = json.load(open(r"站点/dist/search/search_index.json", encoding="utf-8"))
docs = j["docs"]
print("docs:", len(docs))
for kw in ["FCFS", "fcfs", "SPF", "CPI", "PCB", "进程调度", "时间片", "先来先服务"]:
    hits = [(d["location"], d["title"]) for d in docs if kw in (d.get("text","") + d.get("title",""))]
    print(f"{kw}: {len(hits)} -> {hits[:4]}")
lab = [d for d in docs if d["location"].startswith("lab/")]
print("lab docs:", len(lab), [(d["location"], d["title"]) for d in lab])
print("locations with double-slash or ../:", [d["location"] for d in docs if "//" in d["location"] or ".." in d["location"]][:5])
print("total chars:", sum(len(d.get("text","")) for d in docs))
