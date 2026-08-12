'use strict';

const animal = require('../animal');
const { mirror, shiftRow } = require('../artkit');

// Monkey. Walks on all fours with the tail arced over its back — the tail is
// the silhouette that separates "monkey" from "small bear". At the tall tree
// it sits up on its haunches and eats, front-on; the sit pose borrows the
// shape of ejm97's standing monkey from ascii.co.uk/art/monkey.
const WALK_R_A = `
    @
   ( \\_____   __
    \\      \\ (..)
     \\      \\/ --'
     _|  |   |  |
    (_,' |   |,'
`;

const WALK_R_B = shiftRow(WALK_R_A, -1, 1);
const WALK_L_A = mirror(WALK_R_A);
const WALK_L_B = shiftRow(WALK_L_A, -1, 1);

const SIT = `
      __
   w c(..)o
    \\__( )
      /  \\
     ( /\\ )
     _\\  /_
`;

const spec = {
  type: 'monkey',
  sound: 'monkey',
  feature: 'treeX',
  defaultColor: 'r',
  baseSpeed: 0.7,
  frameSpeed: 0.22,
  actFrameSpeed: 0.1,
  actTicks: 50,
  actChance: 0.75,
  // Sits at the base of the trunk, on the opposite side from where the lion
  // rests so the two never share a doorstep.
  anchorLeft: 5,
  anchorRight: 5,
  featureOffset: -9,
  art: {
    walkRight: [WALK_R_A, WALK_R_B],
    walkLeft: [WALK_L_A, WALK_L_B],
    actRight: [SIT],
    actLeft: [SIT],
  },
};

function addMonkey(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addMonkey, spec };
