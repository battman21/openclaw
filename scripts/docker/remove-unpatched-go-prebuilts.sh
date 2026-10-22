#!/bin/sh
# oxlint-tsgolint and @typescript/native-preview publish prebuilt Go binaries.
# As of 22 Oct 2026 the newest releases were built with Go 1.26.0, before the
# trust-store floor (1.26.10 / 1.27.3, CVE-2026-111943). Runtime images do not
# typecheck or lint, so drop those packages instead of shipping the binaries.
set -eu

root="${1:-node_modules}"
if [ ! -d "$root" ]; then
  exit 0
fi

rm -rf "$root/oxlint-tsgolint" "$root/@typescript/native-preview"

if [ ! -d "$root/.pnpm" ]; then
  exit 0
fi

find "$root/.pnpm" -mindepth 1 -maxdepth 1 -type d \
  \( -name 'oxlint-tsgolint@*' \
    -o -name '@oxlint-tsgolint+*' \
    -o -name '@typescript+native-preview@*' \
    -o -name '@typescript+native-preview-*' \) |
  while IFS= read -r dir; do
    rm -rf "$dir"
  done
