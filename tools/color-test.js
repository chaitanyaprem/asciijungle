'use strict';

const assert = require('assert');
const { ansiColor, setMild } = require('../src/colors');

// No flag: the 16-colour primaries, same as a desktop run.
assert.strictEqual(ansiColor('g'), '\x1b[22;32m');
assert.strictEqual(ansiColor('G'), '\x1b[1;32m');
assert.strictEqual(ansiColor('-g'), '\x1b[2;32m');
assert.strictEqual(ansiColor('w'), '\x1b[22;37m');

setMild(true);
assert.strictEqual(ansiColor('g'), '\x1b[22;38;2;102;145;96m');
assert.strictEqual(ansiColor('G'), '\x1b[22;38;2;150;186;132m');
assert.strictEqual(ansiColor('-g'), '\x1b[2;38;2;102;145;96m');
assert.strictEqual(ansiColor('w'), '\x1b[22;37m');
assert.strictEqual(ansiColor('k'), '\x1b[22;30m');

setMild(false);
assert.strictEqual(ansiColor('g'), '\x1b[22;32m');

console.log('ok');
