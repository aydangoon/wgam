#!/usr/bin/env bash
# Convert "expensive" images in public/images to WebP.
#
#   PNG/JPG -> static WebP via cwebp
#   GIF     -> animated WebP via gif2webp
#
# Files smaller than $SIZE_THRESHOLD are skipped. Originals are preserved.
# Re-running is safe: existing .webp outputs are skipped unless --force.
#
# Tunables:
#   QUALITY           lossy quality (0-100). 78 is a good balance for art.
#   SIZE_THRESHOLD    only convert files larger than this (bytes).
#
# Usage:
#   ./scripts/convert-to-webp.sh           # convert
#   ./scripts/convert-to-webp.sh --force   # re-convert even if .webp exists
#   ./scripts/convert-to-webp.sh --delete  # delete original after successful convert

set -euo pipefail

IMAGES_DIR="public/images"
QUALITY=78
SIZE_THRESHOLD=$((100 * 1024)) # 100 KB

FORCE=0
DELETE=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --delete) DELETE=1 ;;
  esac
done

for tool in cwebp gif2webp; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required tool: $tool" >&2
    echo "Install with: brew install webp" >&2
    exit 1
  fi
done

shopt -s nullglob
total_saved=0

for f in "$IMAGES_DIR"/*.png "$IMAGES_DIR"/*.gif "$IMAGES_DIR"/*.jpg "$IMAGES_DIR"/*.jpeg; do
  size=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f")
  if [ "$size" -lt "$SIZE_THRESHOLD" ]; then
    continue
  fi

  ext="${f##*.}"
  ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
  base="${f%.*}"
  out="${base}.webp"

  if [ -f "$out" ] && [ "$FORCE" -ne 1 ]; then
    echo "skip   $f (webp exists)"
    continue
  fi

  case "$ext_lower" in
    gif)
      gif2webp -q "$QUALITY" -mt -m 6 "$f" -o "$out" >/dev/null 2>&1
      ;;
    png | jpg | jpeg)
      cwebp -q "$QUALITY" -m 6 -mt "$f" -o "$out" >/dev/null 2>&1
      ;;
    *)
      continue
      ;;
  esac

  out_size=$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")
  saved=$((size - out_size))
  total_saved=$((total_saved + saved))

  before_h=$(du -h "$f" | cut -f1)
  after_h=$(du -h "$out" | cut -f1)
  pct=$((100 - (out_size * 100 / size)))
  printf "ok     %-45s  %s -> %s  (-%d%%)\n" "$f" "$before_h" "$after_h" "$pct"

  if [ "$DELETE" -eq 1 ]; then
    rm "$f"
    echo "       removed original $f"
  fi
done

if [ "$total_saved" -gt 0 ]; then
  saved_h=$(echo "$total_saved" | awk '{
    if ($1 >= 1024*1024) printf "%.1fM", $1/1024/1024
    else if ($1 >= 1024) printf "%.0fK", $1/1024
    else printf "%dB", $1
  }')
  echo ""
  echo "total saved: $saved_h"
fi
