#!/usr/bin/env bash
# Assemble the static site into ./deploy — only what the game needs at runtime.
# Used by Netlify (see netlify.toml). The game lives in game/; it has no build step of its own.
set -euo pipefail
cd "$(dirname "$0")"

rm -rf deploy
mkdir -p deploy
cp game/index.html deploy/
cp -r game/css game/js deploy/

echo "Built deploy/: $(find deploy -type f | wc -l) files"
