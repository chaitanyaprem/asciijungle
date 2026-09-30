'use strict';

const { parseShape, parseMask } = require('./engine');
const {
  canAdd, blockerAt, shoulderTaken, featureBusy,
  ensureClearX, roomAt, pickSwing, nextSwing,
} = require('./world');
const sound = require('./sound');

// Every animal runs the same three-state loop:
//
//   walk  → stroll the shared path, legs cycling
//   act   → stop at "its" feature and do its signature thing
//           (elephant drinks, giraffe browses the tall tree, panda eats bamboo)
//   leave → carry on and wander off the far edge
//
// Landmarks are exclusive. If the waterhole is taken, this elephant walks
// past. Same-direction walkers wait rather than merge; head-on traffic steps
// onto a dimmer shoulder row and drops back when clear.

const WALK = 'walk';
const ACT = 'act';
const LEAVE = 'leave';

// Peekaboo: some arrivals poke their head in from the edge, duck back out,
// then peek again with their call before walking in. Each step is
// [ticks, share of the body showing]; 0 is hidden.
const PEEK_CHANCE = 0.35;
const PEEK_STEPS = [[6, 0.3], [5, 0], [7, 0.5]];

// A reaction to a repeat keypress: a two-row hop over HOP_TICKS.
const HOP_TICKS = 6;

// At the last vine in its direction, a monkey leaps off screen this often
// instead of turning back.
const CANOPY_LEAVE_CHANCE = 0.5;

function prepare(spec) {
  const p = {};
  for (const key of ['walkRight', 'walkLeft', 'actRight', 'actLeft']) {
    const art = spec.art[key];
    if (!art) continue;
    p[key] = {
      frames: parseShape(art, false, null, true),
      masks: spec.color && spec.color[key] ? parseMask(spec.color[key]) : null,
    };
  }
  return p;
}

function useArt(e, set) {
  e.frames = set.frames;
  e.colorMasks = set.masks;
  e.physFrame = 0;
  e.physY = e.groundY - e.height() + (e.sinkNow || 0);
  e.y = Math.floor(e.physY);
}

function artFor(prepared, state, facingRight) {
  const dir = facingRight ? 'Right' : 'Left';
  const want = state === ACT ? 'act' + dir : 'walk' + dir;
  return prepared[want] || prepared['walk' + dir] || prepared.walkRight;
}

function setLane(e, anim, lane) {
  const world = anim.world;
  e.lane = lane;
  if (lane === 'shoulder') {
    e.groundY = world.groundY - 2;
    e.z = world.z.shoulder;
    e.physZ = world.z.shoulder;
    e.shade = 'dim';
  } else {
    e.groundY = world.groundY;
    e.z = world.z.animal;
    e.physZ = world.z.animal;
    e.shade = null;
  }
  e.physY = e.groundY - e.height() + (e.sinkNow || 0);
  e.y = Math.floor(e.physY);
}

function spawn(anim, spec, opts = {}) {
  const world = anim.world;
  if (!world) return null;

  const lane = spec.lane || 'path';
  // A full path refuses the newcomer, keypress or not. Swapping someone
  // out made animals vanish under a mashing hand.
  if (!canAdd(anim, lane)) return null;

  const prepared = spec._prepared || (spec._prepared = prepare(spec));
  let featureKey = spec.feature == null ? null : spec.feature;

  let featureX = null;
  if (featureKey === 'anywhere') {
    featureX = Math.floor(anim.width() * (0.25 + Math.random() * 0.5));
  } else if (featureKey === 'swing') {
    const perch = pickSwing(anim);
    featureX = perch ? perch.x : null;
    if (featureX != null) featureKey = 'swing:' + featureX;
    else featureKey = null;
  } else if (featureKey) {
    featureX = world.features[featureKey];
  }

  let willAct = featureX != null &&
    Math.random() < (spec.actChance != null ? spec.actChance : 0.75);
  if (willAct && featureBusy(anim, featureKey)) willAct = false;

  function stopFor(faceR) {
    if (!willAct) return null;
    const walkW = artFor(prepared, WALK, faceR).frames[0].width;
    const anchor = faceR
      ? (spec.anchorRight != null ? spec.anchorRight : Math.floor(walkW / 2))
      : (spec.anchorLeft != null ? spec.anchorLeft : Math.floor(walkW / 2));
    return featureX - anchor + (spec.featureOffset || 0);
  }

  function approachRoom(faceR, stop, walkW, margin) {
    if (stop == null) return 0;
    const gap = walkW + 2;
    if (faceR) return stop - gap - margin;
    return (anim.width() - walkW - margin) - (stop + gap);
  }

  let facingRight;
  if (opts.facingRight != null) {
    facingRight = opts.facingRight;
  } else if (willAct) {
    const margin0 = Math.max(2, Math.floor(anim.width() * 0.08));
    const preferRight = featureX > anim.width() / 2;
    const wR = artFor(prepared, WALK, true).frames[0].width;
    const wL = artFor(prepared, WALK, false).frames[0].width;
    const roomR = approachRoom(true, stopFor(true), wR, margin0);
    const roomL = approachRoom(false, stopFor(false), wL, margin0);
    if (preferRight && roomR >= 0) facingRight = true;
    else if (!preferRight && roomL >= 0) facingRight = false;
    else facingRight = roomR >= roomL;
  } else {
    facingRight = Math.random() < 0.5;
  }

  const set = artFor(prepared, WALK, facingRight);
  const w = set.frames[0].width;
  const h = set.frames[0].height;
  const speed = spec.baseSpeed || 0.35;
  const dx = facingRight ? speed : -speed;
  const stopX = stopFor(facingRight);

  let startX = facingRight ? -w : anim.width();
  const margin = Math.max(2, Math.floor(anim.width() * 0.08));
  if (opts.onScreen) {
    if (stopX != null) {
      const gap = w + 2;
      if (facingRight) {
        const maxStart = stopX - gap;
        const minStart = margin;
        startX = maxStart > minStart
          ? minStart + Math.floor(Math.random() * (maxStart - minStart + 1))
          : minStart;
      } else {
        const minStart = stopX + gap;
        const maxStart = anim.width() - w - margin;
        startX = maxStart > minStart
          ? minStart + Math.floor(Math.random() * (maxStart - minStart + 1))
          : Math.max(minStart, margin);
      }
      startX = Math.max(margin, Math.min(startX, anim.width() - w - margin));
    } else {
      const span = Math.max(1, anim.width() - w - margin * 2);
      startX = margin + Math.floor(Math.random() * span);
    }
    startX = ensureClearX(anim, startX, w, facingRight, !!opts.force, lane);
    if (startX == null) return null;
  } else if (opts.atEdge) {
    const edge = facingRight ? 0 : anim.width() - w;
    startX = ensureClearX(anim, edge, w, facingRight, !!opts.force, lane);
    if (startX == null) return null;
  }

  // Canopy swingers arrive already hanging, and the opening cast is placed
  // mid-screen, so neither peeks.
  const peek = lane === 'path' && !opts.onScreen && Math.random() < PEEK_CHANCE;
  if (peek) startX = facingRight ? -w : anim.width();

  let targetX = null;
  if (stopX != null) {
    // Full body-width gap is the onScreen walk-up. At the edge a nearby
    // waterhole (x≈22) is still *ahead* of a right-facing elephant even
    // when stopX < startX + width — they should still drink.
    const toward = facingRight ? stopX > startX : stopX < startX;
    if (toward) targetX = stopX;
  }

  let attachY = lane === 'canopy' ? world.swingY : world.groundY;
  if (lane === 'canopy') {
    const perch = pickSwing(anim)
      || { x: world.features.treeX, y: world.swingY };
    const anchor = facingRight
      ? (spec.anchorRight != null ? spec.anchorRight : 2)
      : (spec.anchorLeft != null ? spec.anchorLeft : 2);
    startX = Math.max(0, Math.min(perch.x - anchor, anim.width() - w));
    attachY = perch.y;
    targetX = null;
    featureX = perch.x;
    featureKey = 'swing:' + perch.x;
  }

  const e = anim.newEntity({
    name: `${spec.type}-${Math.random().toString(36).slice(2, 7)}`,
    type: spec.type,
    shape: [],
    position: [startX, attachY - h, world.z.animal],
    callbackArgs: [dx, 0, 0, spec.frameSpeed || 0.25],
    defaultColor: spec.defaultColor || 'w',
    shade: null,
    dieOffscreen: false,
    callback: stepAndHop,
  });

  e.spec = spec;
  e.prepared = prepared;
  e.groundY = attachY;
  e.lane = lane;
  e.featureKey = lane === 'canopy' ? featureKey
    : (targetX != null ? featureKey : null);
  e.facingRight = facingRight;
  e.state = WALK;
  e.targetX = targetX;
  e.actLeft = 0;
  e.baseDx = dx;
  e.entered = !peek && !!(opts.onScreen || opts.atEdge);
  e.peek = peek ? { i: 0, t: 0, fromX: startX } : null;
  useArt(e, set);
  e.physX = startX;
  e.x = startX;

  if (lane === 'canopy') {
    e.state = ACT;
    e.dx = 0;
    e.actLeft = spec.actTicks || 45;
    useArt(e, artFor(prepared, ACT, facingRight));
    e.physX = startX;
    e.x = startX;
  }

  if (spec.sound && opts.announce) sound.play(spec.sound);
  return e;
}

// Returns true while the peek is still running.
function peekStep(e, anim) {
  const p = e.peek;
  const [ticks, share] = PEEK_STEPS[p.i];
  const w = e.width();
  const showing = Math.round(w * share);
  // The head leads, so showing N columns means the front N.
  e.physX = e.facingRight ? p.fromX + showing : p.fromX - showing;
  e.x = Math.floor(e.physX);
  if (p.t === 0 && p.i === PEEK_STEPS.length - 1 && e.spec.sound) sound.play(e.spec.sound);
  p.t += 1;
  if (p.t >= ticks) {
    p.i += 1;
    p.t = 0;
    if (p.i >= PEEK_STEPS.length) {
      e.peek = null;
      e.entered = true;
      return false;
    }
  }
  return true;
}

// A key pressed mid-peek jumps to the last, bigger peek (with its call)
// instead of making a toddler wait out the hiding.
function hurryPeek(e) {
  const last = PEEK_STEPS.length - 1;
  if (!e.peek || e.peek.i === last) return false;
  e.peek.i = last;
  e.peek.t = 0;
  return true;
}

function react(e) {
  e.hopLeft = HOP_TICKS;
  if (e.spec && e.spec.sound) sound.play(e.spec.sound);
}

// Lift e off wherever step() put it. Runs after step so it never fights the
// walk, the act or a monkey's leap arc; the last tick lands back on physY.
function hop(e) {
  if (!e.hopLeft) return;
  e.hopLeft -= 1;
  const t = 1 - e.hopLeft / HOP_TICKS;
  e.y = Math.floor(e.physY) - Math.round(Math.sin(t * Math.PI) * 2);
}

function stepAndHop(e, anim) {
  step(e, anim);
  hop(e);
}

function step(e, anim) {
  const spec = e.spec;

  if (e.peek && peekStep(e, anim)) return;

  if (e.state === ACT) {
    e.physFrame += spec.actFrameSpeed || 0.12;
    e.actLeft -= 1;
    if (e.actLeft <= 0) {
      if (e.lane === 'canopy') {
        const grip = e.x + (e.facingRight
          ? (spec.anchorRight != null ? spec.anchorRight : 2)
          : (spec.anchorLeft != null ? spec.anchorLeft : 2));
        let nxt = nextSwing(anim, grip, e.facingRight);
        // Last vine this way: sometimes swing back, sometimes leap off the
        // edge and leave, so a monkey doesn't hold its canopy seat forever.
        if (nxt == null && Math.random() >= CANOPY_LEAVE_CHANCE) {
          e.facingRight = !e.facingRight;
          nxt = nextSwing(anim, grip, e.facingRight);
        }
        const anchor = e.facingRight
          ? (spec.anchorRight != null ? spec.anchorRight : 2)
          : (spec.anchorLeft != null ? spec.anchorLeft : 2);
        const leap = spec.leapSpeed || spec.baseSpeed || 0.8;
        e.state = WALK;
        // Leaping off: aim past the edge so the off-screen check below
        // removes it before it ever "lands".
        const w = e.width();
        e.targetX = nxt ? nxt.x - anchor
          : (e.facingRight ? anim.width() + w : -2 * w);
        e.leapFromX = e.physX;
        e.leapToX = e.targetX;
        e.leapFromY = e.groundY;
        e.leapToY = nxt ? nxt.y : e.groundY;
        e.dx = e.facingRight ? leap : -leap;
        e.baseDx = e.dx;
        e.featureKey = nxt ? 'swing:' + nxt.x : null;
        useArt(e, artFor(e.prepared, WALK, e.facingRight));
        return;
      }
      e.state = LEAVE;
      e.featureKey = null;
      e.dx = e.baseDx;
      e.sinkNow = 0;
      useArt(e, artFor(e.prepared, WALK, e.facingRight));
    }
    return;
  }

  // Canopy swingers never share the path, so they skip yield/shoulder.
  if (e.lane === 'canopy') {
    e.physX += e.dx;
    e.physFrame += e.frameSpeed;
    e.x = Math.floor(e.physX);
    if (e.leapToX != null && e.leapFromX != null) {
      const span = e.leapToX - e.leapFromX;
      let t = span === 0 ? 1 : (e.physX - e.leapFromX) / span;
      t = Math.max(0, Math.min(1, t));
      e.groundY = e.leapFromY + (e.leapToY - e.leapFromY) * t;
      e.physY = e.groundY - e.height() - Math.round(Math.sin(t * Math.PI) * 3);
      e.y = Math.floor(e.physY);
    }
    if (e.state === WALK && e.targetX != null) {
      const reached = e.facingRight ? e.x >= e.targetX : e.x <= e.targetX;
      if (reached) {
        e.state = ACT;
        e.dx = 0;
        e.targetX = null;
        if (e.leapToY != null) e.groundY = e.leapToY;
        e.leapFromX = e.leapToX = e.leapFromY = e.leapToY = null;
        e.actLeft = spec.actTicks || 45;
        useArt(e, artFor(e.prepared, ACT, e.facingRight));
        if (spec.sound) sound.play(spec.sound);
        return;
      }
    }
    const cw = e.width();
    const off = e.x + cw <= 0 || e.x >= anim.width();
    if (!off) e.entered = true;
    else if (e.entered) e.alive = false;
    return;
  }

  // Drop back from the shoulder once the path gap is free.
  if (e.lane === 'shoulder') {
    const saved = e.lane;
    e.lane = 'path';
    const blocked = blockerAt(anim, e, Math.floor(e.physX + e.dx));
    e.lane = saved;
    if (!blocked) setLane(e, anim, 'path');
  }

  const nextX = Math.floor(e.physX + e.dx);
  const stuck = blockerAt(anim, e, e.x);
  const hit = stuck || blockerAt(anim, e, nextX);
  if (hit) {
    const headOn = e.facingRight !== hit.facingRight;
    const rear = e.facingRight ? e.x <= hit.x : e.x >= hit.x;
    // Only one animal steps aside: right-facing on a head-on, rear animal
    // if already fused. Same-direction approach (not yet overlapping): wait.
    const stepAside = e.lane === 'path' && !shoulderTaken(anim, e) && (
      (headOn && e.facingRight) || (stuck && rear) || hit.state === ACT
    );
    if (stepAside) setLane(e, anim, 'shoulder');
    else {
      // Fused and can't take the shoulder: only the rear animal yields a
      // little so we unstick. Backing up the front one walked crocodiles
      // (and anyone they fused with) backwards across the path.
      if (stuck && rear) {
        e.physX -= Math.sign(e.dx || e.baseDx);
        e.x = Math.floor(e.physX);
      }
      e.physFrame += e.frameSpeed;
      return;
    }
  }

  e.physX += e.dx;
  e.physFrame += e.frameSpeed;
  e.x = Math.floor(e.physX);

  if (e.state === WALK && e.targetX != null) {
    const reached = e.facingRight ? e.x >= e.targetX : e.x <= e.targetX;
    if (reached) {
      if (e.featureKey && e.featureKey !== 'anywhere' &&
          featureBusy(anim, e.featureKey, e)) {
        e.targetX = null;
        e.featureKey = null;
      } else {
        const actSet = artFor(e.prepared, ACT, e.facingRight);
        const actW = actSet.frames[0].width;
        // A wider act pose on a crowded path swallows whoever is
        // standing next to the landmark.
        if (!roomAt(anim, e.x, actW, e, 'path')) {
          e.targetX = null;
          e.featureKey = null;
        } else {
          e.state = ACT;
          e.dx = 0;
          e.targetX = null;
          e.actLeft = spec.actTicks || 45;
          e.sinkNow = spec.sink || 0;
          if (e.lane === 'shoulder') setLane(e, anim, 'path');
          useArt(e, actSet);
          if (spec.sound) sound.play(spec.sound);
          return;
        }
      }
    }
  }

  const w = e.width();
  const offscreen = e.x + w <= 0 || e.x >= anim.width();
  // Gone only once it's past the side it's walking toward. Off the side it
  // came from means it was nudged back while stuck behind someone (a summon
  // lands on top of whoever is at the edge); removing it then made an
  // animal slide out backwards and vanish. It waits and walks back in.
  const pastFar = e.facingRight ? e.x >= anim.width() : e.x + w <= 0;
  if (!offscreen) e.entered = true;
  else if (e.entered && pastFar) e.alive = false;
}

// After a terminal resize the scenery is rebuilt: the ground line, the
// landmarks and the vines all move. Put e back on its lane and let go of a
// landmark that is no longer where it was headed.
function resettle(e, anim) {
  const world = anim.world;
  if (e.lane === 'canopy') {
    // Re-grip the vine nearest where it was hanging.
    const grip = e.x + (e.spec.anchorRight != null ? e.spec.anchorRight : 2);
    let best = null;
    for (const s of world.swings) {
      if (!best || Math.abs(s.x - grip) < Math.abs(best.x - grip)) best = s;
    }
    if (!best) return false;
    e.groundY = best.y;
    e.physX = best.x - (e.spec.anchorRight != null ? e.spec.anchorRight : 2);
    e.x = Math.floor(e.physX);
    e.state = ACT;
    e.dx = 0;
    e.targetX = null;
    e.leapFromX = e.leapToX = e.leapFromY = e.leapToY = null;
    e.featureKey = 'swing:' + best.x;
    e.actLeft = Math.max(e.actLeft, 10);
    useArt(e, artFor(e.prepared, ACT, e.facingRight));
    return true;
  }
  if (e.state === ACT) e.actLeft = 1; // its landmark moved: finish up and go
  if (e.state === WALK) { e.targetX = null; e.featureKey = null; }
  setLane(e, anim, e.lane);
  return true;
}

module.exports = { spawn, react, hurryPeek, resettle, WALK, ACT, LEAVE };
