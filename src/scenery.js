'use strict';

const { DEPTH } = require('./depth');

// The scenery is generated rather than hand-drawn: the tree has to reach from
// the single ground line up to where a browsing giraffe's head will be, and
// that distance isn't known until we know the terminal height.

function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

// ───────────────────────────── ground ─────────────────────────────
// Mostly a flat baseline with occasional tufts, so the eye reads it as a
// horizon rather than as noise.
function groundLine(w) {
  let s = '';
  for (let x = 0; x < w; x++) {
    const r = Math.random();
    s += r < 0.06 ? '^' : r < 0.13 ? ',' : r < 0.18 ? '.' : '_';
  }
  return s;
}

function addGround(anim) {
  const w = anim.width();
  const art = groundLine(w);
  anim.newEntity({
    name: 'ground',
    type: 'scenery',
    shape: art,
    color: 'g'.repeat(w),
    position: [0, anim.world.groundY, anim.world.z.scenery],
    defaultColor: 'g',
  });
}

// ──────────────────────────── waterhole ───────────────────────────
// Sits flush with the ground line so a drinking elephant's trunk lands in it.
function addWaterhole(anim) {
  const width = Math.max(9, Math.floor(anim.width() * 0.11));
  const surface = '~'.repeat(width);
  const rim = '\\' + '_'.repeat(width) + '/';
  anim.newEntity({
    name: 'waterhole',
    type: 'scenery',
    // Two nearly-identical ripple frames. An alternate frame of solid '-'
    // reads as a road rather than water, so the shimmer stays subtle.
    shape: [
      ` ${surface} \n${rim}`,
      ` ${surface.replace(/~/g, (c, i) => (i % 4 === 2 ? '-' : c))} \n${rim}`,
    ],
    color: [
      ' ' + 'c'.repeat(width) + ' \n' + 'b'.repeat(width + 2),
      ' ' + 'C'.repeat(width) + ' \n' + 'b'.repeat(width + 2),
    ],
    position: [
      anim.world.features.waterX - Math.floor(width / 2),
      anim.world.groundY,
      anim.world.z.scenery - 1,
    ],
    callbackArgs: [0, 0, 0, 0.05],
    defaultColor: 'c',
    autoTrans: true,
  });
}

// ──────────────────────────── tall tree ───────────────────────────
// The giraffe's browsing target. The crown is placed so a giraffe standing at
// the trunk with its neck up has its head among the leaves.
const GIRAFFE_BROWSE_HEIGHT = 11;

function addTallTree(anim) {
  // Stretch the trunk to the canopy so the column reads as one jungle, not
  // a tree sitting in a blank warehouse.
  const room = anim.world.groundY - anim.skyRows;
  const reach = Math.max(GIRAFFE_BROWSE_HEIGHT, room);
  const crown = [
    '   __/\\__   ',
    ' _/@@@@@@\\_ ',
    '/@@@@@@@@@@\\',
    '\\_@@@@@@@@_/',
    '  \\@@@@@@/  ',
  ];
  const trunkRows = Math.max(1, reach - crown.length);
  const lines = crown.slice();
  const mask = crown.map((r) => r.replace(/@/g, 'G').replace(/[^G ]/g, 'g'));
  for (let i = 0; i < trunkRows; i++) {
    lines.push('    |  |    ');
    mask.push('    y  y    ');
  }
  anim.newEntity({
    name: 'tree',
    type: 'scenery',
    shape: lines.join('\n'),
    color: mask.join('\n'),
    position: [
      anim.world.features.treeX - 6,
      anim.world.groundY - lines.length,
      anim.world.z.scenery,
    ],
    defaultColor: 'g',
    autoTrans: true,
  });
}

// ───────────────────────────── bamboo ─────────────────────────────
// The panda's target. Stalks of slightly different heights so the clump has a
// silhouette instead of reading as a barcode.
function addBamboo(anim) {
  const stalks = 5;
  const heights = [];
  for (let i = 0; i < stalks; i++) heights.push(4 + Math.floor(Math.random() * 3));
  const tall = Math.max(...heights);
  const lines = [];
  const mask = [];
  for (let row = 0; row < tall; row++) {
    let l = '', m = '';
    for (let s = 0; s < stalks; s++) {
      const top = tall - heights[s];
      if (row < top) { l += '  '; m += '  '; continue; }
      if (row === top) { l += '\\/'; m += 'GG'; }
      else { l += ((row - top) % 3 === 0 ? '==' : '||'); m += 'gg'; }
    }
    lines.push(l);
    mask.push(m);
  }
  anim.newEntity({
    name: 'bamboo',
    type: 'scenery',
    shape: lines.join('\n'),
    color: mask.join('\n'),
    position: [
      anim.world.features.bambooX - stalks,
      anim.world.groundY - tall,
      anim.world.z.scenery,
    ],
    defaultColor: 'g',
    autoTrans: true,
  });
}

// ──────────────────────── filler vegetation ───────────────────────
const SHRUBS = [
  '  ,@,  \n  \\|/  ',
  ' @@@ \n  |  ',
  ' ,%, \n \\|/ ',
  '  \\|/  \n   |   ',
];

function addShrubs(anim) {
  const w = anim.width();
  const n = Math.max(2, Math.floor(w / 28));
  const f = anim.world.features;
  const avoid = [f.waterX, f.treeX, f.bambooX];
  for (let i = 0; i < n; i++) {
    const x = Math.floor(Math.random() * (w - 8));
    if (avoid.some((a) => Math.abs(a - x) < 10)) continue;
    const art = pick(SHRUBS);
    const rows = art.split('\n');
    anim.newEntity({
      name: `shrub-${i}`,
      type: 'scenery',
      shape: art,
      color: art.replace(/[@%]/g, 'G').replace(/[\\|/]/g, 'g').replace(/,/g, 'G'),
      position: [x, anim.world.groundY - rows.length, anim.world.z.scenery],
      defaultColor: 'g',
      autoTrans: true,
    });
  }
}

// ─────────────────────────── sky & canopy ─────────────────────────
// Leaves hanging into the top of the frame. Being the farthest thing back,
// this is what sells "you are looking *into* a jungle" rather than at a strip.
function addCanopy(anim) {
  const w = anim.width();
  const rows = Math.max(2, anim.skyRows - 1);
  const grid = Array.from({ length: rows }, () => new Array(w).fill(' '));

  // Per-cell randomness reads as television static. Leaves have to hang in
  // clumps: a solid band along the very top, then fringes of varying length
  // dangling from it, which is what the eye expects from a canopy edge.
  for (let x = 0; x < w; x++) {
    if (Math.random() < 0.92) grid[0][x] = pick(['@', '@', '@', '%', '&']);
  }
  const fringes = Math.floor(w / 3);
  for (let f = 0; f < fringes; f++) {
    const x = Math.floor(Math.random() * w);
    const len = 1 + Math.floor(Math.random() * (rows - 1));
    for (let r = 1; r <= len && r < rows; r++) {
      grid[r][x] = pick(['@', '%', '&', '*']);
      // Widen the odd fringe into a small clump so it isn't all single strands.
      if (Math.random() < 0.35 && x + 1 < w) grid[r][x + 1] = pick(['@', '%']);
    }
  }

  const lines = grid.map((r) => r.join(''));
  const mask = lines.map((l) =>
    l.replace(/[^ ]/g, () => (Math.random() < 0.4 ? 'G' : 'g')));
  anim.newEntity({
    name: 'canopy',
    type: 'scenery',
    shape: lines.join('\n'),
    color: mask.join('\n'),
    position: [0, 0, DEPTH.canopy],
    defaultColor: 'g',
    autoTrans: true,
  });
}

// A few shafts of light between the leaves.
function addSky(anim) {
  const w = anim.width();
  const rows = anim.skyRows;
  const lines = [];
  for (let r = 0; r < rows; r++) {
    let l = '';
    for (let x = 0; x < w; x++) l += Math.random() < 0.04 ? '.' : ' ';
    lines.push(l);
  }
  anim.newEntity({
    name: 'sky',
    type: 'scenery',
    shape: lines.join('\n'),
    position: [0, 0, DEPTH.sky],
    defaultColor: 'Y',
    autoTrans: true,
  });
}

// Tall grass across the very bottom — the closest thing to the viewer, and the
// last cue that the scene has depth.
function addForeground(anim) {
  const w = anim.width();
  const y = anim.height() - 1;
  // Clumps of blades with gaps between them. A solid row of random slashes
  // just looks like corrupted output.
  let l = '', m = '';
  while (l.length < w) {
    if (Math.random() < 0.3) { l += ' '.repeat(1 + Math.floor(Math.random() * 3)); continue; }
    l += pick(['\\|/', '\\|', '|/', '\\\\|', '|//', '\\|/|']);
  }
  l = l.slice(0, w);
  for (let x = 0; x < w; x++) m += l[x] === ' ' ? ' ' : (Math.random() < 0.5 ? 'G' : 'g');
  anim.newEntity({
    name: 'foreground',
    type: 'scenery',
    shape: l,
    color: m,
    position: [0, y, DEPTH.foreground],
    defaultColor: 'G',
  });
}

function addScenery(anim) {
  addSky(anim);
  addCanopy(anim);
  addGround(anim);
  addShrubs(anim);
  addTallTree(anim);
  addBamboo(anim);
  addWaterhole(anim);
  addForeground(anim);
}

module.exports = { addScenery };
