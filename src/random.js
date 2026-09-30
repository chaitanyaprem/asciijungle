'use strict';

const { addElephant } = require('./animals/elephant');
const { addGiraffe } = require('./animals/giraffe');
const { addPanda } = require('./animals/panda');
const { addLion } = require('./animals/lion');
const { addMonkey } = require('./animals/monkey');
const { addHedgehog } = require('./animals/hedgehog');
const { addCrocodile } = require('./animals/crocodile');
const { addFrog } = require('./animals/frog');
const { addTurtle } = require('./animals/turtle');
const { react, hurryPeek } = require('./animal');

// Registry of everything that can wander in. Adding an animal means adding one
// line here plus its module — nothing else in the app needs to know about it.
const ANIMALS = [
  { key: 'e', name: 'elephant', add: addElephant },
  { key: 'g', name: 'giraffe', add: addGiraffe },
  { key: 'p', name: 'panda', add: addPanda },
  { key: 'l', name: 'lion', add: addLion },
  { key: 'm', name: 'monkey', add: addMonkey },
  { key: 'h', name: 'hedgehog', add: addHedgehog },
  { key: 'c', name: 'crocodile', add: addCrocodile },
  { key: 'f', name: 'frog', add: addFrog },
  { key: 't', name: 'turtle', add: addTurtle },
];

const BY_KEY = new Map(ANIMALS.map((a) => [a.key, a]));

function typeCounts(anim) {
  const counts = new Map(ANIMALS.map((a) => [a.name, 0]));
  for (const e of anim.entities) {
    if (e.alive && counts.has(e.type)) counts.set(e.type, counts.get(e.type) + 1);
  }
  return counts;
}

// Pick whichever species is least represented on screen right now, breaking
// ties at random.
//
// An independent uniform draw looks fair and isn't: with three species and
// three startup spawns it produced one of each only 22% of the time, and three
// of the *same* species 11% of the time. Watching three identical pandas
// plod across the path is the first thing you notice, and it's the first
// thing anyone reported.
function randomAnimal(anim, opts) {
  const counts = typeCounts(anim);
  let min = Infinity;
  for (const c of counts.values()) if (c < min) min = c;
  const rarest = ANIMALS.filter((a) => counts.get(a.name) === min);
  const a = rarest[Math.floor(Math.random() * rarest.length)];
  return a.add(anim, opts);
}

// An animal key summons that animal if it isn't on screen; if it is,
// everyone of that kind hops and calls. So once an animal is out, its key
// always does something, even on a full path.
function pressAnimal(anim, key, opts) {
  const a = BY_KEY.get(key);
  if (!a) return null;
  const here = anim.entities.filter((e) =>
    e.alive && e.type === a.name && e.entered && !e.peek);
  if (!here.length) {
    // One peeking in from the edge: hurry it to its last peek.
    const peeking = anim.entities.find((e) => e.alive && e.type === a.name && e.peek);
    if (peeking) return hurryPeek(peeking) ? peeking : null;
    return a.add(anim, opts);
  }
  for (const e of here) react(e);
  return here[0];
}

function count(anim) {
  return anim.entities.filter((e) => e.alive && e.type !== 'scenery').length;
}

module.exports = { ANIMALS, BY_KEY, typeCounts, randomAnimal, pressAnimal, count };
