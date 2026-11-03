'use strict';

const assert = require('assert');
const { blowToward } = require('../src/treats');

function scene(raining) {
  return { entities: raining ? [{ alive: true, treat: 'rain', windSteps: 0 }] : [] };
}

const wet = scene(true);
assert.strictEqual(blowToward(wet, 1), true);
assert.strictEqual(wet.entities[0].windSteps, 2);
assert.strictEqual(blowToward(wet, -1), true);
assert.strictEqual(wet.entities[0].windSteps, -2);
// A swipe while the sky is dry is not a summon.
assert.strictEqual(blowToward(scene(false), 1), false);
assert.strictEqual(blowToward(wet, 0), false);
assert.strictEqual(wet.entities[0].windSteps, -2);

console.log('ok');
