'use strict';

// Turn raw terminal input into keys, taps, and escape sequences.
//
// With mouse tracking on (DECSET 1000 and 1006), a finger press arrives as
//   ESC [ < button ; column ; row M
// and the finger lifting as the same report with a trailing m. A report can
// be split across reads, so whatever is not finished yet stays in `rest`.

const MOUSE = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])/;
// A finished CSI or SS3 sequence. The final byte is in 0x40-0x7e.
const CSI = /^\x1b\[[\x20-\x3f]*[\x20-\x2f]*[\x40-\x7e]/;
const SS3 = /^\x1bO[\x40-\x7e]/;
// A prefix that could still grow into one of the sequences above.
const PARTIAL = /^(?:\x1b(?:\[(?:[\x20-\x3f]*[\x20-\x2f]*)?|O)?)?$/;

function take(buf) {
  const events = [];
  let i = 0;
  while (i < buf.length) {
    const rest = buf.slice(i);
    if (rest.charCodeAt(0) !== 0x1b) {
      const ch = rest[0];
      if (ch === '\x03') events.push({ type: 'quit' });
      else if (ch === '\x0c') events.push({ type: 'redraw' });
      else events.push({ type: 'key', key: ch });
      i += ch.length;
      continue;
    }

    const mouse = MOUSE.exec(rest);
    if (mouse) {
      // Button 0 is a finger or the left button. 32 and up is a drag,
      // 64 and up is a wheel. The lift is the same report ending in m,
      // so one tap becomes one event.
      if (mouse[4] === 'M' && Number(mouse[1]) === 0) {
        events.push({
          type: 'tap',
          col: Number(mouse[2]),
          row: Number(mouse[3]),
        });
      }
      i += mouse[0].length;
      continue;
    }

    const csi = CSI.exec(rest);
    if (csi) {
      events.push({ type: 'escape', raw: csi[0] });
      i += csi[0].length;
      continue;
    }
    const ss3 = SS3.exec(rest);
    if (ss3) {
      events.push({ type: 'escape', raw: ss3[0] });
      i += ss3[0].length;
      continue;
    }
    if (PARTIAL.test(rest)) break;

    // A stray ESC. Keep it from sticking to the next letter.
    events.push({ type: 'escape', raw: '\x1b' });
    i += 1;
  }
  return { events, rest: buf.slice(i) };
}

module.exports = { take };
