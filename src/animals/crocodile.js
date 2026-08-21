'use strict';

const animal = require('../animal');
const { mirror, shiftRow, lines, widthOf } = require('../artkit');

// Crocodile by Shanaka Dias (snd), via ascii.co.uk/art/crocodile.
// Original faces left — that is walkLeft. walkRight is mirrored so the
// snout leads. Putting the original in walkRight made it moonwalk.
// Tail curl trimmed to fit the path; signature stripped. Lurk is the
// same head and back, legs replaced with water, so standing up does
// not jump width and fuse with whoever is on the path.
const WALK_L_A = `
              .-._   _ _ _ _ _
   .-''-.__.-'00  '-' ' ' ' '-.
   '.___ '    .   .--_'-' '-' '
    V: V 'vv-'     '_   '
      '=.____.=_.--'
`;

const WALK_L_B = shiftRow(WALK_L_A, -2, 1);
// Quotes in this piece are scallops, not direction. mirror() turns them
// into backticks; put the quotes back so the right-walk stays readable.
function unbacktick(art) { return art.replace(/`/g, "'"); }
const WALK_R_A = unbacktick(mirror(WALK_L_A));
const WALK_R_B = shiftRow(WALK_R_A, -2, 1);

const walkW = widthOf(lines(WALK_L_A));
const LURK_L = [
  lines(WALK_L_A)[0],
  lines(WALK_L_A)[1],
  '~'.repeat(walkW),
].join('\n');
const LURK_R = unbacktick(mirror(LURK_L));

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
  // 00-eye column in the lurk pose, so the head sits on the waterhole.
  anchorLeft: null,
  anchorRight: null,
  art: {
    walkRight: [WALK_R_A, WALK_R_B],
    walkLeft: [WALK_L_A, WALK_L_B],
    actRight: [LURK_R],
    actLeft: [LURK_L],
  },
};

{
  const lurk = lines(LURK_L);
  spec.anchorLeft = lurk[1].indexOf('00');
  spec.anchorRight = widthOf(lurk) - 1 - spec.anchorLeft;
}

function addCrocodile(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addCrocodile, spec };
