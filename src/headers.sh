#!/usr/bin/env bash
# Regenerates the animated, dithered section headers from the profile banner.
# Needs ImageMagick 7 (`magick`). Usage: bash src/headers.sh
set -euo pipefail
cd "$(dirname "$0")/.."

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
curl -fsSL -o "$tmp/banner.gif" https://github.com/user-attachments/assets/6171c835-3943-4406-a816-aeb8a5d63680
curl -fsSL -o "$tmp/font.ttf" https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf

# banner colors: navy, blues, purples, lavender
magick -size 1x1 xc:'#050C21' xc:'#0B1A3A' xc:'#1B2F66' xc:'#3A2E6E' xc:'#7A2A8C' xc:'#EE35F3' xc:'#5C9AF5' xc:'#BDB4C8' +append "$tmp/palette.png"

out=src/images/headers
mkdir -p "$out"

# Dither at 1/4 size with an ordered (Bayer) matrix, which stays stable between frames, then scale up 4x so pixels stay crisp
dither() { # crop art-size
  magick "$tmp/banner.gif" -coalesce -crop "$1" +repage -resize "$2!" -modulate 95,110 \
    -ordered-dither o8x8,6 -remap "$tmp/palette.png" -filter point -resize 400% "$tmp/art.miff"
}

magick -size 240x1660 gradient:'#050C21E0'-'#050C2120' -rotate 270 "$tmp/fade.png"
header() { # name crop title subtitle
  dither "$2" 415x60
  magick "$tmp/art.miff" null: "$tmp/fade.png" -layers composite -font "$tmp/font.ttf" \
    -pointsize 44 -fill '#000000A0' -annotate +64+124 "$3" -fill '#EE35F3' -annotate +60+120 "$3" \
    -pointsize 20 -fill '#000000A0' -annotate +64+176 "$4" -fill '#5C9AF5' -annotate +62+174 "$4" \
    -layers optimize "$out/$1.gif"
  echo "Wrote $out/$1.gif"
}

# crops keep the 415:60 header ratio
header hackathons     1280x185+0+495    'HACKATHON WINS'        '> weekend builds that took home prizes'
header connect        1280x185+640+10   'CONNECT WITH ME'       "> say hi, I don't bite (my interns might)"
header tech-stack     1920x278+0+140    'MY TECH STACK'         '> click any icon to learn more about it'
header trophies       1280x185+640+110  'MY TROPHIES'           '> achievements unlocked on GitHub'
header followers      1280x185+640+305  "WORLD'S BEST HUMANS"   '> my followers, scroll sideways for more'
header stats          1920x278+0+270    'GITHUB STATS'          '> numbers that go up, mostly'
header interns        1920x278+0+440    'MY AI INTERNS AT WORK' '> claude code, codex & opencode, on shift 24/7'
header contributions  960x139+0+565     'CONTRIBUTIONS'         '> watch the snake eat my commits'

# footer: the whole desk scene, dimmed evenly, text centered
dither 1920x486+0+246 415x105
magick "$tmp/art.miff" -fill '#050C21' -colorize 55 -font "$tmp/font.ttf" -gravity center \
  -pointsize 48 -fill '#000000A0' -annotate +4-26 'THANKS FOR STOPPING BY' -fill '#EE35F3' -annotate +0-30 'THANKS FOR STOPPING BY' \
  -pointsize 20 -fill '#000000A0' -annotate +4+36 '> the interns and I are probably shipping something right now' \
  -fill '#5C9AF5' -annotate +0+34 '> the interns and I are probably shipping something right now' \
  -layers optimize "$out/footer.gif"
echo "Wrote $out/footer.gif"
