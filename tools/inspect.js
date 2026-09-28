'use strict';
// Print a captured .out frame as an aligned grid with a column ruler so
// exact x positions of overlaps / clipping / misalignment can be read off.
const fs = require('fs');
const file = process.argv[2];
const raw = fs.readFileSync(file, 'utf8');

const W = 80, H = 24;
const grid = Array.from({ length: H }, () => new Array(W).fill(' '));

let y = 0, x = 0, i = 0;
while (i < raw.length) {
  const c = raw[i];
  if (c === '\x1b') {
    const endM = raw.indexOf('m', i);
    const endH = raw.indexOf('H', i);
    const useM = endM !== -1 && (endH === -1 || endM < endH);
    if (useM) { i = endM + 1; }
    else {
      const m = raw.slice(i).match(/^\x1b\[(\d+);(\d+)H/);
      if (m) { y = +m[1] - 1; x = +m[2] - 1; i += m[0].length; continue; }
      const m2 = raw.slice(i).match(/^\x1b\[2J/);
      if (m2) { i += m2[0].length; continue; }
      i += 1;
    }
  } else {
    if (y >= 0 && y < H && x >= 0 && x < W) grid[y][x] = c;
    x += 1; i += 1;
  }
}

// ruler
const tens = '0123456789'.repeat(8);
let top = '  ';
for (let c = 0; c < W; c++) top += (c % 10 === 0) ? (c / 10) : ' ';
let ones = '  ';
for (let c = 0; c < W; c++) ones += tens[c];
console.log('══ ' + file + ' ══');
console.log(top);
console.log(ones);
for (let r = 0; r < H; r++) {
  console.log(String(r).padStart(2) + ' ' + grid[r].map((ch) => (ch === ' ' ? '·' : ch)).join(''));
}
console.log();
