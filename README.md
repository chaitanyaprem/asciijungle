# asciijungle

A jungle in your terminal. Animals wander in, do something, and wander out
again. Built for a one-year-old to mash the keyboard at.

Animal keys summon an animal; every other key brings a butterfly, bird,
flower, rain or rainbow, and never touches the animals. `Ctrl+C` is the
only way out. No single letter quits, because toddlers find `q`.

## Install

Zero dependencies: you need Node.js 14 or newer and a terminal. Rendering
is raw ANSI escapes.

To install Node.js, follow the official instructions at
[nodejs.org/en/download](https://nodejs.org/en/download) and pick the LTS
version. Check it worked with `node --version`.

### macOS and Linux

```sh
git clone https://github.com/chaitanyaprem/asciijungle.git
cd asciijungle
./asciijungle.js
```

### Windows

Use [Windows Terminal](https://aka.ms/terminal) (built into Windows 11).
The old `cmd` window mangles the colours.

```
git clone https://github.com/chaitanyaprem/asciijungle.git
cd asciijungle
node asciijungle.js
```

No Git? Use **Code → Download ZIP** on the GitHub page, unzip it, and run
`node asciijungle.js` in that folder. Start it with `node` on Windows;
`./asciijungle.js` doesn't work there.

Sound works on Windows too, through PowerShell, which every Windows PC has.

### If the panda shows as boxes

The panda is drawn with Braille characters. If it comes out as boxes or
question marks, your terminal font doesn't have them: pick one that does,
such as DejaVu Sans Mono or Menlo.

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
| `r` | rain falls for a while; partway through a rainbow comes out and stays until the rain stops |
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
Nobody on screen is ever swapped out for a newcomer, and resizing the
terminal (Cmd+Plus/Minus counts) rebuilds only the scenery around the
animals already there. The path holds one
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

Each animal has a clip in `sounds/` (`elephant.wav` and friends) that plays
when it's summoned or starts its behaviour. All seven come from Wikimedia
Commons under free licences, credited in `sounds/CREDITS.md`, so a clone has
sound straight away. Missing files and missing players are both fine; the
jungle stays quiet.

Playback is `afplay` on macOS, PowerShell on Windows, and `ffplay`,
`paplay` or `aplay` on Linux. `node asciijungle.js --check-sound` shows
what the game found.

`tools/fetch-sounds.sh` rebuilds the clips from the Commons originals:
trimmed to a couple of seconds and levelled so none is much louder than the
others, except the monkey, which sits 6 dB under the rest because its call
is shrill. The script notes where each clip is cut and why (the monkey is
the soft build-up of a chimp's call, not the scream).

Butterflies and birds have no clip, so they say their name instead;
flowers, rain and the rainbow just appear. The voice is macOS `say`,
Windows' built-in speech through PowerShell, or `espeak-ng`, `espeak` or
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
  treats.js          butterflies, birds, flowers, rain, rainbow for other keys
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

## License

GPL-2.0-or-later (see `LICENSE`), because the rendering engine comes from
[asciiquarium-js](https://github.com/craftzdog/asciiquarium-js), which is
GPL too. The archive ASCII art keeps its artists' credit in [Art](#art).
The sound clips keep their own licences, listed in `sounds/CREDITS.md`.
