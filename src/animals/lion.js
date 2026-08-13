'use strict';

const animal = require('../animal');
const { mirror, shiftRow, lines, widthOf } = require('../artkit');

// Lion. Mane first — a ring of @ around a cat face — then a body and
// four legs. The archive "snd" piece was a texture blob once mirrored;
// this one is drawn to read at a glance.
const WALK_R_A = `
      @@@@@
     @ o^o @
     @ \\_/ @__.
      \\___/   |
      || ||   |
      || ||  /
`;

const WALK_R_B = shiftRow(WALK_R_A, -1, 1);
const WALK_L_A = mirror(WALK_R_A);
const WALK_L_B = shiftRow(WALK_L_A, -1, 1);

const REST_R = `
      @@@@@
     @-o^o-@
     @\\___/@~~
       u   u
`;

const REST_L = mirror(REST_R);

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
  anchorLeft: 6,
  anchorRight: null,
  featureOffset: 12,
  art: {
    walkRight: [WALK_R_A, WALK_R_B],
    walkLeft: [WALK_L_A, WALK_L_B],
    actRight: [REST_R],
    actLeft: [REST_L],
  },
};

spec.anchorRight = widthOf(lines(REST_R)) - 1 - spec.anchorLeft;

function addLion(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addLion, spec };
