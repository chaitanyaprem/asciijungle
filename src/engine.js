'use strict';

const { ansiColor, shade } = require('./colors');

// ───────────────────────── shape parsing ─────────────────────────
// A frame is { lines: [string], width, height }. Transparent cells
// are stored as '\0' so the renderer can skip them.
// Blanket `autoTrans` turns every space transparent, including the ones inside
// a body outline — which means the tree an animal is standing in front of
// shows straight through its belly. Flood-filling from the border instead
// leaves interior spaces opaque, so animals occlude the scenery behind them
// and the path actually reads as a layer in front of the trees.
function markOuterTransparent(lines, width) {
  const h = lines.length;
  const grid = lines.map((l) => l.split(''));
  const seen = Array.from({ length: h }, () => new Array(width).fill(false));
  const q = [];
  const push = (y, x) => {
    if (y < 0 || y >= h || x < 0 || x >= width) return;
    if (seen[y][x] || grid[y][x] !== ' ') return;
    seen[y][x] = true;
    q.push(y * width + x);
  };
  for (let y = 0; y < h; y++) { push(y, 0); push(y, width - 1); }
  for (let x = 0; x < width; x++) { push(0, x); push(h - 1, x); }
  while (q.length) {
    const cur = q.pop();
    const y = Math.floor(cur / width);
    const x = cur % width;
    push(y + 1, x); push(y - 1, x); push(y, x + 1); push(y, x - 1);
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < width; x++) if (seen[y][x]) grid[y][x] = '\0';
  }
  return grid.map((r) => r.join(''));
}

function parseFrame(text, autoTrans, transparent, outerTrans) {
  // Drop a single leading/trailing newline (Perl q{} convention used in art).
  if (text.startsWith('\n')) text = text.slice(1);
  if (text.endsWith('\n')) text = text.slice(0, -1);
  const rawLines = text.split('\n');
  let width = 0;
  for (const l of rawLines) if (l.length > width) width = l.length;
  let lines = rawLines.map((l) => {
    let row = l.padEnd(width, ' ');
    if (autoTrans) row = row.replace(/ /g, '\0');
    if (transparent) {
      const re = new RegExp(transparent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      row = row.replace(re, '\0');
    }
    return row;
  });
  if (outerTrans) lines = markOuterTransparent(lines, width);
  return { lines, width, height: lines.length };
}

function parseShape(shape, autoTrans, transparent, outerTrans) {
  const arr = Array.isArray(shape) ? shape : [shape];
  return arr.map((s) => parseFrame(s, autoTrans, transparent, outerTrans));
}

function parseMask(mask) {
  const arr = Array.isArray(mask) ? mask : [mask];
  return arr.map((text) => {
    if (text.startsWith('\n')) text = text.slice(1);
    if (text.endsWith('\n')) text = text.slice(0, -1);
    return { lines: text.split('\n') };
  });
}

// ────────────────────────────── Entity ────────────────────────────
class Entity {
  constructor(opts) {
    this.name = opts.name;
    this.type = opts.type;
    this.frames = parseShape(opts.shape, opts.autoTrans, opts.transparent);
    this.colorMasks = opts.color ? parseMask(opts.color) : null;
    this.defaultColor = opts.defaultColor || 'w';
    // 'dim' | 'bright' | null — set from the lane, folded in at render.
    this.shade = opts.shade || null;

    const [x, y, z] = opts.position;
    this.x = x; this.y = y; this.z = z;
    this.physX = x; this.physY = y; this.physZ = z;
    this.physFrame = 0;

    const ca = opts.callbackArgs || [0, 0, 0, 1];
    this.dx = ca[0] || 0;
    this.dy = ca[1] || 0;
    this.dz = ca[2] || 0;
    this.frameSpeed = ca[3] != null ? ca[3] : 1;

    this.dieOffscreen = !!opts.dieOffscreen;
    this.dieTime = opts.dieTime;       // ms epoch
    this.dieFrame = opts.dieFrame;     // remaining frames
    this.deathCb = opts.deathCb;
    this.physical = !!opts.physical;
    this.collHandler = opts.collHandler;
    this.callback = opts.callback;
    this.depth = opts.depth || 0;      // kept for parity with Term::Animation
    this.alive = true;
    this._collisions = [];
  }

  get frame() {
    const i = Math.floor(this.physFrame);
    const n = this.frames.length;
    return this.frames[((i % n) + n) % n];
  }
  get mask() {
    if (!this.colorMasks) return null;
    const i = Math.floor(this.physFrame);
    const n = this.colorMasks.length;
    return this.colorMasks[((i % n) + n) % n];
  }
  width()  { return this.frame.width;  }
  height() { return this.frame.height; }
  position() { return [this.x, this.y, this.z]; }
  size()     { return [this.width(), this.height()]; }
  callbackArgs() { return [this.dx, this.dy, this.dz, this.frameSpeed]; }
  collisions()   { return this._collisions; }
  kill() { this.alive = false; }
}

// ──────────────────────────── Animation ───────────────────────────
class Animation {
  constructor() {
    this.entities = [];
    this.updateTermSize();
  }
  updateTermSize() {
    this.w = process.stdout.columns || 80;
    this.h = process.stdout.rows || 24;
  }
  width()  { return this.w; }
  height() { return this.h; }

  newEntity(opts) { const e = new Entity(opts); this.entities.push(e); return e; }
  addEntity(e)    { this.entities.push(e); return e; }
  delEntity(e)    { e.alive = false; }
  removeAllEntities() { this.entities = []; }
  getEntitiesOfType(type) { return this.entities.filter((e) => e.type === type); }

  moveEntity(e) {
    e.physX += e.dx;
    e.physY += e.dy;
    e.physZ += e.dz;
    e.physFrame += e.frameSpeed;
    e.x = Math.floor(e.physX);
    e.y = Math.floor(e.physY);
    e.z = Math.floor(e.physZ);
  }

  animate() {
    const now = Date.now();
    for (const e of this.entities) {
      if (!e.alive) continue;
      if (e.callback) e.callback(e, this);
      else this.moveEntity(e);

      if (e.dieTime && now >= e.dieTime) e.alive = false;
      if (e.dieFrame !== undefined) {
        e.dieFrame -= 1;
        if (e.dieFrame <= 0) e.alive = false;
      }
      if (e.dieOffscreen) {
        const w = e.width(), h = e.height();
        if (e.x + w <= 0 || e.x >= this.w || e.y + h <= 0 || e.y >= this.h) {
          e.alive = false;
        }
      }
    }

    // collisions among physical entities
    const phys = this.entities.filter((e) => e.alive && e.physical);
    for (const a of phys) {
      if (!a.collHandler) continue;
      const aw = a.width(), ah = a.height();
      const hits = [];
      for (const b of phys) {
        if (a === b) continue;
        const bw = b.width(), bh = b.height();
        if (a.x < b.x + bw && a.x + aw > b.x &&
            a.y < b.y + bh && a.y + ah > b.y) hits.push(b);
      }
      if (hits.length) {
        a._collisions = hits;
        a.collHandler(a, this);
      }
    }

    // sweep dead; run death callbacks
    const alive = [], dead = [];
    for (const e of this.entities) (e.alive ? alive : dead).push(e);
    this.entities = alive;
    for (const e of dead) if (e.deathCb) e.deathCb(e, this);

    this.render();
  }

  redrawScreen() { process.stdout.write('\x1b[2J'); this.render(); }

  render() {
    const w = this.w, h = this.h;
    const ch = new Array(h);
    const co = new Array(h);
    for (let i = 0; i < h; i++) { ch[i] = new Array(w).fill(' '); co[i] = new Array(w).fill(null); }

    // Painter's algorithm: higher z drawn first so lower z ends up on top.
    const sorted = this.entities.slice().sort((a, b) => b.z - a.z);
    for (const e of sorted) {
      const f = e.frame, m = e.mask;
      for (let row = 0; row < f.height; row++) {
        const yy = e.y + row;
        if (yy < 0 || yy >= h) continue;
        const line = f.lines[row];
        const mLine = m ? m.lines[row] : null;
        for (let col = 0; col < line.length; col++) {
          const xx = e.x + col;
          if (xx < 0 || xx >= w) continue;
          const c = line[col];
          if (c === '\0') continue;
          ch[yy][xx] = c;
          let color = e.defaultColor;
          if (mLine && col < mLine.length) {
            const mc = mLine[col];
            if (mc && mc !== ' ') color = mc;
          }
          co[yy][xx] = e.shade ? shade(color, e.shade) : color;
        }
      }
    }

    let out = '\x1b[H';
    let last = null;
    for (let row = 0; row < h; row++) {
      out += `\x1b[${row + 1};1H`;
      for (let col = 0; col < w; col++) {
        const c = co[row][col];
        if (c !== last) { out += ansiColor(c); last = c; }
        out += ch[row][col];
      }
    }
    out += '\x1b[0m';
    process.stdout.write(out);
  }
}

module.exports = { Entity, Animation, parseFrame, parseShape, parseMask };
