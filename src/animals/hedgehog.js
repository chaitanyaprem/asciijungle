'use strict';

const animal = require('../animal');
const { mirror, shiftRow } = require('../artkit');

// Hedgehog. Base drawing by "ejm" from ascii.co.uk/art/hedgehog — the ,)))))
// spines are unimprovable. Tiny on purpose: next to a 30-column elephant a
// 13-column hedgehog is what sells the scale of the scene.
//
// Its trick is the hedgehog's own: it trundles to a random spot, curls into a
// ball for a while, unrolls, and carries on. feature 'anywhere' means the
// stop point isn't tied to scenery.
const WALK_R_A = `
   ,)))))))_
  ))))))))^'>
  /|,,,,,,|\\
`;

const WALK_R_B = shiftRow(WALK_R_A, -1, 1);
const WALK_L_A = mirror(WALK_R_A);
const WALK_L_B = shiftRow(WALK_L_A, -1, 1);

const CURL = `
   _,))))),_
  ()))))))))
   ')))))('
`;

const spec = {
  type: 'hedgehog',
  sound: 'hedgehog',
  feature: 'anywhere',
  defaultColor: 'y',
  baseSpeed: 0.4,
  frameSpeed: 0.2,
  actFrameSpeed: 0.02,
  actTicks: 55,
  actChance: 0.7,
  anchorLeft: 6,
  anchorRight: 6,
  art: {
    walkRight: [WALK_R_A, WALK_R_B],
    walkLeft: [WALK_L_A, WALK_L_B],
    actRight: [CURL],
    actLeft: [CURL],
  },
};

function addHedgehog(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addHedgehog, spec };
