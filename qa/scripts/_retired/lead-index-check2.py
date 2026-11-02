import json, re
j=json.load(open(r"站点/dist/search/search_index.json",encoding="utf-8"))
docs=j["docs"]
def find(kw):
    return [d for d in docs if kw in (d.get("text","")+d.get("title",""))]
for kw in ["FCFS","SPF","FIFO","LRU","DMA","ISA","CPU","RR","CFS","FCF"]:
    hits=find(kw)
    print(kw, len(hits))
d=[x for x in docs if "FCFS" in x["text"]][0]
t=d["text"]
i=t.find("FCFS")
print("--- snippet around FCFS ---")
print(repr(t[max(0,i-120):i+160]))
print("--- locations ---")
print([x["location"] for x in find("FCFS")])
