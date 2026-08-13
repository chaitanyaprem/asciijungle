'use strict';

const animal = require('../animal');
const { mirror, shiftRow, lines, widthOf } = require('../artkit');

// Crocodile. Head and back from Shanaka Dias (snd), via
// ascii.co.uk/art/crocodile — the 00 eyes and V: V legs are what
// carry it. Tail trimmed so it fits the path; signature stripped.
const WALK_R_A = `
              .-._   _ _ _ _ _
   .-''-.__.-'00  '-' ' ' ' '-.
   '.___ '    .   .--_'-' '-' '
    V: V 'vv-'     '_   '
      '=.____.=_.--'
`;

const WALK_R_B = shiftRow(WALK_R_A, -2, 1);
const WALK_L_A = mirror(WALK_R_A);
const WALK_L_B = shiftRow(WALK_L_A, -2, 1);

const LURK_R = `
      .-'00 '-.
   ~~~'~~~~~~~'~~~
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
  anchorRight: 12,
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
