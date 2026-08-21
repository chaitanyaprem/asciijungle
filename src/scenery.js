'use strict';

const { DEPTH } = require('./depth');
const { addSwing } = require('./world');

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
  // Crown sits at giraffe-browse height so the muzzle lands in leaves, not
  // bark. Leftover air on a tall terminal is canopy's job, not a 20-row pole.
  const crown = [
    '   __/\\__   ',
    ' _/@@@@@@\\_ ',
    '/@@@@@@@@@@\\',
    '\\_@@@@@@@@_/',
    '  \\@@@@@@/  ',
  ];
  const trunkRows = Math.max(1, GIRAFFE_BROWSE_HEIGHT - crown.length + 1);
  const lines = crown.slice();
  const mask = crown.map((r) => r.replace(/@/g, 'G').replace(/[^G ]/g, 'g'));
  for (let i = 0; i < trunkRows; i++) {
    if (i === 1 && trunkRows > 2) {
      lines.push('  ,@||@,    ');
      mask.push('  Gg yG     ');
    } else {
      lines.push('    |  |    ');
      mask.push('    y  y    ');
    }
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
  addSwing(anim, anim.world.features.treeX, anim.world.groundY - lines.length + 2);
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

// A couple of lianas hanging off the path tree, not out of the sky.
// Monkeys grip these; the sky stays for sun and clouds.
function addVines(anim) {
  const treeX = anim.world.features.treeX;
  const startY = Math.max(2, anim.world.groundY - GIRAFFE_BROWSE_HEIGHT);
  const endY = Math.max(startY + 5, anim.world.swingY + 3);
  const len = endY - startY;
  if (len < 3) return;
  const xs = [treeX - 3, treeX + 4];
  for (let i = 0; i < xs.length; i++) {
    const lines = [];
    for (let r = 0; r < len; r++) lines.push(r % 3 === 1 ? '/|' : '||');
    anim.newEntity({
      name: `vine-${i}`,
      type: 'scenery',
      shape: lines.join('\n'),
      position: [xs[i], startY, anim.world.z.scenery - 1],
      defaultColor: 'g',
      autoTrans: true,
    });
    addSwing(anim, xs[i], startY + 1);
  }
}

const CROWNS = {
  small: [
    '  /@@\\  ',
    ' /@@@@\\ ',
    '  \\@@/  ',
  ],
  mid: [
    '   __/\\__   ',
    ' _/@@@@@@\\_ ',
    '/@@@@@@@@@@\\',
    '  \\@@@@@@/  ',
  ],
  tall: [
    '    ____/\\____    ',
    '  _/@@@@@@@@@@\\_  ',
    ' /@@@@@@@@@@@@@@\\ ',
    '|@@@@@@@@@@@@@@@@|',
    '  \\_@@@@@@@@@@_/  ',
    '    \\_@@@@@@_/    ',
  ],
};

function addGroveTree(anim, x, totalH) {
  const crown = totalH >= 14 ? CROWNS.tall : totalH >= 10 ? CROWNS.mid : CROWNS.small;
  const trunkRows = Math.max(1, totalH - crown.length);
  const lines = crown.slice();
  const mask = crown.map((r) => r.replace(/@/g, 'G').replace(/[^G ]/g, 'g'));
  const pad = Math.floor((Math.max(...crown.map((r) => r.length)) - 4) / 2);
  const trunk = ' '.repeat(pad) + '|  |';
  const tuft = ' '.repeat(Math.max(0, pad - 2)) + ',@||@,';
  for (let i = 0; i < trunkRows; i++) {
    lines.push(i === 1 && trunkRows > 2 ? tuft : trunk);
    mask.push((i === 1 && trunkRows > 2 ? tuft : trunk).replace(/@/g, 'G').replace(/[|,]/g, 'y'));
  }
  const w = Math.max(...lines.map((l) => l.length));
  anim.newEntity({
    name: `grove-${x}`,
    type: 'scenery',
    shape: lines.join('\n'),
    color: mask.join('\n'),
    position: [x - Math.floor(w / 2), anim.world.groundY - lines.length, anim.world.z.scenery],
    defaultColor: 'g',
    autoTrans: true,
  });
  addSwing(anim, x, anim.world.groundY - lines.length + 2);
}

// Extra trees of mixed heights so monkeys have a run of crowns to hop.
function addGrove(anim) {
  const w = anim.width();
  // Slots sit between water (0.22), browse tree (0.50) and bamboo (0.78).
  // Count grows with the terminal so monkeys hop crown-to-crown instead of
  // gliding a long empty gap (the 0.50–0.88 stretch on an 80-col screen).
  const slots = w >= 110
    ? [0.08, 0.18, 0.34, 0.64, 0.90]
    : w >= 70
      ? [0.10, 0.34, 0.64, 0.90]
      : [0.12, 0.36, 0.88];
  const heights = [8, 14, 10, 16, 12];
  for (let i = 0; i < slots.length; i++) {
    addGroveTree(anim, Math.floor(w * slots[i]), heights[i % heights.length]);
  }
}

function addSun(anim) {
  const art = [
    '       \\   |   /      ',
    '        \\  |  /       ',
    '    \\     |||     /   ',
    '   -----(@@@@@)-----  ',
    '        /  |  \\       ',
    '       /   |   \\      ',
  ].join('\n');
  anim.newEntity({
    name: 'sun',
    type: 'scenery',
    shape: art,
    position: [Math.max(1, anim.width() - 24), 0, DEPTH.skyDecor],
    defaultColor: 'Y',
    autoTrans: true,
  });
}

const CLOUD = [
  '    .--.    ',
  ' .-(    ).  ',
  '(___.__.__)',
].join('\n');

function drift(e, anim) {
  e.physX += e.dx;
  e.physFrame += e.frameSpeed;
  e.x = Math.floor(e.physX);
  if (e.dx > 0 && e.x > anim.width()) e.physX = -e.width();
  if (e.dx < 0 && e.x + e.width() < 0) e.physX = anim.width();
  e.x = Math.floor(e.physX);
  if (e.baseY != null) {
    e.physY = e.baseY + Math.sin(e.physX * 0.18) * 1.1;
    e.y = Math.floor(e.physY);
  }
}

function addClouds(anim) {
  const n = Math.max(2, Math.floor(anim.width() / 36));
  for (let i = 0; i < n; i++) {
    anim.newEntity({
      name: `cloud-${i}`,
      type: 'scenery',
      shape: CLOUD,
      position: [
        Math.floor((i + 0.3) * (anim.width() / n)),
        1 + (i % 2),
        DEPTH.skyDecor + 1,
      ],
      callbackArgs: [0.06, 0, 0, 0],
      callback: drift,
      defaultColor: 'W',
      autoTrans: true,
    });
  }
}

// Side-on flyers, no legs. The archive land-bird had _|_ feet so a
// flock in the sky read as walking. Wings beat around a stable body;
// drift() bobs physY so they don't ride a wire.
const BIRD_R_UP = [
  '   /\\ ',
  ' -(o)>',
  '   \\/ ',
].join('\n');
const BIRD_R_DN = [
  '      ',
  ' -(o)>',
  '  /  \\',
].join('\n');
const BIRD_L_UP = [
  ' /\\   ',
  '<(o)- ',
  ' \\/   ',
].join('\n');
const BIRD_L_DN = [
  '      ',
  '<(o)- ',
  '/  \\  ',
].join('\n');

function addBirds(anim) {
  const n = Math.max(3, Math.floor(anim.width() / 28));
  const yMax = Math.max(3, anim.skyRows + 3);
  for (let i = 0; i < n; i++) {
    const right = i % 2 === 0;
    const y = 1 + Math.floor(Math.random() * yMax);
    const e = anim.newEntity({
      name: `bird-${i}`,
      type: 'scenery',
      shape: right ? [BIRD_R_UP, BIRD_R_DN] : [BIRD_L_UP, BIRD_L_DN],
      position: [
        Math.floor(Math.random() * anim.width()),
        y,
        DEPTH.skyDecor,
      ],
      callbackArgs: [right ? 0.45 : -0.4, 0, 0, 0.2],
      callback: drift,
      defaultColor: 'W',
      autoTrans: true,
    });
    e.baseY = y;
  }
}

function addScenery(anim) {
  addSun(anim);
  addClouds(anim);
  addBirds(anim);
  addVines(anim);
  addGrove(anim);
  addGround(anim);
  addShrubs(anim);
  addTallTree(anim);
  addBamboo(anim);
  addWaterhole(anim);
  addForeground(anim);
}

module.exports = { addScenery };
