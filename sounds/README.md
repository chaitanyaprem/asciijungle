# sounds/

One clip per animal, named after it (`elephant.wav`, `giraffe.wav`, and so
on). The eight shipped here come from Wikimedia Commons (the turtle has none); see `CREDITS.md`.

To use your own, drop a file in with the animal's name. `.wav`, `.m4a`,
`.mp3`, `.aiff` and `.ogg` all work on macOS and Linux; Windows plays
`.wav` only. On macOS playback goes through `afplay`, on Windows through
PowerShell, and on Linux through `ffplay`, `paplay` or `aplay`, whichever
it finds first. If none of them exist, or a file is missing, that animal
is silent and nothing breaks.

Check what the game can actually see:

```sh
./asciijungle.js --check-sound
```

Keep clips short, ideally under three seconds. `tools/fetch-sounds.sh` will
trim and downmix anything you point it at:

```sh
ffmpeg -i ~/Downloads/roar.wav -t 2.5 -ac 1 -ar 22050 sounds/lion.wav
```

## Licensing

Only the Wikimedia Commons clips are committed, each named in
`.gitignore`; any other file you add here stays out of git. That matters for
the BBC Sound Effects library: it is free under the RemArc licence for
**personal and educational use only** and is not redistributable, so those
clips must never be committed. Replacing one of the committed files with a BBC
clip would still be committed, so don't. The Commons clips are public
domain, CC0, CC BY or CC BY-SA; `CREDITS.md` gives the attribution the
last two need.
