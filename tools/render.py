#!/usr/bin/env python3
"""Render captured .out ANSI frames to PNG for visual inspection."""
import sys, os

from PIL import Image, ImageDraw, ImageFont

W, H = 80, 24

BASE = {
    'k': (58, 58, 58), 'r': (209, 47, 47), 'g': (63, 185, 80), 'y': (227, 179, 65),
    'b': (88, 166, 255), 'm': (188, 140, 255), 'c': (57, 197, 207), 'w': (212, 212, 212),
}
BRIGHT = {
    'k': (139, 148, 158), 'r': (255, 123, 114), 'g': (126, 231, 135), 'y': (255, 223, 93),
    'b': (121, 192, 255), 'm': (210, 168, 255), 'c': (86, 212, 221), 'w': (255, 255, 255),
}

def color(token):
    if not token:
        return None
    faint = False
    code = token
    if code[0] == '-':
        faint = True
        code = code[1:]
    lower = code.lower()
    rgb = BASE[lower] if code == lower else BRIGHT[lower]
    if faint:
        rgb = tuple(c // 2 for c in rgb)
    return rgb

def parse(raw):
    grid = [[' '] * W for _ in range(H)]
    colmap = [[None] * W for _ in range(H)]
    y = x = 0
    last = None
    i = 0
    n = len(raw)
    while i < n:
        c = raw[i]
        if c == '\x1b':
            endM = raw.find('m', i)
            endH = raw.find('H', i)
            if endM != -1 and (endH == -1 or endM < endH):
                params = raw[i+1:endM].split(';')
                letter, bright, faint = 'w', False, False
                for p in params:
                    try:
                        p = int(p)
                    except ValueError:
                        continue
                    if 30 <= p <= 37:
                        letter = 'krgybcmw'[p - 30]
                    elif p == 1:
                        bright = True
                    elif p == 22:
                        bright = False
                    elif p == 2:
                        faint = True
                last = ('-' if faint else '') + (letter.upper() if bright else letter)
                i = endM + 1
            else:
                import re
                m = re.match(r'\x1b\[(\d+);(\d+)H', raw[i:])
                if m:
                    y, x = int(m.group(1)) - 1, int(m.group(2)) - 1
                    i += len(m.group(0))
                    continue
                m2 = re.match(r'\x1b\[2J', raw[i:])
                if m2:
                    i += len(m2.group(0))
                    continue
                i += 1
        else:
            if 0 <= y < H and 0 <= x < W:
                grid[y][x] = c
                if last:
                    colmap[y][x] = last
            x += 1
            i += 1
    return grid, colmap

def render(path, outpath, scale=2):
    grid, colmap = parse(open(path).read())
    font = ImageFont.truetype('/System/Library/Fonts/SFNSMono.ttf', 16)
    # measure cell
    tmp = Image.new('RGB', (10, 10))
    d = ImageDraw.Draw(tmp)
    cw = int(d.textlength('0', font=font)) + 1
    ch = 18
    img = Image.new('RGB', (W * cw + 30, H * ch + 24), (13, 17, 23))
    d = ImageDraw.Draw(img)
    # row numbers
    for r in range(H):
        d.text((4, 20 + r * ch), str(r), font=ImageFont.truetype('/System/Library/Fonts/SFNSMono.ttf', 12), fill=(88, 96, 126))
    for r in range(H):
        for c in range(W):
            ch_ = grid[r][c]
            if ch_ == ' ':
                continue
            rgb = color(colmap[r][c]) or (212, 212, 212)
            d.text((30 + c * cw, 20 + r * ch), ch_, font=font, fill=rgb)
    if scale != 1:
        img = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
    img.save(outpath)
    print('wrote', outpath, img.size)

if __name__ == '__main__':
    for f in sys.argv[1:]:
        base = os.path.basename(f).replace('.out', '.png')
        render(f, os.path.join(os.path.dirname(f) or '.', base), scale=2)
