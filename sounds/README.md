# sounds/

Drop audio files here, named after the animal:

```
elephant.wav
giraffe.wav
panda.wav
```

`.wav`, `.m4a`, `.mp3`, `.aiff` and `.ogg` all work. On macOS playback goes
through `afplay`; on Linux it falls back to `ffplay`, `paplay` or `aplay`,
whichever it finds first. If none of them exist, or a file is missing, that
animal is silent and nothing breaks.

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

This directory is gitignored on purpose. The BBC Sound Effects library is free
under the RemArc licence for **personal and educational use only** and is not
redistributable, so those clips must not be committed. The Wikimedia Commons
clips that `fetch-sounds.sh` downloads are public domain, CC0 or CC BY-SA
(each is credited in the script) and could be shipped with attribution, but
the directory is excluded wholesale rather than file-by-file so that nothing
licensed gets committed by accident.
