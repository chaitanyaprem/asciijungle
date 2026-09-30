# asciijungle

A jungle in your terminal. Animals wander in, do something, and wander out
again. Built for a one-year-old to mash the keyboard at.

Animal keys summon an animal; every other key brings a butterfly, bird,
flower or rainbow, and never touches the animals. `Ctrl+C` is the only
way out. No single letter quits, because toddlers find `q`.

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
| the same key again | that animal hops and calls |
| `space` | a rainbow sweeps across the sky, stays a while, then sweeps away |
| any other key | a butterfly, bird or flower |
| `Ctrl+L` | repaint the screen (animals stay) |
| `Ctrl+C` | quit |

Flags: `--any-key` (non-animal keys summon a random animal instead of a
treat), `--mute` (no clips or spoken names), `--check-sound`.

The path counts treats as scenery, so they never take an animal's seat.
At most six butterflies and birds fly at once; past that a key grows a
flower instead. Flowers last a minute, twelve at most.

## Depth

One scene: one ground line, one waterhole, one browse-height tree, one
bamboo clump. The top of the screen is sky — sun, clouds, birds — not
a roof of vines. A grove of mixed-height trees gives monkeys a run of crowns to hop.

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
- **panda** → waddles up to the bamboo on two legs, takes a stalk, and eats
- **lion** → lies down in the shade beside the tall tree
- **monkey** → swings along vines and trees, then hangs to eat
- **hedgehog** → trundles to a random spot and curls into a ball for a while
- **crocodile** → slides into the waterhole and lurks, eyes above the surface

Roughly one animal in five walks straight past without stopping. That variety
matters more than it sounds. If every elephant stopped at every waterhole the
scene would feel like a machine rather than a jungle.

An animal key summons that animal if it isn't on screen and the path has
room. If it's already on screen, it hops and calls instead, so a key
always does something once its animal is out, even on a full path.
Nobody on screen is ever swapped out for a newcomer. The path holds one
animal per 24 columns of terminal, between 2 and 4; monkeys swing
overhead and have their own limit of 2.

Species are chosen by picking whichever is currently rarest on screen, not by
an independent random draw. A uniform draw looks fair and isn't: with three
species and three opening spawns it produced one of each only 22% of the time,
and three of the *same* species 11% of the time.

A summoned animal that fits appears at the screen edge straight away. About
a third of arrivals play peekaboo first: the head pokes in, ducks back out,
then pokes in further with the animal's call before it walks in. Pressing
its key during the hiding skips to that last peek. The opening cast starts
mid-screen. Only ambient arrivals walk in from off-screen, which takes
12-20 seconds and is fine when nobody is waiting on it.

## Sound

Put clips in `sounds/` named after the animal (`elephant.wav` and friends) and
they play when that animal is summoned or starts its behaviour. Missing files
and missing players are both fine; the jungle stays quiet.

`sounds/` is gitignored; see `sounds/README.md` for why and
`tools/fetch-sounds.sh` for where to get clips.

`tools/fetch-sounds.sh` gets a Wikimedia Commons clip for all seven
animals, trimmed to a couple of seconds and levelled so none is much
louder than the others. The script notes where each clip is cut and why
(the monkey is the soft build-up of a chimp's call, not the scream).

Treats have no clip, so they say their name instead ("butterfly",
"rainbow"). The voice is macOS `say`, or `espeak-ng`, `espeak` or
`spd-say` on Linux; without one, treats are silent. Only one name plays
at a time. Names pressed while one is talking are skipped, so a held
key doesn't build up a backlog.

## Art

Most of the animals are archive ASCII art rather than anything drawn here:

- **elephant**: "Elephant" by Rowan Crawford, via the
  [ASCII Art Archive](https://www.asciiart.eu/animals/elephants)
- **panda**: Braille dot art from
  [emojicombos.com](https://emojicombos.com/panda-ascii-art) (artist not
  credited there): the small upright panda waving, and the same panda with
  a bamboo stalk for eating. The walk (each foot lifting in turn while the
  body sways) is derived from the standing pose
- **hedgehog**: by "ejm", via
  [ascii.co.uk/art/hedgehog](https://ascii.co.uk/art/hedgehog)
- **crocodile**: Shanaka Dias (snd), via
  [ascii.co.uk/art/crocodile](https://ascii.co.uk/art/crocodile); standing
  pose is the full body, vertical tail-curl under the feet omitted so the
  legs stay on the ground; original faces left, so that is the left-walk
  and the right-walk is mirrored
- **giraffe**, **lion**, **monkey**, birds, scenery:
  drawn for this project

Artists' signatures have been removed from the sprites; credit belongs here,
not walking across the screen.

Archive art comes as a single static pose facing one direction, which is not
what an animation needs. `src/artkit.js` closes that gap: `mirror()` flips a
drawing and swaps its directional glyphs, `shiftRow()` nudges the foot row to
make a second walk frame. So a found drawing gets its opposite direction and
its walk cycle derived rather than redrawn. The elephant's drinking pose is
drawn with the trunk unrolled, not spliced onto the walk.

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
  sound.js           audio player discovery, cooldown, playback, speech
  treats.js          butterflies, birds, flowers, rainbow for other keys
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
