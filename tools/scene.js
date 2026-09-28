'use strict';
// Render one 80x24 frame of the actual scene off-terminal and save it to
// scene.out (ANSI) so the real output can be inspected.
Object.defineProperty(process.stdout, 'columns', { value: 80, configurable: true });
Object.defineProperty(process.stdout, 'rows', { value: 24, configurable: true });

// Capture everything the renderer writes, keep the last frame.
let frames = [];
const realWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, ...rest) => {
  frames.push(String(chunk));
  return true; // swallow; we dump ourselves
};

const { Animation } = require('../src/engine');
const { buildWorld } = require('../src/world');
const { addScenery } = require('../src/scenery');
const { spec: elephant } = require('../src/animals/elephant');
const { spec: giraffe } = require('../src/animals/giraffe');
const { spec: panda } = require('../src/animals/panda');
const { spec: lion } = require('../src/animals/lion');
const { spec: monkey } = require('../src/animals/monkey');
const { spec: hedgehog } = require('../src/animals/hedgehog');
const { spec: crocodile } = require('../src/animals/crocodile');
const animal = require('../src/animal');

function capture(anim, tag) {
  // The renderer emits one big string ending in \x1b[0m; grab it.
  const out = frames[frames.length - 1] || '';
  frames = [];
  require('fs').writeFileSync(tag, out);
  return out;
}

function clearPath(anim) {
  anim.entities = anim.entities.filter((e) => e.type === 'scenery');
}

const anim = new Animation();
buildWorld(anim);
addScenery(anim);

function put(spec, x, facingRight) {
  const e = animal.spawn(anim, spec, { onScreen: true, facingRight });
  if (e) { e.physX = x; e.x = Math.floor(x); }
  return e;
}

// ── scene 1: three animals mid-walk, no overlap ──
put(elephant, 8, true);
put(giraffe, 38, false);
put(panda, 58, false);
anim.render();
capture(anim, 'scene1.out');

// ── scene 2: elephant drinking at the waterhole ──
clearPath(anim);
// waterX = floor(80*0.22) = 17. Left-facing drink anchor is col 1.
// spawn as if walking left toward the water, then force the act.
(function () {
  const e = animal.spawn(anim, elephant, { onScreen: true, facingRight: false });
  if (!e) throw new Error('elephant spawn failed');
  e.physX = 16; e.x = 16;           // anchor 1 → featureX 17
  e.state = animal.ACT;
  e.dx = 0;
  e.actLeft = 10;
  animal.useArtForTesting && 0;
  // switch art like step() does:
  const set = require('../src/animal');
  require('../src/artkit');
  // Easiest: re-run the ACT branch by hand.
  e.sinkNow = 0;
  e.frames = elephant._prepared.actLeft.frames;
  e.colorMasks = elephant._prepared.actLeft.masks;
  e.physY = e.groundY - e.height();
  e.y = Math.floor(e.physY);
})();
anim.render();
capture(anim, 'scene2.out');

// ── scene 3: giraffe browsing the tall tree ──
clearPath(anim);
(function () {
  const e = animal.spawn(anim, giraffe, { onScreen: true, facingRight: true });
  if (!e) throw new Error('giraffe spawn failed');
  // treeX = 40, anchorRight = 10 → stopX = 30
  e.physX = 30; e.x = 30;
  e.state = animal.ACT; e.dx = 0; e.actLeft = 10;
  e.frames = giraffe._prepared.actRight.frames;
  e.colorMasks = giraffe._prepared.actRight.masks;
  e.physY = e.groundY - e.height();
  e.y = Math.floor(e.physY);
})();
anim.render();
capture(anim, 'scene3.out');

// ── scene 4: panda sitting at the bamboo ──
clearPath(anim);
(function () {
  const e = animal.spawn(anim, panda, { onScreen: true, facingRight: false });
  if (!e) throw new Error('panda spawn failed');
  // bambooX = floor(80*0.78) = 62, anchor = 30, offset 2 → stopX = 62-30+2 = 34
  e.physX = 34; e.x = 34;
  e.state = animal.ACT; e.dx = 0; e.actLeft = 10;
  e.frames = panda._prepared.actLeft.frames;
  e.colorMasks = panda._prepared.actLeft.masks;
  e.physY = e.groundY - e.height();
  e.y = Math.floor(e.physY);
})();
anim.render();
capture(anim, 'scene4.out');

// ── scene 5: crocodile lurking + lion resting + monkey on vine + hedgehog ──
clearPath(anim);
(function () {
  const c = animal.spawn(anim, crocodile, { onScreen: true, facingRight: true });
  if (!c) throw new Error('crocodile spawn failed');
  c.physX = 17 - 12; c.x = 5;   // anchorRight 12 → featureX 17
  c.state = animal.ACT; c.dx = 0; c.actLeft = 200; c.sinkNow = 1;
  c.frames = crocodile._prepared.actRight.frames;
  c.colorMasks = crocodile._prepared.actRight.masks;
  c.physY = c.groundY - c.height() + 1;
  c.y = Math.floor(c.physY);

  const l = animal.spawn(anim, lion, { onScreen: true, facingRight: true });
  // treeX 40, anchorRight 7, offset 12 → stopX = 40-7+12 = 45
  l.physX = 45; l.x = 45;
  l.state = animal.ACT; l.dx = 0; l.actLeft = 100;
  l.frames = lion._prepared.actRight.frames;
  l.colorMasks = lion._prepared.actRight.masks;
  l.physY = l.groundY - l.height();
  l.y = Math.floor(l.physY);

  const h = animal.spawn(anim, hedgehog, { onScreen: true, facingRight: true });
  h.physX = 70; h.x = 70;
  h.state = animal.ACT; h.dx = 0; h.actLeft = 100;
  h.frames = hedgehog._prepared.actLeft.frames;
  h.colorMasks = hedgehog._prepared.actLeft.masks;
  h.physY = h.groundY - h.height();
  h.y = Math.floor(h.physY);

  // monkey: spawn into the canopy lane
  const m = animal.spawn(anim, monkey, { onScreen: true });
  if (m) { m.physX = 37; m.x = 37; }
})();
anim.render();
capture(anim, 'scene5.out');

console.log('done — scene1..scene5 written');
process.exit(0);
