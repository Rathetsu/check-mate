#!/usr/bin/env bash
# One-off copy of allowlisted lila assets (P1-UI-06), pinned to one commit.
# The files are committed; rerun only to change the commit or the sets.
# Every set below must be "Allowed" in docs/wiki/open-source-reuse.md.
set -euo pipefail

LILA_COMMIT=46d24871f68844ec1df18ab8618b5156ffbe4e56
PIECES=(cburnett merida mono mpchess fantasy spatial celtic chessnut rhosgfx kiwen-suwi firi)
SOUNDS=(sfx futuristic nes piano)
SOUND_FILES=(Move Capture)

root="$(cd "$(dirname "$0")/.." && pwd)"
dest="$root/apps/web/public/assets"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

git -C "$tmp" init -q
git -C "$tmp" remote add origin https://github.com/lichess-org/lila.git
git -C "$tmp" sparse-checkout set --no-cone $(printf '/public/piece/%s/\n' "${PIECES[@]}") $(printf '/public/sound/%s/\n' "${SOUNDS[@]}")
git -C "$tmp" fetch -q --depth 1 --filter=blob:none origin "$LILA_COMMIT"
git -C "$tmp" checkout -q FETCH_HEAD

rm -rf "$dest/piece" "$dest/sound"
for set in "${PIECES[@]}"; do
  mkdir -p "$dest/piece/$set"
  cp "$tmp/public/piece/$set"/*.svg "$dest/piece/$set/"
done
for set in "${SOUNDS[@]}"; do
  mkdir -p "$dest/sound/$set"
  for f in "${SOUND_FILES[@]}"; do cp "$tmp/public/sound/$set/$f.mp3" "$dest/sound/$set/"; done
done
echo "Copied ${#PIECES[@]} piece sets and ${#SOUNDS[@]} sound sets from lila@${LILA_COMMIT:0:12}."
