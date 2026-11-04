"""Check syllabus coverage, independent exercises and local figure references."""
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
manifest = json.loads((ROOT / 'config/syllabus.json').read_text(encoding='utf-8'))
courses = json.loads((ROOT / 'config/courses.json').read_text(encoding='utf-8'))
expected = {f'docs/courses/{c["slug"]}/chapter-{n:02}.md' for c in courses for n in range(1, c['chapters']+1)}
chapters = manifest['chapters']
errors, figures, referenced = [], set(), set()
if manifest.get('version') != 1 or len(chapters) != len(expected) or {c['path'] for c in chapters} != expected:
    errors.append('Syllabus chapter registry differs from course files')
section_count = question_count = 0
for chapter in chapters:
    path = ROOT / chapter['path']
    text = path.read_text(encoding='utf-8')
    label = chapter['id']
    def require(condition, message):
        if not condition:
            errors.append(f'{label}: {message}')
    require(text.splitlines()[0] == '# ' + chapter['title'], 'chapter title changed')
    require('> 大纲定位：' in text and text.count('## 复习导航') == 1, 'missing syllabus context/navigation')
    require(text.count('## 自编练习') == 1, 'exactly one independent practice section is required')
    if '## 自编练习' not in text:
        continue
    prose, exercise = text.split('## 自编练习', 1)
    sections = list(re.finditer(r'^## ([0-9]+) (.+?) \{#s([0-9]+)\}$', prose, re.M))
    require(len(sections) == len(chapter['sections']), 'syllabus section missing')
    for index, (match, spec) in enumerate(zip(sections, chapter['sections'])):
        require(int(match[1]) == int(match[3]) == spec['number'] == index+1, 'section numbering/anchor differs')
        require(match[2] == spec['title'], 'section title differs from syllabus registry')
        body = prose[match.end():sections[index+1].start() if index+1 < len(sections) else len(prose)]
        require(len(body.strip()) >= 80, f'section {spec["number"]} lacks a substantive explanation')
        for scope in spec['scope']:
            require(scope in prose, f'syllabus scope not visible: {scope}')
    questions = list(re.finditer(r'^\*\*([0-9]+)\. (.+?)\*\*', exercise, re.M))
    require(len(questions) == len(chapter['practice']) and len(questions) >= 4, 'practice count changed')
    covered = set()
    for index, (match, spec) in enumerate(zip(questions, chapter['practice'])):
        rest = exercise[match.end():questions[index+1].start() if index+1 < len(questions) else len(exercise)]
        require(int(match[1]) == spec['number'] == index+1, 'question numbers must be consecutive')
        mapping = re.search(r'考点：第 ([0-9、]+) 节；层次：([^。]+)。', rest)
        require(mapping is not None, f'question {index+1} lacks a syllabus/level mapping')
        if mapping:
            numbers = [int(n) for n in mapping[1].split('、')]
            require(numbers == spec['sections'] and mapping[2].split('、') == spec['levels'], 'practice metadata drifted')
            require(set(numbers) <= {s['number'] for s in chapter['sections']}, 'question references unknown sections')
            covered.update(numbers)
        answer = rest.split('**答案：**', 1)
        require(len(answer) == 2 and len(answer[-1].strip()) >= 25, f'question {index+1} lacks an explained answer')
    require(covered == {s['number'] for s in chapter['sections']}, 'some syllabus sections have no practice')
    for needle in ('教材原题：', '教材本章习题', '附录答案：', '教材例题', '部分习题参考答案', '由此可见', '综上所述', '不难看出'):
        require(needle not in text, f'retired source/filler marker: {needle}')
    for ref in re.findall(r'!\[[^]]*\]\(([^)]+)\)', text):
        target = (path.parent / ref).resolve()
        require(target.is_relative_to(path.parent.resolve()) and target.is_file(), f'missing/unsafe figure {ref}')
        referenced.add(target)
    figures.update(p.resolve() for p in (path.parent / 'figures').glob('*.svg'))
    objectives = chapter.get('objectives', [])
    if objectives:
        require([o['number'] for o in objectives] == list(range(1, len(objectives)+1)), 'objective numbering differs')
        for objective in objectives:
            mapped = [s['number'] for s in chapter['sections'] if objective['number'] in s.get('objectives', [])]
            require(bool(mapped) and mapped == objective['sections'], 'objective has no consistent teaching mapping')
            require(set(objective['sections']) <= covered, 'objective has no independent practice')
        require(all(s.get('objectives') for s in chapter['sections']), 'teaching section has no source objective')
    section_count += len(sections)
    question_count += len(questions)
if figures != referenced:
    errors.append('Unreferenced or unregistered course figures: ' + str(figures ^ referenced))
print(f'Syllabus coverage: {len(chapters)} chapters, {section_count} sections, {question_count} explained independent questions, {len(figures)} figures')
if errors:
    print(chr(10).join(errors))
    sys.exit(1)
