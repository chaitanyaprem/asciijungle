'use strict';

const animal = require('../animal');
const { mirror, shiftRow, lines, widthOf } = require('../artkit');

// Crocodile. Drawn to read at a glance while walking right: tail, body,
// 00 eyes, snout leading. The archive piece faced the wrong way in walkRight
// (snout on the left) so a right-going croc looked like it was reversing, and
// the lurk pose was only a pair of eyes.
const WALK_R_A = `
  ___
 /   \\        ____
/     \\_____/  00  \\
 \\__________________>
   V    V    V    V
`;

const WALK_R_B = shiftRow(WALK_R_A, -1, 1);
const WALK_L_A = mirror(WALK_R_A);
const WALK_L_B = shiftRow(WALK_L_A, -1, 1);

// Same silhouette in the water, so standing up does not jump 13 columns
// wider and fuse with whoever is on the path.
const LURK_R = `
  ___        ____
 /   \\_____/  00  \\
~~~~ ~~ ~~~~ ~~ ~~~~
`;

const LURK_L = mirror(LURK_R);

const spec = {
  type: 'crocodile',
  sound: 'crocodile',
  feature: 'waterX',
  defaultColor: 'G',
  baseSpeed: 0.4,
  frameSpeed: 0.16,
  actFrameSpeed: 0.03,
  actTicks: 120,
  actChance: 0.9,
  sink: 1,
  // Eye column in the lurk pose, so the head sits on the waterhole.
  anchorRight: 14,
  anchorLeft: null,
  art: {
    walkRight: [WALK_R_A, WALK_R_B],
    walkLeft: [WALK_L_A, WALK_L_B],
    actRight: [LURK_R],
    actLeft: [LURK_L],
  },
};

spec.anchorLeft = widthOf(lines(LURK_R)) - 1 - spec.anchorRight;

function addCrocodile(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addCrocodile, spec };
