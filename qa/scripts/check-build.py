import pathlib, re
h = pathlib.Path("站点/dist/index.html").read_text(encoding="utf-8")
print("canonical:", re.findall(r'<link rel="canonical" href="([^"]+)"', h))
print("css inlined:", "<style>" in h and "assets/notes.css" not in h)
print("robots exists:", pathlib.Path("站点/dist/robots.txt").exists(), "| headers:", pathlib.Path("站点/dist/_headers").exists(), "| 404:", pathlib.Path("站点/dist/404.html").exists())
