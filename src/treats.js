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
// Nearly screen-wide, with its feet on the ground behind the trees. It
// sweeps on from one side over SWEEP_TICKS, stays RAINBOW_MS, then sweeps
// off the same way.
const BANDS = 'RYGCBM';
const SWEEP_TICKS = 12;

// Concentric half-ellipses, each band one step in from the last. A cell is
// about 2.2x taller than wide, so a band is `t` rows thick at the top and
// 2.2t columns at the sides: the same thickness to the eye all the way round.
function rainbowArt(width, height) {
  const rx = (width - 1) / 2;
  const ry = height - 1;
  const t = Math.max(1, ry / 16);
  const inside = (dx, dy, k) => {
    const a = rx - k * t * 2.2, b = ry - k * t;
    return a > 0 && b > 0 && (dx / a) ** 2 + (dy / b) ** 2 <= 1;
  };
  const lines = [], mask = [];
  for (let row = 0; row < height; row++) {
    let l = '', m = '';
    for (let col = 0; col < width; col++) {
      const dx = col - rx, dy = ry - row + 0.5;
      let band = -1;
      for (let k = 0; k < BANDS.length && inside(dx, dy, k); k++) band = k;
      if (band >= 0 && !inside(dx, dy, BANDS.length)) { l += '█'; m += BANDS[band]; } else { l += ' '; m += ' '; }
    }
    lines.push(l);
    mask.push(m);
  }
  return { lines, color: mask.join('\n') };
}

// Frame k of a sweep shows (or, going off, hides) the first k/SWEEP_TICKS
// of the columns, counted from the side it starts on.
function sweepFrames(lines, fromLeft) {
  const w = lines[0].length;
  const cut = (k, show) => lines.map((l) => [...l].map((c, i) => {
    const pos = fromLeft ? i : w - 1 - i;
    const lit = pos < Math.ceil((k / SWEEP_TICKS) * w);
    return lit === show ? c : ' ';
  }).join('')).join('\n');
  const frames = [];
  for (let k = 0; k <= SWEEP_TICKS; k++) frames.push(cut(k, true));   // on
  for (let k = 0; k <= SWEEP_TICKS; k++) frames.push(cut(k, false));  // off
  return frames;
}

function sweep(e) {
  if (e.phase === 'on') {
    e.k += 1;
    if (e.k >= SWEEP_TICKS) { e.phase = 'hold'; e.until = Date.now() + RAINBOW_MS; }
  } else if (e.phase === 'hold') {
    if (Date.now() >= e.until) { e.phase = 'off'; e.k = 0; }
  } else {
    e.k += 1;
    if (e.k > SWEEP_TICKS) { e.alive = false; return; }
  }
  e.physFrame = e.phase === 'off' ? SWEEP_TICKS + 1 + e.k : e.k;
}

function addRainbow(anim) {
  // Another press keeps the one that's up for longer, rather than stacking.
  const up = treats(anim, 'rainbow')[0];
  if (up) {
    if (up.phase !== 'on') { up.phase = 'hold'; up.k = SWEEP_TICKS; up.until = Date.now() + RAINBOW_MS; }
    return true;
  }
  const width = Math.max(20, anim.width() - 4);
  const groundY = anim.world.groundY;
  const height = Math.max(6, Math.min(Math.round(width / 2 / 2.2), groundY - 1));
  const art = rainbowArt(width, height);
  const e = anim.newEntity({
    name: 'treat-rainbow',
    type: 'scenery',
    shape: sweepFrames(art.lines, Math.random() < 0.5),
    color: art.color,
    // Feet on the ground line; behind the trees and sun, in front of the sky.
    position: [Math.floor((anim.width() - width) / 2), groundY - height, DEPTH.canopy + 5],
    callback: sweep,
    autoTrans: true,
  });
  e.treat = 'rainbow';
  e.phase = 'on';
  e.k = 0;
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
