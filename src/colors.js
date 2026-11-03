'use strict';

// Mask chars: c/C cyan, r/R red, g/G green, y/Y yellow, b/B blue,
//             m/M magenta, w/W white, k/K black. Upper = bright/bold.
const COLOR_CODE = { k: 30, r: 31, g: 32, y: 33, b: 34, m: 35, c: 36, w: 37 };

// A rendered cell's colour is a *token*, not just a mask letter, so a
// pass-behind can shade the same art dimmer without a second sprite:
//
//   'g'   normal green   (mask letter, lowercase)
//   'G'   bright green   (mask letter, uppercase)
//   '-g'  faint green    (leading '-' = SGR 2, used by the shoulder lane)
//
// shade() folds a depth tier into whatever the mask asked for. Path animals
// stay at the mask colour; a pass-behind is dimmed.
function shade(code, tier) {
  if (!code || code === ' ') return code;
  if (tier === 'dim') return '-' + code.toLowerCase();
  if (tier === 'bright') return code.toUpperCase();
  return code;
}

// The 16-colour primaries are a hard neon on the tablet, and a rainbow is
// drawn in solid blocks of them. These sit between that neon and a washed-out
// pastel: still clearly coloured, not white. Uppercase is the lighter of the
// two. Green stays the quieter leaf tone. White and black are unchanged.
const MILD = {
  r: '168;64;64',   R: '208;88;88',
  g: '102;145;96',  G: '150;186;132',
  y: '170;145;48',  Y: '206;180;62',
  b: '64;96;176',   B: '96;128;206',
  m: '160;72;148',  M: '196;96;180',
  c: '48;140;134',  C: '72;178;170',
};

// Off unless --touch. A desktop run keeps the 16-colour primaries.
let useMild = false;
function setMild(on) { useMild = !!on; }

function ansiColor(token) {
  if (!token || token === ' ') return '\x1b[0m';
  let faint = false;
  let code = token;
  if (code[0] === '-') { faint = true; code = code.slice(1); }
  if (useMild) {
    const rgb = MILD[code];
    if (rgb) return faint ? `\x1b[2;38;2;${rgb}m` : `\x1b[22;38;2;${rgb}m`;
  }
  const lower = code.toLowerCase();
  const n = COLOR_CODE[lower];
  if (!n) return '\x1b[0m';
  if (faint) return `\x1b[2;${n}m`;
  return code === lower ? `\x1b[22;${n}m` : `\x1b[1;${n}m`;
}

const COLOR_LETTERS = ['c', 'C', 'r', 'R', 'y', 'Y', 'b', 'B', 'g', 'G', 'm', 'M'];

module.exports = { COLOR_CODE, COLOR_LETTERS, ansiColor, shade, setMild };
