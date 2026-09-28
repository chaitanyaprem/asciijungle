'use strict';

// Treats: what a non-animal key does. A butterfly, a bird or a flower, and
// the space bar brings a rainbow. They are scenery to the world (occupants()
// skips them), so a treat never takes an animal's seat, blocks the path or
// swaps anyone out. Flyers have a cap; past it a key grows a flower, and
// only the oldest flower makes way.

const { DEPTH } = require('./depth');
const { drift, BIRD_RIGHT, BIRD_LEFT } = require('./scenery');
const sound = require('./sound');

const MAX_FLYERS = 6;   // butterflies + birds in the air at once
const MAX_FLOWERS = 12; // oldest flower goes when a new one would pass this
const FLOWER_MS = 60000;
const RAINBOW_MS = 8000;

const BRIGHT = ['R', 'Y', 'M', 'C', 'B'];
function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

function treats(anim, kind) {
  return anim.entities.filter((e) => e.alive && e.treat === kind);
}

function flyers(anim) {
  return treats(anim, 'butterfly').length + treats(anim, 'bird').length;
}

// ─────────────────────────── butterfly ───────────────────────────
const BUTTERFLY = ['(\\/)\n(/\\)', ' \\/ \n /\\ '];

function flutter(e, anim) {
  e.physX += e.dx;
  e.physFrame += e.frameSpeed;
  e.tick += 1;
  e.physY = e.baseY + Math.sin(e.tick * 0.35) * 1.5;
  e.x = Math.floor(e.physX);
  e.y = Math.floor(e.physY);
}

function addButterfly(anim) {
  if (flyers(anim) >= MAX_FLYERS) return false;
  const right = Math.random() < 0.5;
  const color = pick(BRIGHT);
  const y = 2 + Math.floor(Math.random() * Math.max(1, anim.world.groundY - 10));
  const e = anim.newEntity({
    name: 'treat-butterfly',
    type: 'scenery',
    shape: BUTTERFLY,
    position: [right ? 0 : anim.width() - 4, y, DEPTH.skyDecor],
    callbackArgs: [right ? 0.5 : -0.5, 0, 0, 0.5],
    callback: flutter,
    dieOffscreen: true,
    defaultColor: color,
    autoTrans: true,
  });
  e.treat = 'butterfly';
  e.baseY = y;
  e.tick = 0;
  return true;
}

// ────────────────────────────── bird ─────────────────────────────
function addBird(anim) {
  if (flyers(anim) >= MAX_FLYERS) return false;
  const right = Math.random() < 0.5;
  const y = 1 + Math.floor(Math.random() * Math.max(3, anim.skyRows + 3));
  const e = anim.newEntity({
    name: 'treat-bird',
    type: 'scenery',
    shape: right ? BIRD_RIGHT : BIRD_LEFT,
    // Start fully on screen: dieOffscreen would kill one that starts off it.
    position: [right ? 0 : anim.width() - 6, y, DEPTH.skyDecor],
    callbackArgs: [right ? 0.7 : -0.7, 0, 0, 0.25],
    callback: drift,
    dieOffscreen: true,
    defaultColor: pick(['W', 'Y', 'C']),
    autoTrans: true,
  });
  e.treat = 'bird';
  e.baseY = y;
  return true;
}

// ───────────────────────────── flower ────────────────────────────
const HEADS = ['(@)', '{*}', '<o>', '\\@/'];

function addFlower(anim) {
  const now = treats(anim, 'flower');
  if (now.length >= MAX_FLOWERS) now[0].alive = false;
  const w = anim.width();
  const water = anim.world.features.waterX;
  const taken = treats(anim, 'flower').map((f) => f.x);
  // A spot out of the waterhole and clear of other flowers, if one turns up.
  let x;
  for (let i = 0; i < 12; i++) {
    x = 1 + Math.floor(Math.random() * Math.max(1, w - 4));
    const inWater = Math.abs(x - water) < Math.floor(w * 0.07) + 3;
    if (!inWater && taken.every((t) => Math.abs(t - x) > 4)) break;
  }
  const head = pick(HEADS);
  const color = pick(BRIGHT);
  const e = anim.newEntity({
    name: 'treat-flower',
    type: 'scenery',
    shape: `${head}\n | `,
    color: `${color.repeat(3)}\n g `,
    // Behind the animals, in front of the trees.
    position: [x, anim.world.groundY - 2, anim.world.z.scenery - 2],
    dieTime: Date.now() + FLOWER_MS,
    defaultColor: color,
    autoTrans: true,
  });
  e.treat = 'flower';
  return true;
}

// ──────────────────────────── rainbow ────────────────────────────
// Concentric bands on an ellipse; terminal cells are about 2.2x taller than
// wide, so the vertical radius is squashed to keep it round on screen.
function rainbowArt(width) {
  const bands = 'RYGBM';
  const r = Math.floor(width / 2);
  const ry = Math.ceil(r / 2.2);
  const lines = [], mask = [];
  for (let row = 0; row <= ry; row++) {
    let l = '', m = '';
    for (let col = 0; col < 2 * r + 1; col++) {
      const dx = (col - r) / 2.2, dy = ry - row;
      const b = Math.floor(ry + 0.5 - Math.sqrt(dx * dx + dy * dy));
      if (b >= 0 && b < bands.length) { l += '#'; m += bands[b]; } else { l += ' '; m += ' '; }
    }
    lines.push(l);
    mask.push(m);
  }
  return { shape: lines.join('\n'), color: mask.join('\n') };
}

function addRainbow(anim) {
  // Another press keeps the one that's up for longer, rather than stacking.
  const up = treats(anim, 'rainbow')[0];
  if (up) { up.dieTime = Date.now() + RAINBOW_MS; return true; }
  const width = Math.max(20, Math.min(44, anim.width() - 30));
  const art = rainbowArt(width);
  const e = anim.newEntity({
    name: 'treat-rainbow',
    type: 'scenery',
    shape: art.shape,
    color: art.color,
    // Behind the trees and sun, in front of the sky only.
    position: [Math.floor((anim.width() - width) / 2), 1, DEPTH.canopy + 5],
    dieTime: Date.now() + RAINBOW_MS,
    autoTrans: true,
  });
  e.treat = 'rainbow';
  return true;
}

const KINDS = [
  { name: 'butterfly', add: addButterfly },
  { name: 'bird', add: addBird },
  { name: 'flower', add: addFlower },
];

// key is one character, or a whole escape sequence (arrow keys).
function addTreat(anim, key) {
  let kind = key === ' '
    ? { name: 'rainbow', add: addRainbow }
    : pick(KINDS);
  // Sky full of flyers: a flower instead, so the key still does something.
  if (!kind.add(anim)) {
    kind = KINDS[2];
    kind.add(anim);
  }
  sound.say(kind.name);
}

module.exports = { addTreat, rainbowArt };
