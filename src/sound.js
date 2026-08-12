'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SOUND_DIR = path.join(__dirname, '..', 'sounds');

// Players in preference order. afplay ships with macOS; the others are for
// Linux boxes. Whichever exists first wins, and if none do we simply go quiet
// rather than breaking the animation.
const PLAYERS = [
  { cmd: 'afplay', args: (f) => [f] },
  { cmd: 'ffplay', args: (f) => ['-nodisp', '-autoexit', '-loglevel', 'quiet', f] },
  { cmd: 'paplay', args: (f) => [f] },
  { cmd: 'aplay', args: (f) => ['-q', f] },
];

function which(cmd) {
  const dirs = (process.env.PATH || '').split(path.delimiter);
  for (const d of dirs) {
    if (!d) continue;
    const p = path.join(d, cmd);
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {}
  }
  return null;
}

let player = null;
let enabled = true;
let resolved = false;

function resolvePlayer() {
  if (resolved) return player;
  resolved = true;
  for (const p of PLAYERS) {
    if (which(p.cmd)) { player = p; break; }
  }
  return player;
}

// A sound is <name>.wav / .m4a / .mp3 in sounds/. Missing files are fine —
// the jungle just stays quiet for that animal until you drop one in.
function findFile(name) {
  for (const ext of ['.wav', '.m4a', '.mp3', '.aiff', '.ogg']) {
    const f = path.join(SOUND_DIR, name + ext);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

// Toddlers hold keys down. Without a cooldown you get forty overlapping lion
// roars and a fan spinning up, so each sound gets a minimum gap.
const COOLDOWN_MS = 700;
const lastPlayed = new Map();
const running = new Set();
const MAX_CONCURRENT = 4;

function play(name) {
  if (!enabled) return;
  const p = resolvePlayer();
  if (!p) return;

  const now = Date.now();
  const last = lastPlayed.get(name) || 0;
  if (now - last < COOLDOWN_MS) return;
  if (running.size >= MAX_CONCURRENT) return;

  const file = findFile(name);
  if (!file) return;

  lastPlayed.set(name, now);
  try {
    const child = spawn(p.cmd, p.args(file), { stdio: 'ignore', detached: false });
    running.add(child);
    const done = () => running.delete(child);
    child.on('exit', done);
    child.on('error', done);
  } catch {}
}

function setEnabled(v) { enabled = !!v; }
function isEnabled() { return enabled; }

// Reported by --check-sound so you can see what's wired up without launching.
function status() {
  const p = resolvePlayer();
  const names = fs.existsSync(SOUND_DIR)
    ? fs.readdirSync(SOUND_DIR).filter((f) => /\.(wav|m4a|mp3|aiff|ogg)$/i.test(f))
    : [];
  return { player: p ? p.cmd : null, dir: SOUND_DIR, files: names };
}

// Kill anything still playing so Ctrl+C doesn't leave a roar hanging.
function stopAll() {
  for (const c of running) { try { c.kill(); } catch {} }
  running.clear();
}

module.exports = { play, setEnabled, isEnabled, status, stopAll, SOUND_DIR };
