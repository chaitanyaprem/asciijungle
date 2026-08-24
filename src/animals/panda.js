'use strict';

const animal = require('../animal');
const { shiftRow, lines } = require('../artkit');

// Panda by b'ger (Joris Bellenger), the small round one Joan Stark
// called a favourite in alt.ascii-art (May 1998). Background dots and
// the signature stripped. The old walk was a long box with a face
// turned to the viewer and did not read as a panda. This body is
// front-facing, so both walk directions use the same art; it waddles.
const WALK = `
         ## --.#
            #  #
              *
             -^
      ##\\
     #####     /###
     ########\\ \\((#
   ####,   ))/ ##
   #####      '####
   #####\\____/#####
    ######..######
      """"  """"
`;

const WALK_B = shiftRow(WALK, -1, 1);

// Same panda, bamboo stalk on the right so it sits at the clump.
const SIT = `
         ## --.#        \\|/
            #  #         |
              *          |
             -^          |
      ##\\                |
     #####     /###      |
     ########\\ \\((#      |
   ####,   ))/ ##        |
   #####      '####      |
   #####\\____/#####      |
    ######..######       |
      """"  """"         |
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
  anchorRight: null,
  anchorLeft: null,
  featureOffset: 8,
  art: {
    walkRight: [WALK, WALK_B],
    walkLeft: [WALK, WALK_B],
    actRight: [SIT],
    actLeft: [SIT],
  },
};

{
  const sitLines = lines(SIT);
  const bottom = sitLines[sitLines.length - 1].replace(/\s+$/, '');
  spec.anchorRight = spec.anchorLeft = bottom.length - 1;
}

function addPanda(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addPanda, spec };
