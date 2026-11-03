'use strict';

const assert = require('assert');
const { ANIMALS } = require('../src/random');
const { columnKey, tapAnimalKey } = require('../src/touch');

const width = 90;
const height = 24;
assert.strictEqual(columnKey(ANIMALS, 1, width), 'e');
assert.strictEqual(columnKey(ANIMALS, 10, width), 'e');
assert.strictEqual(columnKey(ANIMALS, 11, width), 'g');
assert.strictEqual(columnKey(ANIMALS, 90, width), 't');
assert.strictEqual(columnKey(ANIMALS, 0, width), null);

// Sky stays a treat. The ground, including the name row, picks the column.
assert.strictEqual(tapAnimalKey(ANIMALS, 11, 1, width, height), null);
assert.strictEqual(tapAnimalKey(ANIMALS, 11, 10, width, height), null);
assert.strictEqual(tapAnimalKey(ANIMALS, 11, 11, width, height), 'g');
assert.strictEqual(tapAnimalKey(ANIMALS, 90, 24, width, height), 't');

console.log('ok');
