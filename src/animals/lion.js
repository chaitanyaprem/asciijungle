'use strict';

const animal = require('../animal');
const { mirror, shiftRow, lines, widthOf } = require('../artkit');

// Lion. Base drawing by "snd" from ascii.co.uk/art/lion — the sSSSs mane is
// what carries it. Faces left in the original; right is mirrored. Signature
// stripped, credit in the README.
const STAND_L = `
     sSSSs
    s(oo)s
    s(Y)Ss'._
      |\\,    "._
     / /| /___  \\
   cc-'cc'cc-,-__)
`;

const WALK_L_A = STAND_L;

// Resting: same head and mane, body dropped flat with paws tucked — lions
// spend the day doing exactly this in the shade.
const REST_L = `
     sSSSs
    s(oo)s
    s(Y)Ss______  _,
     \\____________\\/
      cc   cc   cc
`;

// The B frame is derived per side, after mirroring. Mirroring a shifted frame
// re-pads to a different width when the shifted row happens to be the widest,
// and the whole sprite jumps a column between frames.
const WALK_L_B = shiftRow(WALK_L_A, -1, 1);
const WALK_R_A = mirror(WALK_L_A);
const WALK_R_B = shiftRow(WALK_R_A, -1, 1);
const REST_R = mirror(REST_L);

const spec = {
  type: 'lion',
  sound: 'lion',
  feature: 'treeX',
  defaultColor: 'Y',
  baseSpeed: 0.5,
  frameSpeed: 0.18,
  actFrameSpeed: 0.05,
  actTicks: 80,
  actChance: 0.7,
  // Head column in the rest pose; offset pushes the lion into the shade
  // beside the trunk rather than on top of it.
  anchorLeft: 5,
  anchorRight: null,
  featureOffset: 15, // fully clear of the trunk, or it pokes through the tail gap
  art: {
    walkRight: [WALK_R_A, WALK_R_B],
    walkLeft: [WALK_L_A, WALK_L_B],
    actRight: [REST_R],
    actLeft: [REST_L],
  },
};

spec.anchorRight = widthOf(lines(REST_L)) - 1 - spec.anchorLeft;

function addLion(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addLion, spec };
