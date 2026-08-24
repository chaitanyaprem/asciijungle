'use strict';

const { DEPTH } = require('./depth');

// One jungle: one ground line, one of each landmark. Animals share the path
// and take *places* (a feature, or a stretch of path) rather than exclusive
// horizontal bands. Two opaque sprites on the same lane still blob if their
// x-ranges overlap, so occupancy is "does this seat / gap exist", not
// "which stripe of the screen do you own".

const GAP = 1;

function maxAnimals(anim) {
  // Honest cap from body width, not species count. A 30-column elephant
  // and a 38-column crocodile do not share a 80-column path with three friends.
  // Floor is 2: a 60-column window cannot hold three 18–30 column bodies.
  // The old max(3, …) forced an overlap on every small terminal.
  return Math.max(2, Math.min(4, Math.floor(anim.width() / 24)));
}

function buildWorld(anim) {
  const w = anim.width();
  const h = anim.height();
  // A thin hanging edge, not a forest ceiling. Leave the rest as sky
  // so the sun and birds have somewhere to be.
  const reserved = 14;
  const skyRows = Math.max(3, Math.min(6, Math.floor(h * 0.12)));
  const groundY = Math.max(skyRows + 12, h - 2);

  anim.world = {
    groundY: Math.min(groundY, h - 2),
    features: {
      waterX: Math.floor(w * 0.22),
      treeX: Math.floor(w * 0.50),
      bambooX: Math.floor(w * 0.78),
    },
    // Hands just above the giraffe crown, on vines that reach this row.
    swingY: Math.max(skyRows + 2, groundY - 12),
    swings: [],
    z: {
      animal: DEPTH.animal,
      shoulder: DEPTH.shoulder,
      scenery: DEPTH.scenery,
    },
  };
  anim.skyRows = skyRows;
  return anim.world;
}

function occupants(anim) {
  return anim.entities.filter((e) => e.alive && e.type !== 'scenery');
}

function canAdd(anim, lane) {
  if (lane === 'canopy') {
    return occupants(anim).filter((e) => e.lane === 'canopy').length < 2;
  }
  return occupants(anim).filter((e) => e.lane !== 'canopy').length < maxAnimals(anim);
}

function xOverlap(ax, aw, bx, bw, pad) {
  return ax - pad < bx + bw && ax + aw + pad > bx;
}

function roomAt(anim, x, w, except, lane) {
  const want = lane || 'path';
  for (const o of occupants(anim)) {
    if (o === except) continue;
    if ((o.lane || 'path') !== want) continue;
    if (xOverlap(x, w, o.x, o.width(), GAP)) return false;
  }
  return true;
}

function shoulderTaken(anim, except) {
  return occupants(anim).some((o) => o !== except && o.lane === 'shoulder');
}

function blockerAt(anim, e, nextX) {
  const lane = e.lane || 'path';
  const w = e.width();
  for (const o of occupants(anim)) {
    if (o === e) continue;
    if ((o.lane || 'path') !== lane) continue;
    if (xOverlap(nextX, w, o.x, o.width(), GAP)) return o;
  }
  return null;
}

// A landmark is busy if someone is using it or still walking toward it.
// 'anywhere' (hedgehog) is not a shared seat.
function featureBusy(anim, featureKey, except) {
  if (!featureKey || featureKey === 'anywhere') return false;
  for (const o of occupants(anim)) {
    if (o === except) continue;
    if (o.featureKey !== featureKey) continue;
    if (o.state === 'act') return true;
    if (o.state === 'walk' && o.targetX != null) return true;
  }
  return false;
}

function findClearX(anim, preferred, w, facingRight, except, lane) {
  const want = lane || 'path';
  const width = anim.width();
  const clamp = (x) => Math.max(0, Math.min(x, width - w));
  let x = clamp(preferred);
  if (roomAt(anim, x, w, except, want)) return x;
  const step = facingRight ? -3 : 3;
  for (let i = 0; i < 40; i++) {
    x = clamp(x + step);
    if (roomAt(anim, x, w, except, want)) return x;
  }
  for (let scan = 2; scan + w < width - 2; scan += 3) {
    if (roomAt(anim, scan, w, except, want)) return scan;
  }
  return null;
}

// Find a gap. force (a keypress) used to keep retiring until a body-sized
// hole existed — a 50-column crocodile emptied the path. Count-based retire
// in spawn() already swaps one animal when the path is full. If there is
// still no gap, spawn at the edge and let yield/shoulder unstick overlap.
function ensureClearX(anim, preferred, w, facingRight, force, lane) {
  const x = findClearX(anim, preferred, w, facingRight, null, lane);
  if (x != null) return x;
  if (!force) return null;
  const width = anim.width();
  return Math.max(0, Math.min(preferred, width - w));
}

function swingList(anim) {
  const raw = anim.world.swings && anim.world.swings.length
    ? anim.world.swings
    : [{ x: anim.world.features.treeX, y: anim.world.swingY }];
  return raw.map((p) => (typeof p === 'number' ? { x: p, y: anim.world.swingY } : p));
}

function addSwing(anim, x, y) {
  if (!anim.world.swings) anim.world.swings = [];
  anim.world.swings.push({ x, y });
}

function pickSwing(anim) {
  const taken = new Set();
  for (const o of occupants(anim)) {
    if (!o.featureKey || o.featureKey.indexOf('swing:') !== 0) continue;
    if (o.state === 'act' || o.targetX != null) taken.add(+o.featureKey.slice(6));
  }
  const free = swingList(anim).filter((p) => !taken.has(p.x));
  if (!free.length) return null;
  return free[Math.floor(Math.random() * free.length)];
}

function pickSwingX(anim) {
  const p = pickSwing(anim);
  return p ? p.x : null;
}

// Next perch in the facing direction, or undefined if the monkey should turn.
function nextSwing(anim, fromX, facingRight) {
  const pts = swingList(anim).slice().sort((a, b) => a.x - b.x);
  if (facingRight) return pts.find((p) => p.x > fromX + 4);
  for (let i = pts.length - 1; i >= 0; i--) {
    if (pts[i].x < fromX - 4) return pts[i];
  }
  return undefined;
}

function distanceToExit(anim, e) {
  return e.dx >= 0 ? anim.width() - e.x : e.x + e.width();
}

function summonCost(e) {
  if (e.state === 'leave') return 0;
  if (e.state === 'walk' && e.targetX == null) return 1;
  if (e.state === 'walk') return 2;
  return 3;
}

// When the path is full and a summon must still produce an animal, retire
// whoever loses least: leavers, then walk-pasts, then approaches, then acts.
function cheapestToRetire(anim, lane) {
  let best = null, bestKey = Infinity;
  for (const e of occupants(anim)) {
    if (lane && (e.lane || 'path') !== lane) continue;
    const cost = summonCost(e);
    let tie;
    if (cost === 2 && e.targetX != null) {
      tie = Math.max(0, 9999 - Math.abs(e.targetX - e.x));
    } else if (cost === 3) {
      tie = e.actLeft != null ? e.actLeft : 0;
    } else {
      tie = distanceToExit(anim, e);
    }
    const key = cost * 10000 + tie;
    if (key < bestKey) { bestKey = key; best = e; }
  }
  // Never bump a mid-act animal. A full path of drinkers stays put; the
  // keypress is refused rather than cancelling a drink.
  if (best && summonCost(best) === 3) return null;
  return best;
}

module.exports = {
  buildWorld, occupants, canAdd, maxAnimals, roomAt, blockerAt, shoulderTaken,
  featureBusy, addSwing, pickSwing, pickSwingX, nextSwing, findClearX, ensureClearX, cheapestToRetire,
  distanceToExit, summonCost,
};
