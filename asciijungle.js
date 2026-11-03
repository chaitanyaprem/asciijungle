#!/usr/bin/env node
// asciijungle — a 3D-ish ASCII jungle for very small people.
//
// Built on the render engine from asciiquarium-js (Node port of Kirk Baucom's
// Perl asciiquarium). One shared path, not stacked bands: see src/world.js.

'use strict';

const { Animation } = require('./src/engine');
const { buildWorld, canAdd, occupants, maxAnimals } = require('./src/world');
const { resettle } = require('./src/animal');
const { addScenery } = require('./src/scenery');
const { randomAnimal, pressAnimal, ANIMALS, BY_KEY } = require('./src/random');
const { addTreat, blowToward } = require('./src/treats');
const fs = require('fs');
const { take } = require('./src/input');
const { tapAnimalKey } = require('./src/touch');
const { setMild } = require('./src/colors');
const { spec: turtleSpec } = require('./src/animals/turtle');
const sound = require('./src/sound');

const TICK_SPEEDS = [400, 300, 220, 160, 120, 90];
const DEFAULT_SPEED = 2; // 220 ms — a slow amble, which is the point
// A palm on the glass is many presses. Count them as one tap.
const TAP_GAP_MS = 300;
// Termux reports a finger press, not the sideways drag, so a helper on the
// tablet appends one L or R per swipe. No file means swipes do nothing.
const WIND_FILE = process.env.JUNGLE_WIND || '/data/local/tmp/jungle-wind';

function parseArgs(argv) {
  const opts = { calm: true, mute: false, touch: false, speed: DEFAULT_SPEED };
  for (const a of argv.slice(2)) {
    if (a === '--calm') opts.calm = true;
    else if (a === '--any-key') opts.calm = false;
    else if (a === '--touch') opts.touch = true;
    else if (a === '--mute' || a === '-m') opts.mute = true;
    else if (a === '--check-sound') {
      const s = sound.status();
      process.stdout.write(
        `player: ${s.player || 'none found (silent)'}\n` +
        `voice:  ${s.voice || 'none found (names not spoken)'}\n` +
        `sounds: ${s.dir}\n` +
        (s.files.length ? s.files.map((f) => '  ' + f).join('\n') + '\n'
                        : '  (empty — run tools/fetch-sounds.sh)\n')
      );
      process.exit(0);
    } else if (a === '-h' || a === '--help') {
      process.stdout.write(
        'Usage: asciijungle.js [--any-key] [--touch] [--mute] [--check-sound]\n\n' +
        '  --any-key      other keys summon a random animal instead of a treat\n' +
        '  --touch        lower-screen taps pick an animal; sky taps bring a treat;\n' +
        '                 a sideways swipe leans the rain\n' +
        '  --mute         no sound or spoken names\n' +
        '  --check-sound  report the audio player and sound files, then exit\n\n' +
        'Keys:\n' +
        ANIMALS.map((a) => `  ${a.key}   ${a.name}`).join('\n') + '\n' +
        '  same key again  it hops and calls\n' +
        '  space           a rainbow\n' +
        '  r               rain, with a rainbow partway through\n' +
        '  left/right      while it rains, the wind leans it that way\n' +
        '  swipe left/right, with --touch   the rain leans that way\n' +
        '  other keys      a butterfly, bird or flower\n' +
        '  a tap on an animal, with --touch   that animal hops and calls\n' +
        '  a tap on the ground   the animal for that part of the screen, left to right\n' +
        '  a tap on the sky      a butterfly, bird or flower\n\n' +
        'Ctrl+C quits. Ctrl+L redraws. No single letter quits, on purpose.\n'
      );
      process.exit(0);
    } else if (a === '-v' || a === '--version') {
      process.stdout.write('asciijungle 0.2.0\n');
      process.exit(0);
    }
  }
  return opts;
}

let touchOn = false;

function keyOfType(type) {
  const a = ANIMALS.find((x) => x.name === type);
  return a ? a.key : null;
}

function setupTerminal(touch) {
  process.stdout.write('\x1b[?1049h'); // alternate screen buffer
  process.stdout.write('\x1b[?25l');   // hide cursor
  process.stdout.write('\x1b[2J');
  // 1000 reports a press and a release. 1006 uses the SGR form, which
  // stays in plain ASCII. Termux turns a finger press into that report.
  if (touch) {
    touchOn = true;
    process.stdout.write('\x1b[?1000h\x1b[?1006h');
  }
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
}

function restoreTerminal() {
  if (touchOn) process.stdout.write('\x1b[?1000l\x1b[?1006l');
  process.stdout.write('\x1b[0m');
  process.stdout.write('\x1b[?25h');
  process.stdout.write('\x1b[?1049l');
  if (process.stdin.isTTY) {
    try { process.stdin.setRawMode(false); } catch {}
  }
}

let quitting = false;
function quit(msg) {
  if (quitting) return;
  quitting = true;
  sound.stopAll();
  restoreTerminal();
  if (msg) process.stderr.write(msg + '\n');
  process.exit(0);
}

function main() {
  const opts = parseArgs(process.argv);
  sound.setEnabled(!opts.mute);
  // Tablet look. A desktop run keeps the 16 colours and a quiet turtle.
  if (opts.touch) {
    setMild(true);
    turtleSpec.sound = 'turtle';
    sound.setSpeakMissing(true);
  }

  setupTerminal(opts.touch);
  process.on('exit', restoreTerminal);
  process.on('SIGINT', () => quit());
  process.on('SIGTERM', () => quit());
  process.on('uncaughtException', (e) => { restoreTerminal(); console.error(e); process.exit(1); });

  const anim = new Animation();
  let rebuild = false;
  let sinceSpawn = 0;

  // keep: a resize. Cmd+Plus/Minus and full-screen toggles are resizes, and
  // a mashing hand finds them, so the animals stay and only the scenery is
  // rebuilt around them. Starting over would swap everyone out.
  function build(keep) {
    const animals = keep ? occupants(anim) : [];
    anim.updateTermSize();
    anim.removeAllEntities();
    buildWorld(anim);
    addScenery(anim);
    for (const e of animals) if (resettle(e, anim)) anim.addEntity(e);
    if (!keep) {
      // A couple already in view so the jungle isn't empty. Leave a free
      // seat so the first keys add, instead of immediately swapping someone.
      // Ambient refill only tops up to two.
      const opening = Math.min(2, maxAnimals(anim));
      for (let i = 0; i < opening; i++) randomAnimal(anim, { onScreen: true });
    }
    anim.redrawScreen();
  }

  // force + atEdge: if there is a free seat, the animal shows up at the
  // edge the instant the key goes down (in full, or peeking) rather than
  // creeping in one column at a time. Nobody on screen gets swapped out;
  // see pressAnimal for what a key does when its animal is already here.
  const summonOpts = { announce: true, force: true, atEdge: true };
  let pending = '';
  let lastTap = 0;

  // A letter that is not an animal, the space bar, or r. addTreat then
  // picks a butterfly, a bird, or a flower. With --any-key it is an animal.
  function unmatched() {
    if (opts.calm) addTreat(anim, 'x');
    else randomAnimal(anim, summonOpts);
  }

  // The drawn cells of an animal, skipping the blank inside its picture.
  // A tall giraffe reaches into the sky, and tapping its head should still
  // be the giraffe rather than a butterfly.
  function animalKeyAt(col, row) {
    let hit = null;
    let bestZ = Infinity;
    for (const e of anim.entities) {
      if (!e.alive || !e.spec) continue;
      const key = keyOfType(e.type);
      if (!key) continue;
      const f = e.frame;
      if (!f || col < e.x || row < e.y || col >= e.x + f.width || row >= e.y + f.height) continue;
      const line = f.lines[row - e.y] || '';
      const ch = line[col - e.x];
      if (!ch || ch === '\0' || ch === ' ') continue;
      const z = e.z == null ? 0 : e.z;
      if (z < bestZ) { bestZ = z; hit = key; }
    }
    return hit;
  }

  process.stdin.on('data', (chunk) => {
    pending += chunk.toString();
    const pulled = take(pending);
    pending = pulled.rest;
    for (const ev of pulled.events) {
      if (ev.type === 'quit') return quit(); // Ctrl+C — the only exit
      // Ctrl+L repaints only. Rebuilding would clear every animal, and a
      // mashing hand finds Ctrl+L.
      if (ev.type === 'redraw') { anim.redrawScreen(); continue; }
      if (ev.type === 'tap') {
        if (!opts.touch) continue;
        const now = Date.now();
        if (now - lastTap < TAP_GAP_MS) continue;
        lastTap = now;
        const under = animalKeyAt(ev.col - 1, ev.row - 1);
        if (under) pressAnimal(anim, under, summonOpts);
        else {
          const zone = tapAnimalKey(ANIMALS, ev.col, ev.row, anim.width(), anim.height());
          if (zone) pressAnimal(anim, zone, summonOpts);
          else unmatched();
        }
        continue;
      }
      // Arrow and function keys arrive as escape sequences; their letters
      // ('\x1b[C') must not summon a crocodile. The whole sequence is one key.
      if (ev.type === 'escape') { if (opts.calm) addTreat(anim, ev.raw); continue; }
      const k = ev.key.toLowerCase();
      if (BY_KEY.has(k)) pressAnimal(anim, k, summonOpts);
      else if (opts.calm) addTreat(anim, k);
      else randomAnimal(anim, summonOpts);
    }
  });

  process.stdout.on('resize', () => { rebuild = true; });

  // Read and clear even when it is dry, so a swipe during a lull does not
  // lean the next rainfall.
  function takeWind() {
    let fd;
    try { fd = fs.openSync(WIND_FILE, 'r+'); } catch { return; }
    try {
      const buf = Buffer.alloc(64);
      const n = fs.readSync(fd, buf, 0, buf.length, 0);
      if (!n) return;
      fs.ftruncateSync(fd, 0);
      const text = buf.toString('utf8', 0, n);
      for (const ch of text) {
        if (ch === 'L') blowToward(anim, -1);
        else if (ch === 'R') blowToward(anim, 1);
      }
    } catch {
      // The helper can rewrite the file between the read and the clear.
    } finally {
      try { fs.closeSync(fd); } catch {}
    }
  }

  const tick = () => {
    if (opts.touch) takeWind();
    if (rebuild) { build(true); rebuild = false; return; }

    // Quiet refill: keep at least a couple of animals wandering if nobody
    // is mashing keys. Summons fill the rest of the seats.
    sinceSpawn += 1;
    if (sinceSpawn > 18 && occupants(anim).length < 2 && canAdd(anim)) {
      if (randomAnimal(anim, {})) sinceSpawn = 0;
    }

    anim.animate();
  };

  build(false);
  setInterval(tick, TICK_SPEEDS[opts.speed]);
}

main();
