'use strict';

const animal = require('../animal');
const { mirror, shiftRow, lines } = require('../artkit');

// Panda. Everything that says "panda" lives in the face — black ears, eye
// patches — so the walking pose turns the head toward the viewer, cartoon
// style, while the body stays in profile. A pure side view showed one plain
// eye and read as a generic bear-blob. The face deliberately echoes the
// sitting pose ({0 0} eye patches, # ears) so both poses read as the same
// animal.
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

// Sitting pose: the face is "Bear face" by Joan G. Stark, from the ASCII Art
// Archive (asciiart.eu/animals/bears), with her "jgs" signature removed and a
// simple seated body, paws and bamboo stalk added underneath — the archive
// piece is a face only, so it can't sit down on its own.
const SIT = `
    .--.              .--.
   : (\\ ". _......_ ." /) :
    '.    \`        \`    .'
     /'   _        _   \`\\
    /     0}      {0     \\
   |       /      \\       |
    \\   | .  .==.  . |   /
     '._ \\.' \\__/ './ _.'  \\|/
     /  \`\`'._-''-_.'\`\`  \\   |
   |      __        __     |  |
    \\____/  \\______/  \\____/  |
     |_|                |_|   |
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
  // Nudge right so the 31-wide sit pose clears the tall tree that stands
  // between the trunk and the bamboo — at -7 the panda sat inside the crown.
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
