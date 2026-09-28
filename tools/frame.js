'use strict';
// Parse a captured ANSI frame (80x24) into plain text rows + a colour map.
const fs = require('fs');
const file = process.argv[2];
const raw = fs.readFileSync(file, 'utf8');

const W = 80, H = 24;
const grid = Array.from({ length: H }, () => new Array(W).fill(' '));
const colmap = Array.from({ length: H }, () => new Array(W).fill(null));

// Walk the stream with a mini SGR parser.
let y = 0, x = 0, last = null;
let i = 0;
function sgr(params) {
  // map to a readable tag
  const map = { 0: 'reset', 1: 'bold', 2: 'faint', 22: 'nobold', 30: 'blk', 31: 'red', 32: 'grn', 33: 'ylw', 34: 'blu', 35: 'mag', 36: 'cyn', 37: 'wht' };
  const out = params.map((p) => map[p] || String(p));
  return out.join('/');
}
while (i < raw.length) {
  const c = raw[i];
  if (c === '\x1b') {
    const end = raw.indexOf('m', i);
    const endH = raw.indexOf('H', i);
    const useM = end !== -1 && (endH === -1 || end < endH);
    if (useM) {
      const params = raw.slice(i + 1, end).split(';').map(Number);
      last = sgr(params);
      i = end + 1;
    } else {
      const m = raw.slice(i).match(/^\x1b\[(\d+);(\d+)H/);
      if (m) { y = +m[1] - 1; x = +m[2] - 1; i += m[0].length; continue; }
      const m2 = raw.slice(i).match(/^\x1b\[2J/);
      if (m2) { i += m2[0].length; continue; }
      i += 1;
    }
  } else if (c === '\n') {
    y += 1; x = 0; i += 1;
  } else if (c === '\r') {
    x = 0; i += 1;
  } else {
    if (y >= 0 && y < H && x >= 0 && x < W) {
      grid[y][x] = c;
      if (last) colmap[y][x] = last;
    }
    x += 1; i += 1;
  }
}

console.log('══ ' + file + ' ══');
for (let r = 0; r < H; r++) {
  console.log(String(r).padStart(2) + ' ' + grid[r].map((c) => (c === ' ' ? '·' : c)).join(''));
}
// colour summary: which colours appear and roughly where
const counts = {};
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const t = colmap[r][c];
  if (t && t !== 'reset') counts[t] = (counts[t] || 0) + 1;
}
console.log('colours:', JSON.stringify(counts));
console.log();
