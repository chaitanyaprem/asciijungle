'use strict';

const animal = require('../animal');
const { mirror, shiftRow, lines, widthOf } = require('../artkit');

// Base drawing: "Elephant" by Rowan Crawford, from the ASCII Art Archive
// (asciiart.eu/animals/elephants). Faces left. The artist's "-Row" signature
// and the wavy ground line underneath it have been removed — credit is in the
// README, and the jungle draws its own ground.
//
// Everything else here is derived rather than redrawn: the right-facing set is
// mirror()ed and the second walk frame is the same art with the foot row
// nudged. The drinking pose is the standing body with the curled trunk unrolled
// down from the face into a U-tip — splicing a pipe over the curl left the old
// trunk sitting next to a disconnected vertical line.
const STAND_L = `
         ___     _,.--.,_
      .-~   ~--"~-.   ._ "-.
     /      ./_    Y    "-. \\
    Y       :~     !         Y
    lq p    |     /         .|
 _   \\. .-, l    /          |j
()\\___) |/   \\_/";          !
 \\._____.-~\\  .  ~\\.      ./
            Y_ Y_. "vr"~  T
            (  (    |L    j
            [nn[nn..][nn..]
`;

// Trunk unrolls from the snout (just left of lq p) as a tube, then a
// drop into the water. A single | against the chest |/ read as a broken
// pole, not a trunk. Extra U row + sink:1 puts the tip in the water
// without moving the feet.
const DRINK_L = `
         ___     _,.--.,_
      .-~   ~--"~-.   ._ "-.
     /      ./_    Y    "-. \\
    Y       :~     !         Y
    lq p    |     /         .|
   /\\   .-, l    /          |j
  (  )  |/   \\_/";          !
   \\/   .-~\\  .  ~\\.      ./
   |        Y_ Y_. "vr"~  T
   |        (  (    |L    j
   |        [nn[nn..][nn..]
   U
`;

const WALK_L_A = STAND_L;
const WALK_L_B = shiftRow(STAND_L, 10, 1);

const WALK_R_A = mirror(WALK_L_A);
const WALK_R_B = mirror(WALK_L_B);
const DRINK_R = mirror(DRINK_L);

const spec = {
  type: 'elephant',
  sound: 'elephant',
  feature: 'waterX',
  defaultColor: 'w',
  baseSpeed: 0.55,
  frameSpeed: 0.2,
  actFrameSpeed: 0.08,
  actTicks: 55,
  actChance: 0.8,
  sink: 1,
  // Trunk-tip column in each drink pose, so it lands in the water. The
  // right-facing value is derived from the mirror: width - 1 - anchorLeft.
  anchorLeft: 3,
  anchorRight: null, // filled in below, once we know the mirrored width
  art: {
    walkRight: [WALK_R_A, WALK_R_B],
    walkLeft: [WALK_L_A, WALK_L_B],
    actRight: [DRINK_R],
    actLeft: [DRINK_L],
  },
};

// mirror() pads to the width of the *source* art before reversing, so the
// flipped trunk lands at sourceWidth - 1 - anchorLeft. Measuring the mirrored
// art instead would be off by however many trailing spaces got stripped.
spec.anchorRight = widthOf(lines(DRINK_L)) - 1 - spec.anchorLeft;

function addElephant(anim, opts) {
  return animal.spawn(anim, spec, opts);
}

module.exports = { addElephant, spec };
