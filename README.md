# asciijungle

A jungle in your terminal. Animals wander in, do something, and wander out
again. Built for a one-year-old to mash the keyboard at.

Any key summons an animal. `Ctrl+C` is the only way out. No single letter
quits, because toddlers find `q`.

## Install

```sh
git clone <this repo>
cd asciijungle
./asciijungle.js
```

Zero dependencies, plain Node ≥ 14. Rendering is raw ANSI escapes.

## Keys

| Key | What happens |
| --- | --- |
| `e` | elephant |
| `g` | giraffe |
| `p` | panda |
| `l` | lion |
| `m` | monkey |
| `h` | hedgehog |
| `c` | crocodile |
| any other key | a random animal wanders in |
| `Ctrl+L` | redraw |
| `Ctrl+C` | quit |

Flags: `--calm` (only the animal keys summon; other keys do nothing), `--mute`, `--check-sound`.

## Depth

One scene: one ground line, one waterhole, one browse-height tree, one
bamboo clump. A tall window fills with hanging canopy, vines, and dim
backdrop trees — not extra floors. Animals share the path in front of
the set.

Two animals on the same ground line still blob if they overlap, so they
don't. Same-direction walkers wait. Head-on traffic steps onto a dimmer
row two rows above the path and drops back when the gap is clear. Landmarks
are exclusive — one drinker at the water, one browser at the tree.

A terminal's width sets how many bodies fit (usually 2–4), not a band count.

## Behaviour

Animals run a three-state loop: walk in, stop at "their" feature and do their
thing, then carry on and leave.

- **elephant** → straightens its trunk into the waterhole and drinks
- **giraffe** → stretches its neck up into the tall tree and browses
- **panda** → sits back in the bamboo, turns to face you, and eats
- **lion** → lies down in the shade beside the tall tree
- **monkey** → sits at the foot of the tree and eats
- **hedgehog** → trundles to a random spot and curls into a ball for a while
- **crocodile** → slides into the waterhole and lurks, eyes above the surface

Roughly one animal in five walks straight past without stopping. That variety
matters more than it sounds. If every elephant stopped at every waterhole the
scene would feel like a machine rather than a jungle.

A key adds an animal until the path is full. After that it retires a
leaver or a walk-past; if everyone is still walking toward a landmark,
the least-invested one goes. A drink in progress is never cancelled. If
the path is all mid-act, the key is ignored.

Species are chosen by picking whichever is currently rarest on screen, not by
an independent random draw. A uniform draw looks fair and isn't: with three
species and three opening spawns it produced one of each only 22% of the time,
and three of the *same* species 11% of the time.

A summoned animal appears in full at the screen edge straight away. The
opening cast starts mid-screen. Only ambient arrivals walk in from off-screen,
which takes 12-20 seconds and is fine when nobody is waiting on it.

## Sound

Put clips in `sounds/` named after the animal (`elephant.wav` and friends) and
they play when that animal is summoned or starts its behaviour. Missing files
and missing players are both fine; the jungle stays quiet.

`sounds/` is gitignored; see `sounds/README.md` for why and
`tools/fetch-sounds.sh` for where to get clips.

## Art

Most of the animals are archive ASCII art rather than anything drawn here:

- **elephant**: "Elephant" by Rowan Crawford, via the
  [ASCII Art Archive](https://www.asciiart.eu/animals/elephants)
- **panda** (sitting): "Bear face" by Joan G. Stark, via the
  [ASCII Art Archive](https://www.asciiart.eu/animals/bears), with a seated
  body added so it can hold bamboo
- **lion**: by "snd", via [ascii.co.uk/art/lion](https://ascii.co.uk/art/lion),
  with a derived resting pose
- **hedgehog**: by "ejm", via
  [ascii.co.uk/art/hedgehog](https://ascii.co.uk/art/hedgehog)
- **monkey** (sitting): adapted from "ejm97", via
  [ascii.co.uk/art/monkey](https://ascii.co.uk/art/monkey)
- **giraffe**, **walking panda**, **walking monkey**, **crocodile**, scenery:
  drawn for this project

Artists' signatures have been removed from the sprites; credit belongs here,
not walking across the screen.

Archive art comes as a single static pose facing one direction, which is not
what an animation needs. `src/artkit.js` closes that gap: `mirror()` flips a
drawing and swaps its directional glyphs, `shiftRow()` nudges the foot row to
make a second walk frame, `spliceRow()` grafts on a straightened trunk. So a
found drawing gets its opposite direction and its walk cycle derived rather
than redrawn.

## Layout

```
asciijungle.js       entry: argv, terminal setup, tick loop, keys
src/
  engine.js          Entity + Animation, shape/mask parsing, renderer
  colors.js          ANSI colour tokens, including the dim tier
  depth.js           z-plane (path, shoulder, scenery)
  world.js           one path, landmarks, occupancy
  scenery.js         canopy, ground, waterholes, trees, bamboo, grass
  animal.js          walk → act → leave state machine
  artkit.js          mirror / shiftRow / spliceRow / unsign
  sound.js           audio player discovery, cooldown, playback
  random.js          animal registry and population cap
  animals/           one module per species (elephant, giraffe, panda,
                     lion, monkey, hedgehog, crocodile)
```

`engine.js`, `colors.js` and the terminal bootstrap are lifted from
[asciiquarium-js](https://github.com/craftzdog/asciiquarium-js), the Node port
of Kirk Baucom's Perl `asciiquarium`.

### Adding an animal

Write `src/animals/yours.js` exporting a spec — art frames, walking speed,
which feature it stops at, where its acting anchor is — and add one line to
the registry in `src/random.js`. Nothing else needs to know about it.

## Transparency

Animal bodies are opaque, but the space around them is not. `parseFrame` flood
fills transparency from the sprite's border inward, so interior gaps stay
solid. The blanket "every space is transparent" approach the aquarium uses
would let trees show straight through an elephant's belly. That's fine
underwater and wrong here.
