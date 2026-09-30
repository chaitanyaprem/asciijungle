'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SOUND_DIR = path.join(__dirname, '..', 'sounds');
const WIN = process.platform === 'win32';

// Windows ships no command-line player, but it always ships PowerShell,
// which can play a .wav through .NET's SoundPlayer and speak through
// System.Speech. Text goes in as a single-quoted PowerShell string, where a
// quote is escaped by doubling it. PowerShell takes a moment to start, so a
// sound can lag the key by about half a second.
const psQuote = (s) => `'${String(s).replace(/'/g, "''")}'`;
const PS = ['-NoProfile', '-NonInteractive', '-Command'];
const WIN_PLAYER = {
  cmd: 'powershell',
  args: (f) => [...PS, `(New-Object Media.SoundPlayer ${psQuote(f)}).PlaySync()`],
};
const WIN_VOICE = {
  cmd: 'powershell',
  args: (t) => [...PS, 'Add-Type -AssemblyName System.Speech; ' +
    '$v = New-Object System.Speech.Synthesis.SpeechSynthesizer; ' +
    `$v.Rate = -2; $v.Speak(${psQuote(t)})`],
};

// Players in preference order. afplay ships with macOS; the others are for
// Linux boxes. Whichever exists first wins, and if none do we simply go quiet
// rather than breaking the animation.
const PLAYERS = [
  ...(WIN ? [WIN_PLAYER] : []),
  { cmd: 'afplay', args: (f) => [f] },
  { cmd: 'ffplay', args: (f) => ['-nodisp', '-autoexit', '-loglevel', 'quiet', f] },
  { cmd: 'paplay', args: (f) => [f] },
  { cmd: 'aplay', args: (f) => ['-q', f] },
];

// On Windows a program is powershell.exe, not powershell: try each
// executable extension Windows knows (PATHEXT).
function which(cmd) {
  const dirs = (process.env.PATH || '').split(path.delimiter);
  const exts = WIN ? (process.env.PATHEXT || '.EXE').split(';').filter(Boolean) : [''];
  for (const d of dirs) {
    if (!d) continue;
    for (const ext of exts) {
      const p = path.join(d, cmd + ext);
      try {
        fs.accessSync(p, fs.constants.X_OK);
        return p;
      } catch {}
    }
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
    const child = spawn(p.cmd, p.args(file), { stdio: 'ignore', detached: false, windowsHide: true });
    running.add(child);
    const done = () => running.delete(child);
    child.on('exit', done);
    child.on('error', done);
  } catch {}
}

// Speech: treats (butterfly, bird) have no clip, so their name is
// said instead. `say` ships with macOS; the rest are Linux.
const VOICES = [
  ...(WIN ? [WIN_VOICE] : []),
  { cmd: 'say', args: (t) => ['-r', '150', t] },
  { cmd: 'espeak-ng', args: (t) => ['-s', '130', t] },
  { cmd: 'espeak', args: (t) => ['-s', '130', t] },
  { cmd: 'spd-say', args: (t) => ['-w', '-r', '-20', t] },
];

let voice;
let speaking = null;

function resolveVoice() {
  if (voice !== undefined) return voice;
  voice = VOICES.find((v) => which(v.cmd)) || null;
  return voice;
}

// One voice at a time and no queue: a mashed key would otherwise stack up
// a minute of names.
function say(text) {
  if (!enabled || speaking) return;
  const v = resolveVoice();
  if (!v) return;
  try {
    const child = spawn(v.cmd, v.args(text), { stdio: 'ignore', detached: false, windowsHide: true });
    speaking = child;
    const done = () => { if (speaking === child) speaking = null; };
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
  const v = resolveVoice();
  return { player: p ? p.cmd : null, voice: v ? v.cmd : null, dir: SOUND_DIR, files: names };
}

// Kill anything still playing so Ctrl+C doesn't leave a roar hanging.
function stopAll() {
  for (const c of running) { try { c.kill(); } catch {} }
  running.clear();
  if (speaking) { try { speaking.kill(); } catch {} }
}

module.exports = { play, say, setEnabled, isEnabled, status, stopAll, SOUND_DIR };
