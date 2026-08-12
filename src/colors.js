'use strict';

// Mask chars: c/C cyan, r/R red, g/G green, y/Y yellow, b/B blue,
//             m/M magenta, w/W white, k/K black. Upper = bright/bold.
const COLOR_CODE = { k: 30, r: 31, g: 32, y: 33, b: 34, m: 35, c: 36, w: 37 };

// A rendered cell's colour is a *token*, not just a mask letter, so depth
// bands can shade the same art three ways without separate sprites:
//
//   'g'   normal green   (mask letter, lowercase)
//   'G'   bright green   (mask letter, uppercase)
//   '-g'  faint green    (leading '-' = SGR 2, used by the far band)
//
// shade() folds a band's tier into whatever the mask asked for. This is the
// whole "one art size, three depths" trick: near animals are bold, mid are
// normal, far are faint, and the eye reads that as distance.
function shade(code, tier) {
  if (!code || code === ' ') return code;
  if (tier === 'dim') return '-' + code.toLowerCase();
  if (tier === 'bright') return code.toUpperCase();
  return code;
}

function ansiColor(token) {
  if (!token || token === ' ') return '\x1b[0m';
  let faint = false;
  let code = token;
  if (code[0] === '-') { faint = true; code = code.slice(1); }
  const lower = code.toLowerCase();
  const n = COLOR_CODE[lower];
  if (!n) return '\x1b[0m';
  if (faint) return `\x1b[2;${n}m`;
  return code === lower ? `\x1b[22;${n}m` : `\x1b[1;${n}m`;
}

const COLOR_LETTERS = ['c', 'C', 'r', 'R', 'y', 'Y', 'b', 'B', 'g', 'G', 'm', 'M'];

module.exports = { COLOR_CODE, COLOR_LETTERS, ansiColor, shade };
