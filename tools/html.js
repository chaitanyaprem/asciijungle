'use strict';
// Render captured .out ANSI frames to a single colour-faithful HTML page so
// the real output can be eyeballed (or screenshotted) without a live terminal.
const fs = require('fs');
const path = require('path');

const W = 80, H = 24;

// token -> css. lowercase = normal, uppercase = bright, '-' prefix = faint.
const BASE = {
  k: '#3a3a3a', r: '#d12f2f', g: '#3fb950', y: '#e3b341',
  b: '#58a6ff', m: '#bc8cff', c: '#39c5cf', w: '#d4d4d4',
};
const BRIGHT = {
  k: '#8b949e', r: '#ff7b72', g: '#7ee787', y: '#ffdf5d',
  b: '#79c0ff', m: '#d2a8ff', c: '#56d4dd', w: '#ffffff',
};
function css(token) {
  if (!token) return null;
  let faint = false, code = token;
  if (code[0] === '-') { faint = true; code = code.slice(1); }
  const lower = code.toLowerCase();
  const hex = (code === lower) ? BASE[lower] : BRIGHT[lower];
  if (!hex) return null;
  return faint
    ? `color:${hex};opacity:0.4`
    : `color:${hex}`;
}

function parse(raw) {
  const grid = Array.from({ length: H }, () => new Array(W).fill(' '));
  const colmap = Array.from({ length: H }, () => new Array(W).fill(null));
  let y = 0, x = 0, last = null;
  let i = 0;
  while (i < raw.length) {
    const c = raw[i];
    if (c === '\x1b') {
      const endM = raw.indexOf('m', i);
      const endH = raw.indexOf('H', i);
      const useM = endM !== -1 && (endH === -1 || endM < endH);
      if (useM) {
        const params = raw.slice(i + 1, endM).split(';').map(Number);
        // fold SGR into a token: we only track the colour letters the app uses.
        // SGR 30-37 -> letter; 1 bold / 22 nobold; 2 faint.
        let letter = 'w', bright = false, faint = false;
        for (const p of params) {
          if (p >= 30 && p <= 37) letter = 'krgybcmw'.charAt(p - 30);
          else if (p === 1) bright = true;
          else if (p === 22) bright = false;
          else if (p === 2) faint = true;
        }
        last = (faint ? '-' : '') + (bright ? letter.toUpperCase() : letter);
        i = endM + 1;
      } else {
        const m = raw.slice(i).match(/^\x1b\[(\d+);(\d+)H/);
        if (m) { y = +m[1] - 1; x = +m[2] - 1; i += m[0].length; continue; }
        const m2 = raw.slice(i).match(/^\x1b\[2J/);
        if (m2) { i += m2[0].length; continue; }
        i += 1;
      }
    } else {
      if (y >= 0 && y < H && x >= 0 && x < W) {
        grid[y][x] = c;
        if (last) colmap[y][x] = last;
      }
      x += 1; i += 1;
    }
  }
  return { grid, colmap };
}

const files = process.argv.slice(2);
const scenes = files.map((f) => ({
  name: path.basename(f),
  ...parse(fs.readFileSync(f, 'utf8')),
}));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const CELL = 11; // px per column, LINE = 16

function sceneHtml(s) {
  let rows = '';
  for (let r = 0; r < H; r++) {
    let line = `<span class="rownum">${r}</span>`;
    for (let c = 0; c < W; c++) {
      const ch = s.grid[r][c];
      const style = css(s.colmap[r][c]);
      const content = esc(ch === ' ' ? '\u00a0' : ch);
      line += style
        ? `<span style="${style}">${content}</span>`
        : content;
    }
    rows += line + '\n';
  }
  return `<h2>${s.name}</h2><pre class="frame">${rows}</pre>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
 body{background:#0d1117;margin:24px;font-family:ui-monospace,Menlo,monospace}
 h2{color:#e6edf3;font-family:ui-sans-serif,system-ui;margin:0 0 6px}
 .frame{background:#000;border:1px solid #30363d;border-radius:6px;
        margin:0 0 34px;padding:10px 14px;font-size:${CELL}px;line-height:16px;
        letter-spacing:0;white-space:pre;font-weight:400}
 .rownum{color:#58607e}
</style></head><body>
${scenes.map(sceneHtml).join('\n')}
</body></html>`;

const out = path.join(__dirname, 'out', 'scenes.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote', out);
