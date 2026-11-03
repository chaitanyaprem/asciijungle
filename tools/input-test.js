'use strict';

const assert = require('assert');
const { take } = require('../src/input');

function run(buf) {
  return take(buf);
}

function keys(buf) {
  const { events, rest } = run(buf);
  assert.strictEqual(rest, '', buf);
  return events.map((e) => {
    if (e.type === 'key') return e.key;
    if (e.type === 'escape') return 'esc:' + e.raw;
    if (e.type === 'tap') return 'tap:' + e.col + ',' + e.row;
    return e.type;
  });
}

assert.deepStrictEqual(keys('ep'), ['e', 'p']);
assert.deepStrictEqual(keys('\x03'), ['quit']);
assert.deepStrictEqual(keys('\x0c'), ['redraw']);
assert.deepStrictEqual(keys('\x1b[C'), ['esc:\x1b[C']);
assert.deepStrictEqual(keys('\x1bOC'), ['esc:\x1bOC']);
assert.deepStrictEqual(keys('\x1b[1;2C'), ['esc:\x1b[1;2C']);
assert.deepStrictEqual(keys('\x1b[<0;10;20M'), ['tap:10,20']);
assert.deepStrictEqual(keys('\x1b[<0;10;20m'), []);
assert.deepStrictEqual(keys('\x1b[<64;1;1M'), []);
assert.deepStrictEqual(keys('\x1b[<32;4;5M'), []);
assert.deepStrictEqual(keys('\x1b[<0;10;20Mx'), ['tap:10,20', 'x']);
assert.deepStrictEqual(keys('e\x1b[<0;3;4Mr'), ['e', 'tap:3,4', 'r']);

let split = run('\x1b[<0;10;');
assert.deepStrictEqual(split.events, []);
assert.strictEqual(split.rest, '\x1b[<0;10;');
split = run(split.rest + '20M');
assert.deepStrictEqual(split.events.map((e) => e.type), ['tap']);
assert.strictEqual(split.events[0].col, 10);
assert.strictEqual(split.events[0].row, 20);
assert.strictEqual(split.rest, '');

split = run('\x1b');
assert.deepStrictEqual(split.events, []);
assert.strictEqual(split.rest, '\x1b');
split = run(split.rest + '[C');
assert.strictEqual(split.rest, '');
assert.deepStrictEqual(split.events.map((e) => 'esc:' + e.raw), ['esc:\x1b[C']);

assert.deepStrictEqual(keys('\x1bx'), ['esc:\x1b', 'x']);

console.log('ok');
