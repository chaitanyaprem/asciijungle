'use strict';

const animal = require('../animal');
const { mirror } = require('../artkit');

// Monkey. Lives in the canopy: brachiates along vines and tree trunks
// instead of knuckle-walking the path (that pose fought the sitting lion
// for the same doorstep). The tail and hanging arms are the silhouette.
//
// Walk frames are the swing. Act is a hang-and-eat at one vine, still
// off the ground. Sit art is a leftover of ejm97 via ascii.co.uk/art/monkey.
const SWING_R_A = `
      |
   w-c(..)
     /||\\
      / \\
`;

const SWING_R_B = `
     /
  c(..)-w
    /||\\
    / \\
`;

const HANG = `
      |
   w c(..)o
     \\__( )
      /  \\
`;

const SWING_L_A = mirror(SWING_R_A);
const SWING_L_B = mirror(SWING_R_B);

const spec = {
  type: 'monkey',
  sound: 'monkey',
  lane: 'canopy',
  feature: 'swing',
  defaultColor: 'r',
  baseSpeed: 0.85,
  frameSpeed: 0.28,
  actFrameSpeed: 0.14,
  actTicks: 55,
  actChance: 0.95,
  anchorLeft: 4,
  anchorRight: 6,
  art: {
    walkRight: [SWING_R_A, SWING_R_B],
    walkLeft: [SWING_L_A, SWING_L_B],
    actRight: [HANG],
    actLeft: [HANG],
  },
};

function addMonkey(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addMonkey, spec };
