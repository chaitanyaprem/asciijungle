'use strict';

// Treats: what a non-animal key does. A butterfly, a bird or a flower, and
// the space bar brings a rainbow. They are scenery to the world (occupants()
// skips them), so a treat never takes an animal's seat, blocks the path or
// swaps anyone out. Flyers have a cap; past it a key grows a flower, and
// only the oldest flower makes way.

const { DEPTH } = require('./depth');
const { parseFrame, parseMask } = require('./engine');
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

// A flower grows rather than pops: seed, shoot, bud, bloom, one stage every
// GROW_STEP_MS. As its minute runs out it goes back down the same way, so it
// leaves as gently as it came.
const GROW_STEP_MS = 700;

function flowerFrames(head, color) {
  return {
    shape: [
      '   \n . ',
      ' , \n | ',
      ' o \n | ',
      `${head}\n | `,
    ],
    color: [
      '   \n g ',
      ' G \n g ',
      ` ${color} \n g `,
      `${color.repeat(3)}\n g `,
    ],
  };
}

function grow(e) {
  const now = Date.now();
  const last = e.frames.length - 1;
  const up = Math.floor((now - e.born) / GROW_STEP_MS);
  const down = Math.ceil((e.dieTime - now) / GROW_STEP_MS);
  e.physFrame = Math.max(0, Math.min(last, up, down));
}

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
  const color = pick(BRIGHT);
  const art = flowerFrames(pick(HEADS), color);
  const born = Date.now();
  const e = anim.newEntity({
    name: 'treat-flower',
    type: 'scenery',
    shape: art.shape,
    color: art.color,
    // Behind the animals, in front of the trees.
    position: [x, anim.world.groundY - 2, anim.world.z.scenery - 2],
    callback: grow,
    dieTime: born + FLOWER_MS,
    defaultColor: color,
    autoTrans: true,
  });
  e.treat = 'flower';
  e.born = born;
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

// ────────────────────────────── rain ─────────────────────────────
// R: drops fall from the top to the ground for RAIN_MS. RAINBOW_AT_MS in,
// the rainbow comes out behind the rain and stays while it pours, going
// RAINBOW_MS after the rain stops. One entity whose single frame is redrawn
// from the drop list every tick.
const RAIN_MS = 25000;
const RAINBOW_AT_MS = 12000;
// One row per tick (about 4.5 rows a second) is a gentle fall; two read as
// a downpour streaking past. Half the drops per tick keeps the same number
// on screen, since each one now lives twice as long.
const DROPS_PER_TICK = 0.03; // new drops per column per tick
const DROP_FALL = 1;         // rows per tick

// Wind: while it rains, each left or right arrow tilts the rain a step that
// way, up to WIND_STEPS; the other arrow straightens it again. A step is
// WIND_STEP columns sideways per row fallen. The wind eases toward where the
// arrows put it by WIND_EASE a tick, so the rain leans over in about a
// second instead of snapping.
const WIND_STEP = 0.5;
const WIND_STEPS = 2;
const WIND_EASE = 0.1;
const ARROW = /\x1b[[O]([CD])/g; // right, left; normal or application mode

function rainFrame(e, anim) {
  const w = anim.width();
  const h = anim.world.groundY;
  const rows = Array.from({ length: h }, () => new Array(w).fill(' '));
  const cols = Array.from({ length: h }, () => new Array(w).fill(' '));
  // Drawn along the way it falls: down and to the right is '\'.
  const slant = e.wind >= 0.25 ? '\\' : e.wind <= -0.25 ? '/' : null;
  for (const d of e.drops) {
    const x = Math.round(d.x);
    if (x < 0 || x >= w) continue;
    rows[d.y][x] = slant || d.c;
    cols[d.y][x] = d.color;
  }
  e.frames = [parseFrame(rows.map((r) => r.join('')).join('\n'), true)];
  e.colorMasks = parseMask(cols.map((r) => r.join('')).join('\n'));
  e.physFrame = 0;
}

function pour(e, anim) {
  const w = anim.width();
  const h = anim.world.groundY;
  const to = e.windSteps * WIND_STEP;
  e.wind += Math.max(-WIND_EASE, Math.min(WIND_EASE, to - e.wind));
  for (const d of e.drops) { d.y += DROP_FALL; d.x += e.wind * DROP_FALL; }
  // A slanted drop can start off screen upwind and drift in, so drops are
  // kept (and started) over the whole stretch that can still reach the
  // screen before the ground.
  const reach = h * Math.abs(e.wind);
  const lo = e.wind > 0 ? -reach : 0;
  const hi = e.wind < 0 ? w + reach : w;
  e.drops = e.drops.filter((d) => d.y < h && d.x > -reach - 1 && d.x < w + reach + 1);
  const now = Date.now();
  if (now < e.until) {
    // addRainbow on one that's up restarts its hold, so calling it every
    // tick keeps the rainbow out for as long as it rains.
    if (now - e.start >= RAINBOW_AT_MS) addRainbow(anim);
    const n = Math.round((hi - lo) * DROPS_PER_TICK * (0.7 + Math.random() * 0.6));
    for (let i = 0; i < n; i++) {
      e.drops.push({
        x: lo + Math.random() * (hi - lo),
        y: Math.floor(Math.random() * DROP_FALL),
        c: Math.random() < 0.8 ? '|' : '\'',
        color: Math.random() < 0.7 ? 'C' : 'B',
      });
    }
  } else if (!e.drops.length) {
    e.alive = false;
    return;
  }
  rainFrame(e, anim);
}

function addRain(anim) {
  // Another press keeps it raining longer rather than doubling the drops.
  const up = treats(anim, 'rain')[0];
  if (up) {
    up.until = Date.now() + RAIN_MS;
    return true;
  }
  const e = anim.newEntity({
    name: 'treat-rain',
    type: 'scenery',
    shape: ' ',
    // In front of the animals, behind the foreground grass.
    position: [0, 0, DEPTH.skyDecor - 1],
    callback: pour,
    autoTrans: true,
  });
  e.treat = 'rain';
  e.drops = [];
  e.wind = 0;      // columns sideways per row, right is positive
  e.windSteps = 0; // where the arrows have set it, -WIND_STEPS..WIND_STEPS
  e.start = Date.now();
  e.until = e.start + RAIN_MS;
  return true;
}

// Shown on screen, not named aloud.
const QUIET = new Set(['flower', 'rainbow', 'rain']);

const KINDS = [
  { name: 'butterfly', add: addButterfly },
  { name: 'bird', add: addBird },
  { name: 'flower', add: addFlower },
];

// Left and right arrows steer the rain while it's up. Returns false if
// there is no rain or key holds no left or right arrow.
function blow(anim, key) {
  const rain = treats(anim, 'rain')[0];
  if (!rain) return false;
  const arrows = [...key.matchAll(ARROW)];
  if (!arrows.length) return false;
  for (const [, dir] of arrows) {
    const step = dir === 'C' ? 1 : -1;
    rain.windSteps = Math.max(-WIND_STEPS, Math.min(WIND_STEPS, rain.windSteps + step));
  }
  return true;
}

// key is one character, or a whole escape sequence (arrow keys).
function addTreat(anim, key) {
  if (blow(anim, key)) return;
  let kind = key === ' ' ? { name: 'rainbow', add: addRainbow }
    : key === 'r' ? { name: 'rain', add: addRain }
    : pick(KINDS);
  // Sky full of flyers: a flower instead, so the key still does something.
  if (!kind.add(anim)) {
    kind = KINDS[2];
    kind.add(anim);
  }
  if (!QUIET.has(kind.name)) sound.say(kind.name);
}

module.exports = { addTreat, rainbowArt };
