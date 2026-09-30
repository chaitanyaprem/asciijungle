'use strict';

const animal = require('../animal');
const { mirror, shiftRow, lines, widthOf } = require('../artkit');

// Turtle. Drawn for this project, facing right; the left set is mirrored.
// The slowest thing on the path. When it stops it pulls into its shell, and
// every few seconds its head pokes out to look around and goes back in:
// peekaboo, at turtle speed.
const WALK_R_A = `
      .-------.
     / \\_/ \\_/ \\  __
    |\\_/ \\_/ \\_/|/ o)
    '==========='--'
      /_/   \\_\\
`;

const WALK_R_B = shiftRow(WALK_R_A, -1, 1);

const HIDE_R = `
      .-------.
     / \\_/ \\_/ \\
    |\\_/ \\_/ \\_/|
    '==========='
`;

const PEEK_R = `
      .-------.
     / \\_/ \\_/ \\
    |\\_/ \\_/ \\_/|o)
    '==========='
`;

// The shell spans these columns of the right-facing art, on every row but
// the legs. It's yellow; head and legs are green.
const SHELL = [4, 16];
const SHELL_ROWS = 4;
const WIDTH = widthOf(lines(WALK_R_A));

// Pad a pose to the walking width, so that mirrored it keeps the shell in
// the same columns instead of jumping sideways when the turtle stops.
function pad(art) {
  return lines(art).map((l) => l.padEnd(WIDTH, ' ')).join('\n');
}

// Quotes here are the shell's rim, not direction. mirror() turns them into
// backticks; put them back.
function flip(art) {
  return mirror(pad(art)).replace(/`/g, "'");
}

function tint(art, [from, to]) {
  return lines(art).map((l, row) => [...l].map((c, col) => {
    if (c === ' ') return ' ';
    return row < SHELL_ROWS && col >= from && col <= to ? 'y' : 'g';
  }).join('')).join('\n');
}

const SHELL_L = [WIDTH - 1 - SHELL[1], WIDTH - 1 - SHELL[0]];
const WALK_L_A = flip(WALK_R_A);
const WALK_L_B = shiftRow(WALK_L_A, -1, 1);
const HIDE_L = flip(HIDE_R);
const PEEK_L = flip(PEEK_R);

const spec = {
  type: 'turtle',
  feature: 'anywhere',
  defaultColor: 'g',
  baseSpeed: 0.25,
  frameSpeed: 0.12,
  actFrameSpeed: 0.05,
  actTicks: 100,
  actChance: 0.8,
  art: {
    walkRight: [WALK_R_A, WALK_R_B],
    walkLeft: [WALK_L_A, WALK_L_B],
    actRight: [HIDE_R, PEEK_R],
    actLeft: [HIDE_L, PEEK_L],
  },
  color: {
    walkRight: [WALK_R_A, WALK_R_B].map((a) => tint(a, SHELL)),
    walkLeft: [WALK_L_A, WALK_L_B].map((a) => tint(a, SHELL_L)),
    actRight: [HIDE_R, PEEK_R].map((a) => tint(a, SHELL)),
    actLeft: [HIDE_L, PEEK_L].map((a) => tint(a, SHELL_L)),
  },
};

function addTurtle(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addTurtle, spec };
