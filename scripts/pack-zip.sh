#!/usr/bin/env bash
# Build a release zip for one pack (contents = pack folder root).
# Usage: ./scripts/pack-zip.sh delta-basics
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SLUG="${1:-}"
if [[ -z "$SLUG" ]]; then
  echo "Usage: $0 <pack-slug>" >&2
  exit 1
fi
PACK="$ROOT/packs/$SLUG"
if [[ ! -d "$PACK" ]]; then
  echo "Missing pack: $PACK" >&2
  exit 1
fi
OUT="$ROOT/dist"
mkdir -p "$OUT"
ZIP="$OUT/${SLUG}.zip"
rm -f "$ZIP"
(
  cd "$PACK"
  zip -r "$ZIP" . -x '*.DS_Store' -x '__MACOSX*'
)
echo "Wrote $ZIP"
