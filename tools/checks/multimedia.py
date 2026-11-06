"""Recompute authored note answers from their stated inputs, without eval."""
from fractions import Fraction
from pathlib import Path
import json
import posixpath
import re


def audit(root):
    root = Path(root)
    chapters = [c for c in json.loads((root / 'config/syllabus.json').read_text(encoding='utf-8'))['chapters'] if c['id'].startswith('mm-')]
    notes = {int(c['id'].split('-')[1]): (root / c['path']).read_text(encoding='utf-8') for c in chapters}
    errors, checks = [], 0

    def require(condition, message):
        nonlocal checks
        checks += 1
        if not condition:
            errors.append('MM: ' + message)

    def practice(chapter, number):
        exercise = notes[chapter].split('## 自编练习', 1)[1]
        block = re.search(rf'^\*\*{number}\. (.*?)(?=^\*\*\d+\. |\Z)', exercise, re.M | re.S)
        if not block:
            raise ValueError(f'chapter {chapter}, question {number} missing')
        question, answer = block[1].split('**答案：**', 1)
        return re.sub(r'\s+', '', question), re.sub(r'\s+', '', answer)

    def match(pattern, text):
        found = re.search(pattern, text)
        if not found:
            raise ValueError('calculation inputs/results cannot be read: ' + pattern)
        return found.groups()

    def run(label, check):
        try:
            check()
        except (ValueError, KeyError, IndexError) as exc:
            require(False, label + ': ' + str(exc))

    def image_bytes():
        question, answer = practice(4, 2)
        width, height, bits = map(int, match(r'使用(\d+)×(\d+)像素的(\d+)位图像', question))
        byte_text, kib_text = match(r'缓冲区为[^=]*=(\d+)字节，即([\d.]+)KiB', answer)
        expected = Fraction(width * height * bits, 8)
        require(Fraction(byte_text) == expected, 'image bytes disagree with question dimensions/bit depth')
        require(Fraction(kib_text) == expected / 1024, 'image KiB conversion disagrees with bytes')
        require(all(t in question for t in ('不压缩', '不计文件头', '行填充')), 'image answer lost its storage-overhead conditions')

    def image_output():
        question, answer = practice(4, 6)
        width, height, bits, ppi = map(int, match(r'一幅(\d+)×(\d+)像素、(\d+)位的图像，不重新采样，按(\d+)ppi', question))
        out_w, out_h = match(r'宽为[^=]*=([\d.]+)英寸，高为[^=]*=([\d.]+)英寸', answer)
        require(Fraction(out_w) == Fraction(width, ppi) and Fraction(out_h) == Fraction(height, ppi), 'physical dimensions disagree with ppi')
        byte_text, kib_text = match(r'数据量为[^=]*=(\d+)B，即([\d.]+)KiB', answer)
        require(Fraction(byte_text) == Fraction(width*height*bits, 8), 'image extension bytes disagree with inputs')
        require(Fraction(kib_text) == Fraction(byte_text) / 1024, 'image extension KiB disagree with bytes')
        new_ppi, = match(r'改成(\d+)ppi', question)
        new_w, new_h = match(r'输出为([\d.]+)×([\d.]+)英寸', answer)
        require(Fraction(new_w) == Fraction(width, int(new_ppi)) and Fraction(new_h) == Fraction(height, int(new_ppi)), 'changed ppi dimensions disagree with fixed pixel count')

    def pcm_bytes():
        question, answer = practice(5, 2)
        seconds, rate, bits, channels = match(r'保存(\d+)秒、(\d+)次/秒、(\d+)位、(单|双)声道', question)
        expected = Fraction(int(seconds)*int(rate)*int(bits)*(1 if channels == '单' else 2), 8)
        byte_text, kib_text = match(r'PCM采样数据为[^=]*=(\d+)字节，即([\d.]+)KiB', answer)
        require(Fraction(byte_text) == expected, 'PCM bytes disagree with sampling inputs')
        require(Fraction(kib_text) == expected / 1024, 'PCM KiB conversion disagrees with bytes')
        require('未压缩PCM' in question and '仅计采样数据' in question, 'PCM calculation lost its applicability conditions')

    def pcm_budget():
        question, answer = practice(5, 6)
        budget, rate, bits = map(int, match(r'固定保存(\d+)B的未压缩PCM，参数为(\d+)次/秒、(\d+)位、单声道', question))
        bit_rate, = match(r'^(\d+)是bit/s', answer)
        byte_rate, = match(r'得到(\d+)B/s', answer)
        seconds, = match(r'再计算[^=]*=(\d+)s', answer)
        stereo_seconds, = match(r'只能保存(\d+)s', answer)
        require(int(bit_rate) == rate*bits, 'PCM bit rate disagrees with sampling inputs')
        require(Fraction(byte_rate) == Fraction(rate*bits, 8), 'PCM B/s must convert from bit/s by eight')
        require(Fraction(seconds) == Fraction(budget, int(byte_rate)), 'PCM duration disagrees with budget in bytes')
        require(Fraction(stereo_seconds) == Fraction(seconds) / 2, 'stereo duration must halve at unchanged budget, sampling rate and depth')

    def frame_duration():
        question, answer = practice(7, 3)
        first, last, frames, fps = map(int, match(r'从第(\d+)帧到第(\d+)帧，共(\d+)帧，按(\d+)帧/秒', question))
        seconds, = match(r'时长为[^=]*=([\d.]+)秒', answer)
        require(last-first+1 == frames and '完整播放一次' in question, 'animation inclusive complete-frame convention changed')
        require(Fraction(seconds) == Fraction(frames, fps), 'animation duration disagrees with complete frame count')

    def document_paths():
        question, answer = practice(8, 3)
        document, resource = match(r'根目录含([^与]+)与([^。]+)。', question)
        first = posixpath.relpath(resource, posixpath.dirname(document))
        moved = posixpath.join(posixpath.dirname(document), 'archive', posixpath.basename(document))
        second = posixpath.relpath(resource, posixpath.dirname(moved))
        require('应写'+first in answer, 'original document-relative path does not resolve to resource')
        require('应写'+second in answer, 'moved document-relative path does not resolve to resource')
        require(posixpath.normpath(posixpath.join(posixpath.dirname(document), first)) == resource, 'original resource path escaped its declared target')
        require(posixpath.normpath(posixpath.join(posixpath.dirname(moved), first)) != resource, 'moved document example no longer demonstrates a broken old path')

    for label, check in [('image bytes', image_bytes), ('image output', image_output), ('PCM bytes', pcm_bytes), ('PCM budget', pcm_budget), ('frame duration', frame_duration), ('document paths', document_paths)]:
        run(label, check)

    # A section cannot claim a required learning level while all mapped questions
    # omit it. This supplements the existing number/section checks.
    for chapter in chapters:
        for section in chapter['sections']:
            covered = {level for p in chapter['practice'] if section['number'] in p['sections'] for level in p['levels']}
            require(set(section['levels']) <= covered, f'{chapter["id"]} s{section["number"]}: practice learning-level gap')
    objective = next(o for c in chapters if c['id'] == 'mm-4' for o in c['objectives'] if o['number'] == 3)
    require(objective.get('source_status') == 'partial', 'camera-type source gap must remain explicit until evidence changes')
    return checks, errors
