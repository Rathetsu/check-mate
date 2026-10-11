#!/usr/bin/env bash
# Downloads the endgame tablebase files into $TABLEBASE_DIR (default
# data/tablebase), where the `tablebase` compose service reads them.
#   scripts/fetch-tablebases.sh       every 3-5 piece table (290 files, ~938 MiB)
#   scripts/fetch-tablebases.sh ci    KRvK and KQvK only, for tests
# The mirror's HTTPS certificate has lapsed, so files come over HTTP and are
# checked against its md5 list, whose own SHA-256 is pinned here.
set -euo pipefail

BASE=http://tablebase.sesse.net/syzygy/3-4-5
LIST_SHA256=1393a55dac25b4985056accf9a7b6123238a290caca1ac6b73d0d652ed815612
DIR=${TABLEBASE_DIR:-data/tablebase}
SET=${1:-345}

mkdir -p "$DIR"
cd "$DIR"
curl -fsSL "$BASE/checksum.md5" -o checksum.md5
echo "$LIST_SHA256  checksum.md5" | shasum -a 256 -c --quiet

if [ "$SET" = ci ]; then
  grep -E '  K[RQ]vK\.rtb[wz]$' checksum.md5 > wanted.md5
else
  cp checksum.md5 wanted.md5
fi

while read -r _ file; do
  [ -f "$file" ] && continue
  echo "fetching $file"
  curl -fsSL "$BASE/$file" -o "$file.part" && mv "$file.part" "$file"
done < wanted.md5

if command -v md5sum > /dev/null; then md5sum -c --quiet wanted.md5; else
  while read -r sum file; do
    [ "$(md5 -q "$file")" = "$sum" ] || { echo "checksum mismatch: $file" >&2; exit 1; }
  done < wanted.md5
fi
echo "$(wc -l < wanted.md5 | tr -d ' ') tablebase files ready in $DIR"
