'use strict';
// Build the real scenery at a size and report, authoritatively:
//  - every entity's z, shade, and x/y box
//  - same-plane (equal-z) overlaps  <- the tangles
//  - feature (water/tree/bamboo) vs grove-tree overlaps
//   node tools/layout.js [cols rows]
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { Animation } = require(path.join(ROOT, 'src', 'engine.js'));
const { buildWorld } = require(path.join(ROOT, 'src', 'world.js'));
const { addScenery } = require(path.join(ROOT, 'src', 'scenery.js'));

function check(cols, rows) {
  const anim = new Animation();
  anim.w = cols; anim.h = rows;
  buildWorld(anim);
  addScenery(anim);
  const ents = anim.entities.filter((e) => e.alive);
  console.log(`\n=== ${cols}x${rows} layout ===`);
  console.log(`features ${JSON.stringify(anim.world.features)} groundY=${anim.world.groundY} swingY=${anim.world.swingY}`);
  for (const e of ents) {
    const box = `x[${e.x}..${e.x + e.width()}) y[${e.y}..${e.y + e.height()})`;
    console.log(`  ${e.name.padEnd(12)} z=${String(e.z).padStart(2)} shade=${String(e.shade || '-').padEnd(6)} ${box}`);
  }
  console.log('  -- equal-z overlaps (tangles) --');
  let n = 0;
  for (let i = 0; i < ents.length; i++) for (let j = i + 1; j < ents.length; j++) {
    const a = ents[i], b = ents[j];
    if (a.z !== b.z) continue;
    const xlo = Math.max(a.x, b.x), xhi = Math.min(a.x + a.width(), b.x + b.width());
    const ylo = Math.max(a.y, b.y), yhi = Math.min(a.y + a.height(), b.y + b.height());
    if (xhi - xlo >= 1 && yhi - ylo >= 1) {
      n++;
      console.log(`  [z${a.z}] ${a.name} <-> ${b.name}   x[${xlo}..${xhi}) y[${ylo}..${yhi})`);
    }
  }
  if (!n) console.log('  (none)');
}

const argC = parseInt(process.argv[2], 10);
const argR = parseInt(process.argv[3], 10);
const sizes = (argC && argR) ? [[argC, argR]] : [[80, 24], [100, 30], [120, 40], [60, 20]];
for (const [c, r] of sizes) check(c, r);
