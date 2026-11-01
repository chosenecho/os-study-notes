import pathlib, re
h = pathlib.Path("站点/dist/404.html").read_text(encoding="utf-8")
print("has-chinese:", "页面没有找到" in h)
print("h1:", re.findall(r"<h1[^>]*>(.*?)</h1>", h, re.S)[:2])
print("content links:", re.findall(r'<div class="md-content__inner md-typeset">([\s\S]{0,900})', h)[:1])
