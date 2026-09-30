#!/usr/bin/env bash
# Fetch animal sounds into sounds/.
#
# Two sources, in order of preference per animal:
#
#   1. Wikimedia Commons — public domain, CC0, CC BY or CC BY-SA, so
#      redistributable with credit. Covers all seven animals, though giraffe
#      and crocodile are stand-ins (a grunt; an alligator's bellow). These
#      are the clips committed in sounds/, credited in sounds/CREDITS.md;
#      this script rebuilds them.
#   2. BBC Sound Effects (bbcsfx.acropolis.org.uk) — ~33,000 effects with
#      excellent animal coverage, free under the RemArc licence for PERSONAL
#      AND EDUCATIONAL USE ONLY. Not redistributable, so .gitignore keeps
#      anything but the seven Commons clips out of git. Fine for a toy on
#      your own machine; do not ship it.
#
# Files are converted to .wav because that's what afplay handles natively,
# and Windows (PowerShell's SoundPlayer) plays .wav only.
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
# you want when a toddler is pressing keys twice a second. <start> skips to
# the part of a long recording worth hearing. loudnorm keeps every animal at
# the same volume; without it clips differed by 18 dB. [loudness] overrides
# the -16 LUFS target for a clip that sounds too loud even when levelled.
convert() { # convert <infile> <outname> <seconds> [start] [loudness]
  ffmpeg -y -loglevel error -ss "${4:-0}" -t "${3:-2.5}" -i "$1" -ac 1 -ar 22050 \
    -af "loudnorm=I=${5:--16}:TP=-1.5,afade=t=in:d=0.05,afade=t=out:st=$(echo "${3:-2.5} - 0.3" | bc):d=0.3" \
    "sounds/$2.wav" && echo "  ok  $2.wav"
}

fetch() { # fetch <url> <outname> <seconds> [start] [loudness]
  local tmp
  tmp="$(mktemp -t asciijungle)" || return 1
  if curl -fsSL -A "$UA" -o "$tmp" "$1"; then
    convert "$tmp" "$2" "${3:-2.5}" "${4:-0}" "${5:--16}" || echo "  FAIL convert $2" >&2
  else
    echo "  FAIL download $2 ($1)" >&2
  fi
  rm -f "$tmp"
}

echo "== Wikimedia Commons =="
# CC0 — public domain.
fetch "https://upload.wikimedia.org/wikipedia/commons/4/40/Elephant_voice_-_trumpeting.ogg" elephant 3
# CC BY 4.0 (Pawel Fedurek et al., "Pant-hoot call made by a male
# chimpanzee"). The "ooh-ooh-ah-ah" build-up, 1.5 s in: the loudest part is
# the scream at the climax, which was too scary. The gibbon call it replaces
# was scary too. Levelled 6 dB under the others: even the build-up is shrill
# next to the rest.
fetch "https://upload.wikimedia.org/wikipedia/commons/5/56/Pant-hoot_call_made_by_a_male_chimpanzee.ogg" monkey 2.5 1.5 -22
# Public domain (த*உழவன், "Lion raring-sound1TamilNadu178"). Zoo lion roar.
fetch "https://upload.wikimedia.org/wikipedia/commons/7/7d/Lion_raring-sound1TamilNadu178.ogg" lion 2.5 4.0
# CC BY-SA 4.0 (Anton Baotic, Florian Sicks, Angela S. Stoeger, "Giraffe grunt").
# Giraffes barely vocalise; a grunt is the clearest thing they do.
fetch "https://upload.wikimedia.org/wikipedia/commons/3/3b/Giraffe_grunt.oga" giraffe 2.0
# Public domain ("Giant panda twittering").
fetch "https://upload.wikimedia.org/wikipedia/commons/b/b8/Giant_panda_twittering.ogg" panda 2.5 0.2
# CC0 (Ullus, "Hedgehog O"). Long-eared hedgehog; 64 s, so skip to a huff.
fetch "https://upload.wikimedia.org/wikipedia/commons/3/3d/Hedgehog_O.ogg" hedgehog 2.5 15.6
# Public domain (Borisblue, "Alligatorbellowedit"). No crocodile recording on
# Commons is more than a hatchling chirp; an alligator bellow reads right.
fetch "https://upload.wikimedia.org/wikipedia/commons/d/db/Alligatorbellowedit.ogg" crocodile 2.5 13.6

echo
echo "== BBC Sound Effects (RemArc licence — personal/educational use only) =="
echo "Every animal above has a Commons clip. To swap one for a better take,"
echo "search and download by hand from https://sound-effects.bbcrewind.co.uk"
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
