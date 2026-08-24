'use strict';

const animal = require('../animal');
const { shiftRow, lines, widthOf } = require('../artkit');

// Panda by BluePard, posted to alt.ascii-art (May 1998). Front-facing
// so the ears and eye patches read; the same art is used both ways
// (it waddles toward you). Signature "BP" on the chin stripped.
const WALK = [
  "          o88            88o",
  "         68888.--''''--.88889",
  "          `88            88'",
  "          .'              `.",
  "         /                  \\",
  "         |                   |",
  "         |    88       88    |",
  "         |   88o       o88   |",
  "        o`.  8    ___    8  .'o",
  "       8888`.     '^'     .'8888",
  "     o888888o`. `.-'-.' .'o888888o",
  "   o888888888oo`-------'oo8888888o",
].join('\n');

const WALK_B = shiftRow(WALK, -1, 1);

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
  // Centre of the face, so it sits in the bamboo not inside the tall tree.
  anchorRight: null,
  anchorLeft: null,
  featureOffset: 2,
  art: {
    walkRight: [WALK, WALK_B],
    walkLeft: [WALK, WALK_B],
    actRight: [WALK],
    actLeft: [WALK],
  },
};

{
  const w = widthOf(lines(WALK));
  spec.anchorRight = spec.anchorLeft = Math.floor(w / 2);
}

function addPanda(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addPanda, spec };
