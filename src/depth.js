'use strict';

// Z-depth: lower = closer to viewer (drawn last / on top), same convention as
// the aquarium engine's painter's algorithm.
//
// The jungle is built from horizontal depth *bands*. Each band owns a slice of
// the z range so that everything in a nearer band — scenery included — occludes
// everything in a farther one:
//
//   z  0   overlay text
//   z  2   foreground grass fringe (closest thing on screen)
//   z 10   NEAR animals      z 12  NEAR scenery
//   z 20   MID  animals      z 22  MID  scenery
//   z 30   FAR  animals      z 32  FAR  scenery
//   z 40   canopy
//   z 50   sky
//
// bandZ(i) gives the animal plane for band i (0 = farthest). Scenery sits two
// steps behind its own band's animals, so an elephant walks in front of the
// trees it shares a band with but behind the trees of the band in front.
const DEPTH = {
  overlay: 0,
  foreground: 2,
  canopy: 40,
  sky: 50,
};

const BAND_STRIDE = 10;
const NEAREST_BAND_Z = 10;

// i counts from the back: 0 = farthest. bandCount tells us how far to push it.
function bandZ(i, bandCount) {
  const fromFront = bandCount - 1 - i;
  return NEAREST_BAND_Z + fromFront * BAND_STRIDE;
}

function sceneryZ(i, bandCount) {
  return bandZ(i, bandCount) + 2;
}

module.exports = { DEPTH, bandZ, sceneryZ, BAND_STRIDE };
