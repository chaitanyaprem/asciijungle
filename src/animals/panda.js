'use strict';

const animal = require('../animal');
const { lines, widthOf } = require('../artkit');

// Panda from emojicombos.com's panda art (Braille dot art, artist not
// credited there): the small upright one waving, and the same panda
// holding a bamboo stalk for eating. Front-facing, so it waddles both
// ways with the same frames.
//
// The walk is derived here, not in the original: B lifts the left foot two
// dots and sways the body one dot onto the right leg; C is the other side.
// Cycle A B A C.
//
// The original's feet sit in the top dots of its last row, so it floated
// three dots above the ground. Everything is moved down three dots so the
// feet are on the bottom edge.
//
// Braille has no "empty but solid" character except U+2800, which looks
// exactly like a space in an editor. '.' marks those cells below: blanks
// sealing a one-cell gap in the outline, so the engine's border flood fill
// can't leak into the face and show scenery through it.
const A = `
      ⣠⣄⡀
     ⢸⡿⠟⠋.⠐⠂⢄⡀
    ⢀⠎⢀⣀⡀  ..⠈⢻⣿⡆
 ⠠⣿⣷⣼.⠺⠯⠇  ⣠⣤⡀⠈⡟⠁
  ⢻⣿⣿⣦⣉.⠐⠻⠅⠱⠿⠣⢠⠁
   ⠙⡿⠿⠿⣿⣶⣤⣤⣤⣥⡔⠁
   ⢀⠁   ⠈⠉⠛⢿⣿⣷⡀
   ⠈⡄   ...⠈⣿⣿⡇
    ⣿⣦⣄⣀⣀⣀⣠⣾⡏⠛⠁
    ⠹⣿⡿  ⠸⣿⡿
`;

const B = `
      ⢀⣤⣀
      ⣿⠿⠛⠁.⠒⠠⣀
     ⡰⠁⣀⣀  ...⠙⣿⣷
  ⢼⣿⣦⡇⠐⠿⠽  ⢀⣤⣄.⢹⠋
  ⠘⣿⣿⣷⣌⡁.⠚⠯⠈⠾⠟⠄⡌
   ⠈⢻⠿⠿⢿⣷⣦⣤⣤⣬⣤⠊
    ⡈    ⠉⠙⠻⣿⣿⣆
    ⢡    ...⢹⣿⣿
    ⢸⣷⣤⣀⣀⣀⣀⣴⣿⠙⠋
    ⠙⠛⠛  ⠸⣿⡿
`;

const C = `
     ⢀⣤⣀
     ⣿⠿⠛⠁.⠒⠠⣀
    ⡰⠁⣀⣀  ...⠙⣿⣷
 ⢼⣿⣦⡇⠐⠿⠽  ⢀⣤⣄.⢹⠋
 ⠘⣿⣿⣷⣌⡁.⠚⠯⠈⠾⠟⠄⡌
  ⠈⢻⠿⠿⢿⣷⣦⣤⣤⣬⣤⠊
   ⡈    ⠉⠙⠻⣿⣿⣆
   ⢡    ...⢹⣿⣿
   ⢸⣷⣤⣀⣀⣀⣀⣴⣿⠙⠋
    ⠹⣿⡿  ⠘⠛⠛
`;

const EAT = `
      ⣠⣄⡀
     ⢸⡿⠟⠋.⠐⠂⢄⡀
    ⢀⠎⢀⣀⡀  ..⠈⢻⣿⡆
 ⠠⣿⣷⣼.⠺⠯⠇  ⣠⣤⡀⠈⡟⠁
  ⢻⣿⣿⣦⣉.⠐⠻⠅⠱⠿⠣⢠⠁
   ⠙⡿⠿⠿⣿⣶⣤⣤⣤⣥⡔⠁.
   ⢀⠁   ⠈⠉⠛⢿⣿⣷⡁⡖⢢
   ⠈⡄   ...⡈⣿⣿⣇⡇⡘
    ⣿⣦⣄⣀⣀⣀⣠⣾⡏⠛⠁⡇⡆
    ⠹⣿⡿  ⠸⣿⡿   ⠃⠅
`;

const solid = (art) => art.replace(/\./g, '⠀');
const WALK = [A, B, A, C].map(solid);

const spec = {
  type: 'panda',
  sound: 'panda',
  feature: 'bambooX',
  defaultColor: 'W',
  baseSpeed: 0.45,
  frameSpeed: 0.25,
  actFrameSpeed: 0.06,
  actTicks: 70,
  actChance: 0.85,
  // Centre of the body, so it sits in the bamboo not inside the tall tree.
  anchorRight: null,
  anchorLeft: null,
  featureOffset: 2,
  art: {
    walkRight: WALK,
    walkLeft: WALK,
    actRight: [solid(EAT)],
    actLeft: [solid(EAT)],
  },
};

{
  const w = widthOf(lines(A));
  spec.anchorRight = spec.anchorLeft = Math.floor(w / 2);
}

function addPanda(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addPanda, spec };
