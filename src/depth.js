'use strict';

// Z-depth: lower = closer to viewer (drawn last / on top). Same convention
// as the aquarium engine's painter's algorithm.
//
// One scene, not stacked bands:
//
//   z  0   overlay text
//   z  2   foreground grass
//   z 10   path animals
//   z 16   shoulder animals (pass-behind)
//   z 20   scenery (tree, water, bamboo, ground)
//   z 40   canopy
//   z 50   sky
//
// Path animals sit in front of the set. A head-on pass steps onto the
// shoulder plane — one row up, dimmer, behind the other animal — then
// drops back when the x-ranges separate.
const DEPTH = {
  overlay: 0,
  foreground: 2,
  animal: 10,
  shoulder: 16,
  scenery: 20,
  canopy: 40,
  sky: 50,
};

module.exports = { DEPTH };
