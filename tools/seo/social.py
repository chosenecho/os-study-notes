"""Regenerate the committed share cards with Pillow and a caller-provided CJK font.

Not a build dependency: python tools/seo/social.py --font <CJK TTF/TTC>
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--font', type=Path, required=True)
    args = parser.parse_args()
    regular = ImageFont.truetype(str(args.font), 32)
    heading = ImageFont.truetype(str(args.font), 64)
    brand = ImageFont.truetype(str(args.font), 40)
    courses = json.loads((ROOT / 'config/courses.json').read_text(encoding='utf-8'))
    cards = [('home','自考计算机课程复习笔记','按大纲阅读 · 自编练习 · 交互实验')]
    cards += [(c['slug'],c['title'],f'{c["chapters"]} 章复习笔记 · 讲解与自编练习') for c in courses]
    folder = ROOT / 'docs/assets/images/social'
    folder.mkdir(parents=True,exist_ok=True)
    for name,title,caption in cards:
        image = Image.new('RGB',(1200,630),'#202636')
        draw = ImageDraw.Draw(image)
        draw.rectangle((72,70,80,560),fill='#90b4ff')
        draw.text((112,70),'studynote',font=brand,fill='#aec8ff')
        lines, line = [], ''
        for char in title:
            if draw.textlength(line+char,font=heading) > 1000:
                lines.append(line); line = ''
            line += char
        lines.append(line)
        for i,line in enumerate(lines):
            draw.text((112,185+i*90),line,font=heading,fill='white')
        draw.text((112,420),caption,font=regular,fill='#d6e1f5')
        draw.text((112,510),'学习草稿 · OCR 尚未终校' if name == 'multimedia-technology'
                  else 'studynote.chosenecho.top',font=regular,fill='#aec8ff')
        image.save(folder/(name+'.png'),optimize=True)
    print(f'Generated {len(cards)} share cards (1200 × 630).')


if __name__ == '__main__':
    main()
