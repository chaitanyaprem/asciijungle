'use strict';

// --touch on a tablet. The ground is split into equal columns, one animal
// each, left to right in ANIMALS order. The sky stays a treat. A finger on
// the lower screen brings the animal for that column.

// col is 1-based, the way a mouse report numbers the screen.
function columnKey(animals, col, width) {
  const n = animals.length;
  if (!n || width < 1 || col < 1) return null;
  const slice = Math.max(1, Math.floor(width / n));
  let i = Math.floor((col - 1) / slice);
  if (i < 0) return null;
  if (i >= n) i = n - 1;
  return animals[i].key;
}

// null means "this tap is sky: bring a treat". A letter means that animal.
function tapAnimalKey(animals, col, row, width, height) {
  if (height < 1 || row < 1 || row > height) return null;
  // Top two fifths are sky. Birds and the sun live there, and a tap there
  // should keep bringing a butterfly, a bird, or a flower.
  const sky = Math.max(1, Math.floor(height * 0.42));
  if (row <= sky) return null;
  return columnKey(animals, col, width);
}

module.exports = { columnKey, tapAnimalKey };
