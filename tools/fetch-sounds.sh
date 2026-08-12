#!/usr/bin/env bash
# Fetch animal sounds into sounds/.
#
# Two sources, in order of preference per animal:
#
#   1. Wikimedia Commons — genuinely CC0/public domain, redistributable.
#      Coverage is thin: there's a good elephant trumpet and not much else.
#   2. BBC Sound Effects (bbcsfx.acropolis.org.uk) — ~33,000 effects with
#      excellent animal coverage, free under the RemArc licence for PERSONAL
#      AND EDUCATIONAL USE ONLY. Not redistributable, which is why sounds/ is
#      gitignored. Fine for a toy on your own machine; do not ship it.
#
# Files are converted to .wav because that's what afplay handles natively.
# Missing files are not an error — the jungle just stays quiet for that animal.

set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p sounds

have() { command -v "$1" >/dev/null 2>&1; }

if ! have ffmpeg; then
  echo "ffmpeg not found — install it (brew install ffmpeg) so clips can be" >&2
  echo "converted and trimmed. Aborting." >&2
  exit 1
fi

UA="asciijungle/0.1 (personal use)"

# Trim to a couple of seconds and normalise: a 30-second lion roar is not what
# you want when a toddler is pressing keys twice a second.
convert() { # convert <infile> <outname> <seconds>
  ffmpeg -y -loglevel error -i "$1" -t "${3:-2.5}" -ac 1 -ar 22050 \
    -af "afade=t=out:st=$(echo "${3:-2.5} - 0.3" | bc):d=0.3" \
    "sounds/$2.wav" && echo "  ok  $2.wav"
}

fetch() { # fetch <url> <outname> <seconds>
  local tmp
  tmp="$(mktemp -t asciijungle)" || return 1
  if curl -fsSL -A "$UA" -o "$tmp" "$1"; then
    convert "$tmp" "$2" "${3:-2.5}" || echo "  FAIL convert $2" >&2
  else
    echo "  FAIL download $2 ($1)" >&2
  fi
  rm -f "$tmp"
}

echo "== Wikimedia Commons =="
# CC0 — public domain.
fetch "https://upload.wikimedia.org/wikipedia/commons/4/40/Elephant_voice_-_trumpeting.ogg" elephant 3
# CC BY-SA 4.0 (attribution: Wikimedia Commons, "Hoolock Gibbon Call").
# Gibbons make the classic whooping jungle-monkey sound.
fetch "https://upload.wikimedia.org/wikipedia/commons/d/d1/Hoolock_Gibbon_Call.ogg" monkey 3

echo
echo "== BBC Sound Effects (RemArc licence — personal/educational use only) =="
echo "Search and download by hand from https://sound-effects.bbcrewind.co.uk"
echo "then drop the files in sounds/ named after the animal, e.g.:"
echo
echo "    sounds/elephant.wav   sounds/giraffe.wav   sounds/panda.wav"
echo "    sounds/lion.wav       sounds/monkey.wav    sounds/hedgehog.wav"
echo "    sounds/crocodile.wav"
echo
echo "Any of .wav .m4a .mp3 .aiff .ogg works. Re-run with a local file to"
echo "trim it to length:"
echo
echo "    ffmpeg -i ~/Downloads/roar.wav -t 2.5 -ac 1 -ar 22050 sounds/lion.wav"
echo
echo "Check what the game can see with:  ./asciijungle.js --check-sound"
