#!/usr/bin/env node
// asciijungle — a 3D-ish ASCII jungle for very small people.
//
// Built on the render engine from asciiquarium-js (Node port of Kirk Baucom's
// Perl asciiquarium). One shared path, not stacked bands: see src/world.js.

'use strict';

const { Animation } = require('./src/engine');
const { buildWorld, canAdd, occupants, maxAnimals } = require('./src/world');
const { addScenery } = require('./src/scenery');
const { randomAnimal, summonByKey, ANIMALS, BY_KEY } = require('./src/random');
const sound = require('./src/sound');

const TICK_SPEEDS = [400, 300, 220, 160, 120, 90];
const DEFAULT_SPEED = 2; // 220 ms — a slow amble, which is the point

function parseArgs(argv) {
  const opts = { calm: true, mute: false, speed: DEFAULT_SPEED };
  for (const a of argv.slice(2)) {
    if (a === '--calm') opts.calm = true;
    else if (a === '--any-key') opts.calm = false;
    else if (a === '--mute' || a === '-m') opts.mute = true;
    else if (a === '--check-sound') {
      const s = sound.status();
      process.stdout.write(
        `player: ${s.player || 'none found (silent)'}\n` +
        `sounds: ${s.dir}\n` +
        (s.files.length ? s.files.map((f) => '  ' + f).join('\n') + '\n'
                        : '  (empty — run tools/fetch-sounds.sh)\n')
      );
      process.exit(0);
    } else if (a === '-h' || a === '--help') {
      process.stdout.write(
        'Usage: asciijungle.js [--any-key] [--mute] [--check-sound]\n\n' +
        '  --any-key      other keys summon a random animal too\n' +
        '  --mute         no sound\n' +
        '  --check-sound  report the audio player and sound files, then exit\n\n' +
        'Keys:\n' +
        ANIMALS.map((a) => `  ${a.key}   ${a.name}`).join('\n') + '\n' +
        '  other keys      nothing (a random animal with --any-key)\n\n' +
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

function setupTerminal() {
  process.stdout.write('\x1b[?1049h'); // alternate screen buffer
  process.stdout.write('\x1b[?25l');   // hide cursor
  process.stdout.write('\x1b[2J');
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
}

function restoreTerminal() {
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

  setupTerminal();
  process.on('exit', restoreTerminal);
  process.on('SIGINT', () => quit());
  process.on('SIGTERM', () => quit());
  process.on('uncaughtException', (e) => { restoreTerminal(); console.error(e); process.exit(1); });

  const anim = new Animation();
  let rebuild = true;
  let sinceSpawn = 0;


  function build() {
    anim.updateTermSize();
    anim.removeAllEntities();
    buildWorld(anim);
    addScenery(anim);
    // A couple already in view so the jungle isn't empty. Leave a free
    // seat so the first keys add, instead of immediately swapping someone.
    // Ambient refill only tops up to two.
    const opening = Math.min(2, maxAnimals(anim));
    for (let i = 0; i < opening; i++) randomAnimal(anim, { onScreen: true });
    anim.redrawScreen();
  }

  process.stdin.on('data', (key) => {
    const raw = key.toString();
    if (raw === '\x03') return quit();      // Ctrl+C — the only exit
    // Ctrl+L repaints only. Rebuilding would clear every animal, and a
    // mashing hand finds Ctrl+L.
    if (raw === '\x0c') { anim.redrawScreen(); return; }
    // Arrow and function keys arrive as escape sequences; their letters
    // ('\x1b[C') must not summon a crocodile.
    if (raw.startsWith('\x1b')) return;

    // force + atEdge: a summon always produces an animal, and that animal is
    // visible in full the instant the key goes down. Silently ignoring the
    // key, or answering it with one column of pixels, is the worst possible
    // response to a toddler pressing it.
    const summonOpts = { announce: true, force: true, atEdge: true };
    // Fast mashing can deliver several keys in one chunk; take each one.
    for (const k of raw.toLowerCase()) {
      if (summonByKey(anim, k, summonOpts)) continue;
      if (!opts.calm && !BY_KEY.has(k)) randomAnimal(anim, summonOpts);
    }
  });

  process.stdout.on('resize', () => { rebuild = true; });

  const tick = () => {
    if (rebuild) { build(); rebuild = false; return; }

    // Quiet refill: keep at least a couple of animals wandering if nobody
    // is mashing keys. Summons fill the rest of the seats.
    sinceSpawn += 1;
    if (sinceSpawn > 18 && occupants(anim).length < 2 && canAdd(anim)) {
      if (randomAnimal(anim, {})) sinceSpawn = 0;
    }

    anim.animate();
  };

  build();
  setInterval(tick, TICK_SPEEDS[opts.speed]);
}

main();
