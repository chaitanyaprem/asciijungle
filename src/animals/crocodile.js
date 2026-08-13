'use strict';

const animal = require('../animal');
const { mirror, shiftRow, lines, widthOf } = require('../artkit');

// Crocodile. Short enough to read as one animal, not a train: snout, eye,
// ridged back, a few feet. The old 38-column walk smeared into the ground
// line. Lurk is just eyes and bumps on the water.
const WALK_R_A = `
         __
   ./\\/\\(oo)______
  <~-~-~-~-~-~-~-'
     n    n    n
`;

const WALK_R_B = shiftRow(WALK_R_A, -1, 1);
const WALK_L_A = mirror(WALK_R_A);
const WALK_L_B = shiftRow(WALK_L_A, -1, 1);

const LURK_R = `
      (oo)
  ~~~~n~~n~~~~
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
  anchorRight: 8,
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
