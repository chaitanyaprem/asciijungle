#!/usr/bin/env node
// asciijungle — a 3D-ish ASCII jungle for very small people.
//
// Built on the render engine from asciiquarium-js (Node port of Kirk Baucom's
// Perl asciiquarium). Depth comes from horizontal bands: see src/world.js.

'use strict';

const { Animation } = require('./src/engine');
const { buildBands, freeBands } = require('./src/world');
const { addScenery } = require('./src/scenery');
const { randomAnimal, summonByKey, ANIMALS } = require('./src/random');
const sound = require('./src/sound');

const TICK_SPEEDS = [400, 300, 220, 160, 120, 90];
const DEFAULT_SPEED = 2; // 220 ms — a slow amble, which is the point

function parseArgs(argv) {
  const opts = { calm: false, mute: false, speed: DEFAULT_SPEED };
  for (const a of argv.slice(2)) {
    if (a === '--calm') opts.calm = true;
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
        'Usage: asciijungle.js [--calm] [--mute] [--check-sound]\n\n' +
        '  --calm         only the animal keys summon; other keys do nothing\n' +
        '  --mute         no sound\n' +
        '  --check-sound  report the audio player and sound files, then exit\n\n' +
        'Keys:\n' +
        ANIMALS.map((a) => `  ${a.key}   ${a.name}`).join('\n') + '\n' +
        '  any other key   a random animal wanders in\n\n' +
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
    buildBands(anim);
    addScenery(anim);
    // One animal per band, already in view. randomAnimal picks the rarest
    // species and a free band each time, so the opening cast is one of each
    // rather than three of the same thing in three rows.
    for (let i = 0; i < anim.bands.length; i++) randomAnimal(anim, { onScreen: true });
    anim.redrawScreen();
  }

  process.stdin.on('data', (key) => {
    const raw = key.toString();
    if (raw === '\x03') return quit();      // Ctrl+C — the only exit
    if (raw === '\x0c') { rebuild = true; return; } // Ctrl+L — redraw

    const k = raw.toLowerCase();

    // force + atEdge: a summon always produces an animal, and that animal is
    // visible in full the instant the key goes down. Silently ignoring the
    // key, or answering it with one column of pixels, is the worst possible
    // response to a toddler pressing it.
    const summonOpts = { announce: true, force: true, atEdge: true };
    if (summonByKey(anim, k, summonOpts)) return;
    if (!opts.calm) randomAnimal(anim, summonOpts);
  });

  process.stdout.on('resize', () => { rebuild = true; });

  const tick = () => {
    if (rebuild) { build(); rebuild = false; return; }

    // Refill a band shortly after its animal leaves, so the jungle is worth
    // watching with nobody touching the keyboard.
    sinceSpawn += 1;
    if (sinceSpawn > 18 && freeBands(anim).length) {
      if (randomAnimal(anim, {})) sinceSpawn = 0;
    }

    anim.animate();
  };

  build();
  setInterval(tick, TICK_SPEEDS[opts.speed]);
}

main();
