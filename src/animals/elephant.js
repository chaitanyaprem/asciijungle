'use strict';

const animal = require('../animal');
const { mirror, shiftRow, spliceRow, lines, widthOf } = require('../artkit');

// Base drawing: "Elephant" by Rowan Crawford, from the ASCII Art Archive
// (asciiart.eu/animals/elephants). Faces left. The artist's "-Row" signature
// and the wavy ground line underneath it have been removed — credit is in the
// README, and the jungle draws its own ground.
//
// Everything else here is derived rather than redrawn: the right-facing set is
// mirror()ed, the second walk frame is the same art with the foot row nudged,
// and the drinking pose grafts a straight trunk onto the standing pose.
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

// Curled trunk straightened out and dropped to the baseline. The tip sits at
// column 1, which is what anchorLeft points the waterhole at.
const DRINK_L = [
  [6, 0, ' |'],
  [7, 1, '|_'],
  [8, 1, '|'],
  [9, 1, '|'],
  [10, 1, 'U'],
].reduce((art, [row, col, s]) => spliceRow(art, row, col, s), STAND_L);

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
  // Trunk-tip column in each drink pose, so it lands in the water. The
  // right-facing value is derived from the mirror: width - 1 - anchorLeft.
  anchorLeft: 1,
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
