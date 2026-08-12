'use strict';

// Helpers for turning a single piece of found ASCII art into the set of frames
// an animated animal needs.
//
// Archive art (asciiart.eu, Joan Stark's galleries, alt.ascii.art) is almost
// always one static pose facing one direction. Rather than hand-redrawing each
// piece for the opposite direction and each step of a walk cycle, we derive
// them: mirror() flips a drawing, shiftRow() nudges the leg row to make a
// second walk frame. That keeps the good drawing and gets the animation for
// free.

// Characters that have a mirror image. Everything else (~ _ - . " Y T ! : ;)
// is left alone because it reads the same either way.
const MIRROR = {
  '/': '\\', '\\': '/',
  '(': ')', ')': '(',
  '[': ']', ']': '[',
  '{': '}', '}': '{',
  '<': '>', '>': '<',
  'b': 'd', 'd': 'b',
  'p': 'q', 'q': 'p',
  '`': "'", "'": '`',
};

function lines(art) {
  let t = art;
  if (t.startsWith('\n')) t = t.slice(1);
  if (t.endsWith('\n')) t = t.slice(0, -1);
  return t.split('\n');
}

function widthOf(ls) {
  return ls.reduce((m, l) => Math.max(m, l.length), 0);
}

// Flip a drawing left-to-right, swapping directional glyphs as it goes.
function mirror(art) {
  const ls = lines(art);
  const w = widthOf(ls);
  return ls
    .map((l) =>
      l
        .padEnd(w, ' ')
        .split('')
        .reverse()
        .map((c) => MIRROR[c] || c)
        .join('')
        .replace(/\s+$/, ''))
    .join('\n');
}

// Slide one row sideways — used on the leg row to make the second walk frame.
// Padding with spaces rather than wrapping keeps the feet inside the sprite.
function shiftRow(art, rowIndex, dx) {
  const ls = lines(art);
  const i = rowIndex < 0 ? ls.length + rowIndex : rowIndex;
  if (i < 0 || i >= ls.length) return ls.join('\n');
  const row = ls[i];
  ls[i] = dx > 0
    ? ' '.repeat(dx) + row
    : row.slice(-dx);
  return ls.join('\n');
}

// Replace a run of characters on one row. Used to graft a straightened trunk
// or a raised head onto an otherwise-unchanged pose.
function spliceRow(art, rowIndex, col, replacement) {
  const ls = lines(art);
  const i = rowIndex < 0 ? ls.length + rowIndex : rowIndex;
  if (i < 0 || i >= ls.length) return ls.join('\n');
  const row = ls[i].padEnd(col + replacement.length, ' ');
  ls[i] = row.slice(0, col) + replacement + row.slice(col + replacement.length);
  return ls.join('\n');
}

// Strip an artist's initials out of the drawing. Archive pieces sign the
// canvas itself, and a floating "jgs" walking across the jungle is not what
// anyone wants — credit belongs in the README, not in the sprite.
function unsign(art, signatures) {
  let out = art;
  for (const s of signatures) {
    out = out.split(s).join(' '.repeat(s.length));
  }
  return out;
}

module.exports = { mirror, shiftRow, spliceRow, unsign, lines, widthOf };
