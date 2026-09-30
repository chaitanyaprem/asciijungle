'use strict';
// Headless run of the REAL game: build world+scenery, spawn a busy mix of
// animals from both edges, run real ticks, and report animal-on-animal
// overlaps and edge clipping. Render is no-opped (we read state, not pixels).
//   node tools/sim.js [cols rows ticks]
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { Animation } = require(path.join(ROOT, 'src', 'engine.js'));
const { buildWorld } = require(path.join(ROOT, 'src', 'world.js'));
const { addScenery } = require(path.join(ROOT, 'src', 'scenery.js'));
const { ANIMALS } = require(path.join(ROOT, 'src', 'random.js'));
const sound = require(path.join(ROOT, 'src', 'sound.js'));

function sim(cols, rows, ticks) {
  sound.setEnabled(false);
  const anim = new Animation();
  anim.w = cols; anim.h = rows;
  buildWorld(anim);
  addScenery(anim);
  anim.render = () => {}; // no ANSI to stdout during the sim

  // A busy, collision-prone mix, summoned from both edges.
  const order = ['turtle', 'elephant', 'frog', 'crocodile', 'giraffe', 'lion', 'panda',
                 'monkey', 'hedgehog', 'elephant', 'giraffe', 'panda',
                 'lion', 'crocodile', 'frog', 'turtle'];
  let spawned = 0;
  for (const name of order) {
    const a = ANIMALS.find((x) => x.name === name);
    if (!a) continue;
    const e = a.add(anim, { force: true, atEdge: true, announce: false });
    if (e) spawned++;
  }

  let overlapTicks = 0, clipTicks = 0, asideTicks = 0;
  const overlapSamples = [];
  const clipSamples = [];
  for (let t = 0; t < ticks; t++) {
    anim.animate();
    const animals = anim.entities.filter((e) => e.alive && e.type !== 'scenery');

    for (let i = 0; i < animals.length; i++) for (let j = i + 1; j < animals.length; j++) {
      const a = animals[i], b = animals[j];
      if ((a.lane || 'path') !== (b.lane || 'path')) continue;
      const xlo = Math.max(a.x, b.x), xhi = Math.min(a.x + a.width(), b.x + b.width());
      const ylo = Math.max(a.y, b.y), yhi = Math.min(a.y + a.height(), b.y + b.height());
      if (xhi - xlo >= 1 && yhi - ylo >= 1) {
        overlapTicks++;
        if (overlapSamples.length < 12)
          overlapSamples.push(`t=${t} ${a.type} x[${a.x}..${a.x + a.width()}) lane=${a.lane} <-> ${b.type} x[${b.x}..${b.x + b.width()})`);
      }
    }
    for (const a of animals) {
      if (a.lane === 'canopy') continue;
      const w = a.width();
      const left = a.x < 0, right = a.x + w > cols;
      if ((left || right) && a.entered) {
        clipTicks++;
        if (clipSamples.length < 12)
          clipSamples.push(`t=${t} ${a.type} x=${a.x} w=${w} ${left ? '<0' : ''}${right ? ' right=' + (a.x + w) : ''}`);
      }
      if (a.lane === 'shoulder') asideTicks++;
    }
  }

  console.log(`\n=== sim ${cols}x${rows}, ${ticks} ticks, ${spawned} spawned ===`);
  console.log(`overlap-ticks=${overlapTicks}  clip-ticks=${clipTicks}  shoulder-ticks=${asideTicks}`);
  if (overlapSamples.length) { console.log('overlap samples:'); overlapSamples.forEach((s) => console.log('  ' + s)); }
  if (clipSamples.length) { console.log('clip samples:'); clipSamples.forEach((s) => console.log('  ' + s)); }
}

const cols = parseInt(process.argv[2], 10) || 80;
const rows = parseInt(process.argv[3], 10) || 24;
const ticks = parseInt(process.argv[4], 10) || 300;
sim(cols, rows, ticks);
