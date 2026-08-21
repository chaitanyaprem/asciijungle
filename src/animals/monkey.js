'use strict';

const animal = require('../animal');

// Monkey. Hangs on a vine (the || is the grip, lined up with a real liana)
// and hops vine-to-vine. A smooth glide across empty air read as flying.
const HANG_A = `
      ||
     /o\\
     ( )
     / \\
`;

const HANG_B = `
      ||
     \\o/
     ( )
     / \\
`;

// Leap: no vine glyph — a || in the air read as ziplining. Reach toward
// the next perch; hang art still has the grip for when they land.
// Hand-drawn both ways so the body stays under the hang || (col 6);
// mirror() would strip the padding and snap the sprite sideways.
const LEAP_R = `
     \\o-
     ( )
     / \\
`;

const LEAP_L = `
     -o/
     ( )
     / \\
`;

const spec = {
  type: 'monkey',
  sound: 'monkey',
  lane: 'canopy',
  feature: 'swing',
  defaultColor: 'y',
  baseSpeed: 1.2,
  leapSpeed: 1.0,
  frameSpeed: 0.35,
  actFrameSpeed: 0.2,
  actTicks: 40,
  actChance: 1,
  // Column of the || grip, so it sits on the vine not beside it.
  anchorLeft: 6,
  anchorRight: 6,
  art: {
    walkRight: [LEAP_R],
    walkLeft: [LEAP_L],
    actRight: [HANG_A, HANG_B],
    actLeft: [HANG_A, HANG_B],
  },
};

function addMonkey(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addMonkey, spec };
