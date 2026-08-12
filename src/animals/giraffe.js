'use strict';

const animal = require('../animal');
const { mirror, shiftRow, lines, widthOf } = require('../artkit');

// Giraffe. What says "giraffe" in a dozen rows: a neck that *slants* up to a
// small head with ossicones, a body that slopes down to the rump, spots, and
// legs longer than anything else in the scene. The first draft had a vertical
// neck and a boxy body and read as a ladder standing next to a crate.
//
// Drawn facing right; the left set is mirrored. In the browse pose the neck
// straightens vertical and the head rises into the tree crown — useArt() pegs
// feet to the ground line, so the extra rows grow upward.
const WALK_R_A = `
              _\\/
             (..)
             / /
            / /
           / /
    ______/ /
   ( o  o  /
   | o  o |
    \\____/
    ||  ||
    ||  ||
`;

const WALK_R_B = shiftRow(WALK_R_A, -1, 1);

const BROWSE_R = `
        _\\/
       (..)
        ||
        ||
        ||
        ||
  ______||
 ( o  o  |
 | o  o |
  \\____/
  ||  ||
  ||  ||
`;

const WALK_L_A = mirror(WALK_R_A);
const WALK_L_B = shiftRow(WALK_L_A, -1, 1);
const BROWSE_L = mirror(BROWSE_R);

const spec = {
  type: 'giraffe',
  sound: 'giraffe',
  feature: 'treeX',
  defaultColor: 'Y',
  baseSpeed: 0.5,
  frameSpeed: 0.18,
  actFrameSpeed: 0.06,
  actTicks: 60,
  actChance: 0.8,
  // Muzzle column in the browse pose, so the head lands in the tree crown.
  anchorRight: 10,
  anchorLeft: null, // derived below from the mirror
  art: {
    walkRight: [WALK_R_A, WALK_R_B],
    walkLeft: [WALK_L_A, WALK_L_B],
    actRight: [BROWSE_R],
    actLeft: [BROWSE_L],
  },
};

spec.anchorLeft = widthOf(lines(BROWSE_R)) - 1 - spec.anchorRight;

function addGiraffe(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addGiraffe, spec };
