'use strict';
// Run the real game headless at a fixed terminal size, feed it keypresses,
// capture the ANSI stream, and split it into per-tick frames.
//   node tools/live.js <cols> <rows> <outBase> <seconds>
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const cols = parseInt(process.argv[2], 10) || 80;
const rows = parseInt(process.argv[3], 10) || 24;
const outBase = process.argv[4] || 'live';
const secs = parseInt(process.argv[5], 10) || 30;
const ROOT = path.join(__dirname, '..');

// Preload that pins stdout size (piped stdout has no real size).
const preload =
  `Object.defineProperty(process.stdout,'columns',{value:${cols},configurable:true});` +
  `Object.defineProperty(process.stdout,'rows',{value:${rows},configurable:true});` +
  `require('${path.join(ROOT, 'asciijungle.js')}');`;

const child = spawn('node', ['-e', preload], {
  cwd: ROOT,
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buf = '';
child.stdout.on('data', (d) => { buf += d.toString(); });
child.stderr.on('data', (d) => { /* ignore */ });

// A busy mix to exercise overlap / pass-behind / clipping / acts.
const keys = ['e', 'c', 'g', 'l', 'p', 'm', 'h', 'e', 'g', 'p', 'l', 'c', 'm', 'h', ' ', 'e', 'g', 'c', 'p', 'l'];
let ki = 0;
const keyTimer = setInterval(() => {
  if (ki >= keys.length) { clearInterval(keyTimer); return; }
  try { child.stdin.write(keys[ki++]); } catch {}
}, 1500);

setTimeout(() => {
  clearInterval(keyTimer);
  try { child.stdin.write('\x03'); } catch {}
  setTimeout(() => {
    const raw = path.join(ROOT, outBase + '.raw');
    fs.writeFileSync(raw, buf);
    // Split into frames on the home escape. Each frame: \x1b[H ... \x1b[0m
    const parts = buf.split('\x1b[H').slice(1);
    let n = 0;
    for (const p of parts) {
      const frame = '\x1b[H' + p;
      if (frame.length < 100) continue;
      fs.writeFileSync(path.join(ROOT, `${outBase}_${String(n).padStart(3, '0')}.out`), frame);
      n++;
    }
    console.log(`${cols}x${rows}: ${buf.length} bytes, ${n} frames -> ${outBase}_*.out`);
    try { child.kill('SIGKILL'); } catch {}
    process.exit(0);
  }, 500);
}, secs * 1000);
