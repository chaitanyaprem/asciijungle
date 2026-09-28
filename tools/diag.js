'use strict';
// Report exact screen ranges for scenery + a deterministic animal cast,
// and compute overlaps between animals and landmarks.
Object.defineProperty(process.stdout, 'columns', { value: 80, configurable: true });
Object.defineProperty(process.stdout, 'rows', { value: 24, configurable: true });
const realWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = () => true; // silence the renderer
// keep console.log working
console.log = (...a) => realWrite(a.join(' ') + '\n');

const { Animation } = require('../src/engine');
const { buildWorld } = require('../src/world');
const { addScenery } = require('../src/scenery');
const animal = require('../src/animal');
const specs = {
  elephant: require('../src/animals/elephant').spec,
  giraffe: require('../src/animals/giraffe').spec,
  panda: require('../src/animals/panda').spec,
  lion: require('../src/animals/lion').spec,
  monkey: require('../src/animals/monkey').spec,
  hedgehog: require('../src/animals/hedgehog').spec,
  crocodile: require('../src/animals/crocodile').spec,
};

const anim = new Animation();
buildWorld(anim);
addScenery(anim);

console.log('TERMINAL 80x24');
console.log('world: groundY=%d skyRows=%d swingY=%d', anim.world.groundY, anim.skyRows, anim.world.swingY);
console.log('features: waterX=%d treeX=%d bambooX=%d', anim.world.features.waterX, anim.world.features.treeX, anim.world.features.bambooX);
console.log('swings:', JSON.stringify(anim.world.swings));
console.log('maxAnimals=%d', require('../src/world').maxAnimals(anim));
console.log();

console.log('── SCENERY RANGES (name: x[lo..hi) y[lo..hi] z) ──');
for (const e of anim.entities) {
  if (e.type !== 'scenery') continue;
  console.log('  %-14s x[%2d..%2d) y[%2d..%2d) z=%d w=%d h=%d',
    e.name, e.x, e.x + e.width(), e.y, e.y + e.height(), e.z, e.width(), e.height());
}
console.log();

// Landmark x-ranges for overlap checks
function rangeOf(name) {
  const e = anim.entities.find((x) => x.type === 'scenery' && x.name === name);
  return e ? [e.x, e.x + e.width(), e.y, e.y + e.height()] : null;
}
const water = rangeOf('waterhole');
const tree = rangeOf('tree');
const bamboo = rangeOf('bamboo');
console.log('landmarks: water x[%d..%d) y[%d..%d) | tree x[%d..%d) y[%d..%d) | bamboo x[%d..%d) y[%d..%d)',
  water[0], water[1], water[2], water[3], tree[0], tree[1], tree[2], tree[3], bamboo[0], bamboo[1], bamboo[2], bamboo[3]);
console.log();

function overlaps(a, b) {
  // a,b = [x0,x1,y0,y1]; check 2D box intersection
  return a[0] < b[1] && a[2] < b[3] && b[0] < a[1] && b[2] < a[3];
}

function test(label, spec, x, act, facingRight) {
  // fresh entities per test so occupancy doesn't interfere
  const e = animal.spawn(anim, spec, { onScreen: true, facingRight, force: true });
  if (!e) { console.log('  %-28s SPAWN FAILED', label); return; }
  e.physX = x; e.x = Math.floor(x);
  if (act) {
    e.state = animal.ACT; e.dx = 0; e.actLeft = 5;
    const dir = facingRight ? 'Right' : 'Left';
    const set = e.prepared['act' + dir] || e.prepared['walk' + dir];
    e.frames = set.frames; e.colorMasks = set.masks;
    e.physY = e.groundY - e.height() + (e.sinkNow || 0);
    e.y = Math.floor(e.physY);
  }
  const r = [e.x, e.x + e.width(), e.y, e.y + e.height()];
  const hits = [];
  if (overlaps(r, water)) hits.push('WATER');
  if (overlaps(r, tree)) hits.push('TREE');
  if (overlaps(r, bamboo)) hits.push('BAMBOO');
  console.log('  %-28s x[%2d..%2d) y[%2d..%2d) %s  overlap: %s',
    label, r[0], r[1], r[2], r[3], act ? 'ACT' : 'walk', hits.join(',') || '-');
  anim.entities = anim.entities.filter((q) => q.type === 'scenery');
}

// Compute where each animal's ACT pose is placed (its stopX) and check the
// landmark it's supposed to use.
console.log('── ACT-POSE PLACEMENT vs intended landmark ──');
// stopX = featureX - anchor + offset (per facing). Recompute what spawn would pick.
function stopX(spec, featureX, facingRight) {
  const dir = facingRight ? 'Right' : 'Left';
  const a = facingRight
    ? (spec.anchorRight != null ? spec.anchorRight : Math.floor(spec.walkRight[0].length / 2))
    : (spec.anchorLeft != null ? spec.anchorLeft : Math.floor(spec.walkLeft[0].length / 2));
  return featureX - a + (spec.featureOffset || 0);
}
const F = anim.world.features;
// We need the ACT frame width for the x-range, not walk. Use prepared frames.
function actRange(spec, x, facingRight) {
  const dir = facingRight ? 'Right' : 'Left';
  const set = spec._prepared['act' + dir];
  return [x, x + set.frames[0].width];
}
console.log('  elephant → waterX=%d', F.waterX);
for (const fr of [true, false]) {
  const sx = stopX(specs.elephant, F.waterX, fr);
  test('elephant act ' + (fr ? 'R' : 'L'), specs.elephant, sx, true, fr);
}
console.log('  crocodile → waterX=%d', F.waterX);
for (const fr of [true, false]) {
  const sx = stopX(specs.crocodile, F.waterX, fr);
  test('crocodile act ' + (fr ? 'R' : 'L'), specs.crocodile, sx, true, fr);
}
console.log('  giraffe → treeX=%d', F.treeX);
for (const fr of [true, false]) {
  const sx = stopX(specs.giraffe, F.treeX, fr);
  test('giraffe act ' + (fr ? 'R' : 'L'), specs.giraffe, sx, true, fr);
}
console.log('  lion → treeX=%d (offset %d)', F.treeX, specs.lion.featureOffset);
for (const fr of [true, false]) {
  const sx = stopX(specs.lion, F.treeX, fr);
  test('lion act ' + (fr ? 'R' : 'L'), specs.lion, sx, true, fr);
}
console.log('  panda → bambooX=%d (offset %d)', F.bambooX, specs.panda.featureOffset);
for (const fr of [true, false]) {
  const sx = stopX(specs.panda, F.bambooX, fr);
  test('panda act ' + (fr ? 'R' : 'L'), specs.panda, sx, true, fr);
}
console.log('  hedgehog → anywhere (x=40)');
test('hedgehog act', specs.hedgehog, 40, true, true);
process.exit(0);
