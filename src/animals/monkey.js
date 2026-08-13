'use strict';

const animal = require('../animal');
const { mirror } = require('../artkit');

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

// Leap: trailing body, leading hand still on a vine glyph.
const LEAP_R = `
   ||
    \\\\o
    ( )
     \\\\
`;

const LEAP_L = mirror(LEAP_R);

const spec = {
  type: 'monkey',
  sound: 'monkey',
  lane: 'canopy',
  feature: 'swing',
  defaultColor: 'y',
  baseSpeed: 1.2,
  leapSpeed: 1.4,
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
