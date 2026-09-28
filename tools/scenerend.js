'use strict';
// Render the scenery (no animals) to a plain text grid so overlaps/tangles
// can be seen directly.   node tools/scenerend.js [cols rows]
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { Animation } = require(path.join(ROOT, 'src', 'engine.js'));
const { buildWorld } = require(path.join(ROOT, 'src', 'world.js'));
const { addScenery } = require(path.join(ROOT, 'src', 'scenery.js'));

function renderGrid(cols, rows, showShade) {
  const anim = new Animation();
  anim.w = cols; anim.h = rows;
  buildWorld(anim);
  addScenery(anim);
  const ents = anim.entities.filter((e) => e.alive);
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(' '));
  const shadegrid = Array.from({ length: rows }, () => new Array(cols).fill(' '));
  // Painter's algorithm: higher z first, lower z on top.
  const sorted = ents.slice().sort((a, b) => b.z - a.z);
  for (const e of sorted) {
    const f = e.frame;
    for (let row = 0; row < f.height; row++) {
      const yy = e.y + row;
      if (yy < 0 || yy >= rows) continue;
      const line = f.lines[row];
      for (let col = 0; col < line.length; col++) {
        const xx = e.x + col;
        if (xx < 0 || xx >= cols) continue;
        const c = line[col];
        if (c === '\0') continue;
        grid[yy][xx] = c;
        if (showShade) shadegrid[yy][xx] = e.shade === 'dim' ? '.' : (e.shade === 'bright' ? '#' : 'o');
      }
    }
  }
  return { grid, shadegrid };
}

const cols = parseInt(process.argv[2], 10) || 80;
const rows = parseInt(process.argv[3], 10) || 24;
const showShade = process.argv[4] === 'shade';
const { grid, shadegrid } = renderGrid(cols, rows, showShade);
let ruler = '    ';
for (let c = 0; c < cols; c++) ruler += (c % 10 === 0) ? String(c % 100) : ' ';
console.log(ruler);
for (let r = 0; r < rows; r++) {
  const line = grid[r].join('');
  console.log(String(r).padStart(2) + ' |' + line + '|');
}
if (showShade) {
  console.log('\n--- shade map: . = dim (backdrop)   o = normal   # = bright ---');
  console.log(ruler);
  for (let r = 0; r < rows; r++) {
    console.log(String(r).padStart(2) + ' |' + shadegrid[r].join('') + '|');
  }
}
