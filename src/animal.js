'use strict';

const { parseShape, parseMask } = require('./engine');
const { freeBands, emptiestBand, occupants, distanceToExit } = require('./world');
const sound = require('./sound');

// Every animal runs the same three-state loop:
//
//   walk  → stroll across the band, legs cycling
//   act   → stop at "its" feature and do its signature thing
//           (elephant drinks, giraffe browses the tall tree, panda eats bamboo)
//   leave → carry on and wander off the far edge
//
// An animal that has no feature, or that rolls badly, simply walks the whole
// way through. That variety matters more than it sounds: if every elephant
// stopped at every waterhole the scene would feel like a machine rather than a
// jungle.

const WALK = 'walk';
const ACT = 'act';
const LEAVE = 'leave';

// Art is authored facing right; `left` variants are supplied per animal
// because mirroring ASCII automatically produces unreadable mush.
function prepare(spec) {
  const p = {};
  for (const key of ['walkRight', 'walkLeft', 'actRight', 'actLeft']) {
    const art = spec.art[key];
    if (!art) continue;
    p[key] = {
      // outerTrans, not autoTrans: only the space *around* the animal is
      // see-through. Its body blocks whatever is behind it.
      frames: parseShape(art, false, null, true),
      masks: spec.color && spec.color[key] ? parseMask(spec.color[key]) : null,
    };
  }
  return p;
}

// Swap the sprite set under an entity, keeping its feet planted. Act poses are
// often taller than walk poses — a giraffe's neck goes up, an elephant's trunk
// goes down — so y has to be recomputed from the ground line, not left alone.
function useArt(e, set) {
  e.frames = set.frames;
  e.colorMasks = set.masks;
  e.physFrame = 0;
  // sinkNow lets an act pose sit below the ground line — the crocodile's lurk
  // drops one row so its own waterline merges with the waterhole surface
  // instead of floating just above it.
  e.physY = e.groundY - e.height() + (e.sinkNow || 0);
  e.y = Math.floor(e.physY);
}

function artFor(prepared, state, facingRight) {
  const dir = facingRight ? 'Right' : 'Left';
  const want = state === ACT ? 'act' + dir : 'walk' + dir;
  return prepared[want] || prepared['walk' + dir] || prepared.walkRight;
}

function spawn(anim, spec, opts = {}) {
  const bands = anim.bands;
  if (!bands || !bands.length) return null;

  // One animal per band, always. Letting a summon squeeze a second animal into
  // an occupied band brings the blob straight back: species walk at different
  // speeds, so a faster one catches the slower one and they merge.
  //
  // An ambient spawn gives up when every band is busy. A summon retires the
  // animal that was closest to walking off anyway and takes its band.
  let band = opts.band;
  if (!band) {
    const free = freeBands(anim);
    if (free.length) band = free[Math.floor(Math.random() * free.length)];
    else if (opts.force) {
      band = emptiestBand(anim);
      for (const o of occupants(anim, band)) o.alive = false;
    } else return null;
  }

  const prepared = spec._prepared || (spec._prepared = prepare(spec));

  // Decide whether this one is going to stop and do its thing *before*
  // choosing an entry side, then come in from the far side of its feature.
  // Otherwise an elephant that spawns on top of the waterhole would have to
  // walk backwards to drink, and simply strolls past instead.
  // 'anywhere' is for behaviours that aren't tied to scenery — the hedgehog
  // curls up wherever it happens to be, not at a landmark.
  const featureX = spec.feature == null ? null
    : spec.feature === 'anywhere'
      ? Math.floor(anim.width() * (0.25 + Math.random() * 0.5))
      : band.features[spec.feature];
  const willAct = featureX != null &&
    Math.random() < (spec.actChance != null ? spec.actChance : 0.75);

  let facingRight;
  if (opts.facingRight != null) facingRight = opts.facingRight;
  else if (willAct) facingRight = featureX > anim.width() / 2;
  else facingRight = Math.random() < 0.5;

  const set = artFor(prepared, WALK, facingRight);
  const w = set.frames[0].width;
  const h = set.frames[0].height;

  // Farther bands crawl; the parallax is a big part of why the scene reads as
  // having depth even though every animal is drawn at one size.
  const speed = (spec.baseSpeed || 0.35) * band.speed;
  const dx = facingRight ? speed : -speed;

  // Normally an animal walks in from off-screen, which is what makes it feel
  // like it arrived. At startup that means staring at an empty jungle for the
  // 12-20 seconds it takes to walk on, so the opening cast is placed already
  // in view.
  let startX = facingRight ? -w : anim.width();
  if (opts.onScreen) {
    const margin = Math.max(2, Math.floor(anim.width() * 0.08));
    const span = Math.max(1, anim.width() - w - margin * 2);
    startX = margin + Math.floor(Math.random() * span);
  } else if (opts.atEdge) {
    // Summoned: stand fully in view at the edge straight away, then walk on.
    // Entering from off-screen means a keypress produces one column of pixels
    // and a 12-second wait before the animal is recognisable, which is no use
    // to the person this is built for.
    startX = facingRight ? 0 : anim.width() - w;
  }

  // The anchor is the column *within the act pose* that should line up with
  // the feature — the trunk tip, the giraffe's muzzle, the panda's paws.
  // Centring the sprite instead would leave the elephant drinking from dry
  // ground a dozen columns to the left of the water.
  let targetX = null;
  if (willAct) {
    const anchor = facingRight
      ? (spec.anchorRight != null ? spec.anchorRight : Math.floor(w / 2))
      : (spec.anchorLeft != null ? spec.anchorLeft : Math.floor(w / 2));
    // featureOffset nudges the whole animal sideways from the feature's
    // centre — the panda needs to sit beside its bamboo clump rather than
    // inside it, or the two drawings tangle into noise.
    const stopX = featureX - anchor + (spec.featureOffset || 0);
    const ahead = facingRight ? stopX > startX + w : stopX < startX - w;
    if (ahead) targetX = stopX;
  }

  const e = anim.newEntity({
    name: `${spec.type}-${Math.random().toString(36).slice(2, 7)}`,
    type: spec.type,
    shape: [], // replaced immediately by useArt
    position: [startX, band.groundY - h, band.z],
    callbackArgs: [dx, 0, 0, spec.frameSpeed || 0.25],
    defaultColor: spec.defaultColor || 'w',
    shade: band.shade,
    dieOffscreen: false, // handled in the callback so `act` can't be cut short
    callback: step,
  });

  e.spec = spec;
  e.prepared = prepared;
  e.band = band;
  e.groundY = band.groundY;
  e.facingRight = facingRight;
  e.state = WALK;
  e.targetX = targetX;
  e.actLeft = 0;
  e.baseDx = dx;
  // Animals start fully off-screen, which is indistinguishable from having
  // finished their walk. Don't test for "left the scene" until they've been
  // seen at least once.
  e.entered = !!(opts.onScreen || opts.atEdge);
  useArt(e, set);
  e.physX = startX;
  e.x = startX;

  if (spec.sound && opts.announce) sound.play(spec.sound);
  return e;
}

function step(e, anim) {
  const spec = e.spec;

  if (e.state === ACT) {
    e.physFrame += spec.actFrameSpeed || 0.12;
    e.actLeft -= 1;
    if (e.actLeft <= 0) {
      e.state = LEAVE;
      e.dx = e.baseDx;
      e.sinkNow = 0;
      useArt(e, artFor(e.prepared, WALK, e.facingRight));
    }
    return;
  }

  e.physX += e.dx;
  e.physFrame += e.frameSpeed;
  e.x = Math.floor(e.physX);

  if (e.state === WALK && e.targetX != null) {
    const reached = e.facingRight ? e.x >= e.targetX : e.x <= e.targetX;
    if (reached) {
      e.state = ACT;
      e.dx = 0;
      e.targetX = null;
      e.actLeft = spec.actTicks || 45;
      e.sinkNow = spec.sink || 0;
      useArt(e, artFor(e.prepared, ACT, e.facingRight));
      if (spec.sound) sound.play(spec.sound);
      return;
    }
  }

  // Off the far edge — retire it. Checked here rather than via dieOffscreen so
  // an animal mid-drink is never swept away by a resize or a stray tick.
  const w = e.width();
  const offscreen = e.x + w <= 0 || e.x >= anim.width();
  if (!offscreen) e.entered = true;
  else if (e.entered) e.alive = false;
}

module.exports = { spawn, WALK, ACT, LEAVE };
