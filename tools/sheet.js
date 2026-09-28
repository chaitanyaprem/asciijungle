'use strict';
// Dump every animal art frame (as the engine would parse it) so we can eyeball it.
const { parseShape } = require('../src/engine');

const names = ['elephant', 'giraffe', 'panda', 'lion', 'monkey', 'hedgehog', 'crocodile'];
for (const n of names) {
  const { spec } = require('../src/animals/' + n);
  console.log('════════ ' + n.toUpperCase() + ' ════════');
  for (const k of ['walkRight', 'walkLeft', 'actRight', 'actLeft']) {
    const art = spec.art[k];
    if (!art) continue;
    const frames = parseShape(art, false, null, true);
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      console.log('── ' + k + ' frame ' + i + ' (' + f.width + 'x' + f.height + ')');
      for (const row of f.lines) {
        // \0 = transparent cell
        console.log(row.split('').map((c) => (c === '\0' ? '·' : c)).join(''));
      }
    }
  }
}

// Bird frames as parsed
const fs = require('fs');
const src = fs.readFileSync('../src/scenery.js', 'utf8');
// extract the raw BIRD_R_UP / BIRD_R_DN template literals
function grab(name) {
  const m = src.match(new RegExp('const ' + name + ' = `([\\s\\S]*?)`;'));
  return m ? m[1] : null;
}
for (const b of ['BIRD_R_UP', 'BIRD_R_DN']) {
  const raw = grab(b);
  console.log('════════ ' + b + ' (raw JS template content, after escape processing) ════════');
  const val = eval('`' + raw + '`'); // let JS process the escapes
  console.log(JSON.stringify(val));
  for (const row of val.replace(/^\n/, '').replace(/\n$/, '').split('\n')) {
    console.log(row.split('').map((c) => (c === ' ' ? '·' : c)).join(''));
  }
}

// Scenery pieces
console.log('════════ SUN ════════');
console.log(fs.readFileSync('../src/scenery.js', 'utf8').match(/const art = \[\n([\s\S]*?)\]\.join/)[1]);
