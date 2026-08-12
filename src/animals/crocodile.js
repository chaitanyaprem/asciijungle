'use strict';

const animal = require('../animal');
const { mirror, shiftRow, lines, widthOf } = require('../artkit');

// Crocodile. Long, low, ridged back, toothy snout, dragging tail. Waddles to
// the waterhole, slides in, and lurks with only eyes and snout above the
// surface — the lurk pose's bottom row is its own waterline, which lands
// flush with the waterhole surface because feet are pegged to the ground
// line. Lurks longer than anything else acts, because that's the whole job of
// being a crocodile.
const WALK_R_A = `
                            __
  _/\\_/\\_/\\_/\\_/\\_______--(oo)_
 <__,--,__,--,__,--,____________'v'v'>
    /'\\   /'\\      /'\\   /'\\
`;

const WALK_R_B = shiftRow(WALK_R_A, -1, 1);
const WALK_L_A = mirror(WALK_R_A);
const WALK_L_B = shiftRow(WALK_L_A, -1, 1);

const LURK_R = `
          __
  __/\\___(oo)_______,
 ~~~~~~~~~~~~~'v'v'~~
`;

const LURK_L = mirror(LURK_R);

const spec = {
  type: 'crocodile',
  sound: 'crocodile',
  feature: 'waterX',
  defaultColor: 'G',
  baseSpeed: 0.35,
  frameSpeed: 0.15,
  actFrameSpeed: 0.03,
  actTicks: 120,
  actChance: 0.9,
  sink: 1, // lurk one row lower so its waterline sits on the pond surface
  // Eye-bump column in the lurk pose, centred on the waterhole.
  anchorRight: 10,
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
