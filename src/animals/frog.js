'use strict';

const animal = require('../animal');

// Frog. Drawn for this project, facing out of the screen, so it needs no
// mirror: the same frames go either way.
//
// It gets about by hopping: it sits a moment, springs up, feet two rows off
// the ground and legs stretched out, and comes down again a good way along. The frames
// share one height and the feet are pegged to the ground, so the empty rows
// above or below the body are what lift it; the gait keeps it still while
// sitting and moves it only in the air. Like the hedgehog it stops
// anywhere, then sits and puffs its throat out, slowly, a couple of seconds
// a breath.
const SITTING = [
  '  (o)_(o)',
  ' (  \\_/  )',
  " /)'---'(\\",
  '^^       ^^',
];

const LEAPING = [
  '  (o)_(o)',
  ' (  \\_/  )',
  "  )'---'(",
  '  //   \\\\',
  " ''     ''",
];

const SIT = [' ', ' ', ' ', ...SITTING].join('\n');  // on the ground
const RISE = [' ', ' ', ...LEAPING].join('\n');      // legs out, toes down
const TOP = [...LEAPING, ' ', ' '].join('\n');       // feet two rows up

const REST = `
  (o)_(o)
 (  \\_/  )
 /)'---'(\\
^^       ^^
`;

const PUFF = `
  (o)_(o)
 (  \\_/  )
 /)(   )(\\
^^ '---' ^^
`;

const spec = {
  type: 'frog',
  sound: 'frog',
  feature: 'anywhere',
  defaultColor: 'G',
  // 0.9 a tick, but only in the air: about nine columns a hop, and on
  // average no quicker than the elephant.
  baseSpeed: 0.9,
  frameSpeed: 0.4,
  gait: [0, 0, 1, 1, 1, 1],
  actFrameSpeed: 0.1,
  actTicks: 60,
  actChance: 0.75,
  art: {
    walkRight: [SIT, SIT, RISE, TOP, TOP, RISE],
    walkLeft: [SIT, SIT, RISE, TOP, TOP, RISE],
    actRight: [REST, PUFF],
    actLeft: [REST, PUFF],
  },
};

function addFrog(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addFrog, spec };
