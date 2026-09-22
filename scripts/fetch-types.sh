#!/usr/bin/env bash
# Fetches the Claude Code plugin type declarations into vendor/.
#
# The declarations are Anthropic's copyrighted material, so they are never
# committed; vendor/ is ignored. Run this once after cloning.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="$root/vendor/claude-code.d.ts"

mkdir -p "$root/vendor"
gh api repos/anthropics/claude-code/contents/mods/types/claude-code.d.ts \
  --jq '.content' | base64 -d > "$out"

printf 'wrote %s (%s lines)\n' "$out" "$(wc -l < "$out")"
