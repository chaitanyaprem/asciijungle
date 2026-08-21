'use strict';

const animal = require('../animal');
const { mirror, shiftRow, lines, widthOf } = require('../artkit');

// Crocodile. Low and ridged so it cannot be read as a rocket: scutes along
// the back, 00 eyes on the head, a short snout, wavy jaw, V legs. The
// previous walk was a diamond tail + smooth fuselage + > nose cone.
const WALK_R_A = `
                    .-.
  .--.--.--.--.--.(00)-.
 ( ~~ ~~ ~~ ~~ ~~    -.
   V    V    V    V
`;

const WALK_R_B = shiftRow(WALK_R_A, -1, 1);
const WALK_L_A = mirror(WALK_R_A);
const WALK_L_B = shiftRow(WALK_L_A, -1, 1);

// Same length as the walk, body in the water, eyes still showing.
const LURK_R = `
                    .-.
  .--.--.--.--.--.(00)-.
~~~~ ~~ ~~ ~~ ~~ ~~ ~~~
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
  anchorRight: 19,
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
