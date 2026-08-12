'use strict';

const { bandZ, sceneryZ } = require('./depth');

// A band is one horizontal slice of jungle at a fixed distance from the
// viewer. Everything that gives the scene depth is a property of the band, not
// of the sprite — so a single drawing of an elephant reads as "far away" or
// "right in front of you" purely by which band it was spawned into:
//
//   groundY  where feet rest (farther bands sit higher up the screen)
//   shade    'dim' | null | 'bright'   (faint green recedes, bold advances)
//   speed    parallax multiplier (far things crawl, near things stride)
//   z        render plane, so near bands occlude far ones
//
// Each band carries its own waterhole, tall tree and bamboo clump, so an
// animal always drinks or grazes at something in *its own* slice of the world
// and never appears to walk into scenery a hundred feet behind it.

// A giraffe with its neck up is the tallest thing we place, so a band has to
// be at least this tall to be worth having.
const MIN_BAND_ROWS = 11;
const MAX_BANDS = 3;

function bandName(i, count) {
  if (count === 1) return 'near';
  if (i === 0) return 'far';
  if (i === count - 1) return 'near';
  return 'mid';
}

function bandShade(i, count) {
  if (count === 1) return null;
  if (i === 0) return 'dim';
  if (i === count - 1) return 'bright';
  return null;
}

// Far things move slower, but not so much slower that an elephant takes four
// minutes to cross the back of the screen — a toddler's patience sets the
// floor here, not physics.
function bandSpeed(i, count) {
  if (count === 1) return 1;
  return 0.55 + 0.45 * (i / (count - 1));
}

function buildBands(anim) {
  const w = anim.width();
  const h = anim.height();

  // Top of the screen is sky and hanging canopy; bottom row is the foreground
  // grass fringe. What's left gets divided into bands.
  const skyRows = Math.min(6, Math.max(3, Math.floor(h * 0.14)));
  const usable = h - skyRows - 1;
  const count = Math.max(1, Math.min(MAX_BANDS, Math.floor(usable / MIN_BAND_ROWS)));
  const slice = usable / count;

  const bands = [];
  for (let i = 0; i < count; i++) {
    const groundY = skyRows + Math.round(slice * (i + 1)) - 1;
    const topY = i === 0 ? skyRows : bands[i - 1].groundY + 1;
    bands.push({
      i,
      name: bandName(i, count),
      count,
      groundY,
      topY,
      height: groundY - topY,
      z: bandZ(i, count),
      sceneryZ: sceneryZ(i, count),
      shade: bandShade(i, count),
      speed: bandSpeed(i, count),
      // Offset per band so the waterholes, trees and bamboo don't stack into a
      // suspiciously straight column. All three shift the *same* direction:
      // offsetting them in opposite directions makes them converge in the
      // nearer bands, and a panda then ends up sitting inside a tree.
      features: {
        waterX: Math.floor(w * (0.20 + 0.05 * i)),
        treeX: Math.floor(w * (0.48 + 0.05 * i)),
        bambooX: Math.floor(w * (0.76 + 0.05 * i)),
      },
    });
  }

  anim.bands = bands;
  anim.skyRows = skyRows;
  return bands;
}

function randomBand(anim) {
  const b = anim.bands;
  return b[Math.floor(Math.random() * b.length)];
}

// Live animals currently walking in a given band.
function occupants(anim, band) {
  return anim.entities.filter((e) => e.alive && e.type !== 'scenery' && e.band === band);
}

// A band holds one animal at a time. Two animals sharing a band walk through
// each other and merge into an unreadable blob — they're the same z, both
// opaque, and nothing makes them yield. One-per-band also keeps the scene
// legible: three bands, three animals, three different species.
function freeBands(anim) {
  return anim.bands.filter((b) => occupants(anim, b).length === 0);
}

// How far an animal still has to walk before it's off the screen. Used to pick
// which band is about to free up when every band is busy.
function distanceToExit(anim, e) {
  return e.dx >= 0 ? anim.width() - e.x : e.x + e.width();
}

// When a summon needs a band and none is free, someone has to go. Choosing
// purely by distance-to-exit turned out to systematically execute the animal
// *furthest along its walk* — which is precisely the one about to drink or
// graze, so under regular keypresses nothing ever finished its behaviour.
// Score by how much would be lost instead: an animal already leaving loses
// nothing, a walk-past loses little, an actor is mid-performance, and an
// animal still walking toward its feature has the whole payoff ahead of it.
function summonCost(e) {
  if (e.state === 'leave') return 0;
  if (e.state === 'walk' && e.targetX == null) return 1;
  if (e.state === 'act') return 2;
  return 3; // walking toward its feature — protect if at all possible
}

// The band whose occupant is cheapest to displace, so a summon has somewhere
// to go when the jungle is full.
function emptiestBand(anim) {
  const free = freeBands(anim);
  if (free.length) return free[Math.floor(Math.random() * free.length)];
  let best = null, bestKey = Infinity;
  for (const b of anim.bands) {
    for (const e of occupants(anim, b)) {
      // Cost tier dominates. Within a tier, tie-breaks differ:
      //  - tiers 0-2: whoever is closest to the exit anyway.
      //  - tier 3 (walking toward its feature): whoever has the MOST walking
      //    still ahead — the least-invested animal. Under key-mashing this
      //    makes each press recycle the newest arrival while the veterans
      //    deeper into their walk survive to actually drink and graze;
      //    tie-breaking by progress instead meant nothing ever finished.
      let tie;
      if (summonCost(e) === 3) {
        const remaining = Math.abs(e.targetX - e.x);
        tie = Math.max(0, 9999 - remaining);
      } else {
        tie = distanceToExit(anim, e);
      }
      const key = summonCost(e) * 10000 + tie;
      if (key < bestKey) { bestKey = key; best = b; }
    }
  }
  return best || anim.bands[0];
}

// Where an animal of a given height should sit so its feet touch the ground
// line rather than straddling it.
function feetY(band, spriteHeight) {
  return band.groundY - spriteHeight;
}

module.exports = {
  buildBands, randomBand, feetY, occupants, freeBands, emptiestBand,
  distanceToExit, MIN_BAND_ROWS, MAX_BANDS,
};
