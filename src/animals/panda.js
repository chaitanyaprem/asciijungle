'use strict';

const animal = require('../animal');
const { mirror, shiftRow, lines } = require('../artkit');

// Panda. Everything that says "panda" lives in the face — black ears, eye
// patches — so the walking pose turns the head toward the viewer, cartoon
// style, while the body stays in profile. A pure side view showed one plain
// eye and read as a generic bear-blob. The sitting pose uses the same face
// so both read as the same animal; the old Joan Stark bear-face sit was
// 12 rows and twice the walk width, so a seated panda looked like a giant
// still bear.
const WALK_R_A = `
               _       _
    __________(#)_____(#)
   /          | {0   0} |
  |           |  .__.   |
   \\__________\\.______./
    |#|    |#|  |#| |#|
`;

const WALK_R_B = shiftRow(WALK_R_A, -1, 1);
const WALK_L_A = mirror(WALK_R_A);
const WALK_L_B = shiftRow(WALK_L_A, -1, 1);

const SIT = `
       _     _
     _(#)___(#)_
    /  {0   0}  \\
   |    .__.     |
    \\  (    )   /  \\|/
     |#|    |#|     |
`;

const spec = {
  type: 'panda',
  sound: 'panda',
  feature: 'bambooX',
  defaultColor: 'W',
  baseSpeed: 0.45,
  frameSpeed: 0.16,
  actFrameSpeed: 0.06,
  actTicks: 70,
  actChance: 0.85,
  // Bamboo-stalk column, filled in below. It's the rightmost thing in the
  // sitting pose, so measuring beats counting columns by hand.
  anchorRight: null,
  anchorLeft: null,
  // Nudge right so the sit pose clears the tall tree that stands between
  // the trunk and the bamboo.
  featureOffset: 2,
  art: {
    walkRight: [WALK_R_A, WALK_R_B],
    walkLeft: [WALK_L_A, WALK_L_B],
    actRight: [SIT],
    actLeft: [SIT],
  },
};

// The stalk is the rightmost glyph on the bottom row of the sitting pose.
{
  const sitLines = lines(SIT);
  const bottom = sitLines[sitLines.length - 1].replace(/\s+$/, '');
  spec.anchorRight = spec.anchorLeft = bottom.length - 1;
}

function addPanda(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addPanda, spec };
