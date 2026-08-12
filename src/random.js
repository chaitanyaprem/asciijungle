'use strict';

const { addElephant } = require('./animals/elephant');
const { addGiraffe } = require('./animals/giraffe');
const { addPanda } = require('./animals/panda');
const { addLion } = require('./animals/lion');
const { addMonkey } = require('./animals/monkey');
const { addHedgehog } = require('./animals/hedgehog');
const { addCrocodile } = require('./animals/crocodile');

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
// plod across three bands is the first thing you notice, and it's the first
// thing anyone reported.
function randomAnimal(anim, opts) {
  const counts = typeCounts(anim);
  let min = Infinity;
  for (const c of counts.values()) if (c < min) min = c;
  const rarest = ANIMALS.filter((a) => counts.get(a.name) === min);
  const a = rarest[Math.floor(Math.random() * rarest.length)];
  return a.add(anim, opts);
}

function summonByKey(anim, key, opts) {
  const a = BY_KEY.get(key);
  if (!a) return null;
  return a.add(anim, opts);
}

function count(anim) {
  return anim.entities.filter((e) => e.alive && e.type !== 'scenery').length;
}

module.exports = { ANIMALS, BY_KEY, typeCounts, randomAnimal, summonByKey, count };
