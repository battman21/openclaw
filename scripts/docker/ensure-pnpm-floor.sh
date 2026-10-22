#!/bin/sh
# pnpm HIGH advisories (secret exfil, path traversal) are fixed in
# 10.34.5, 11.11.0, and every stable 12.x release.
set -eu

if ! command -v pnpm >/dev/null 2>&1; then
  echo "ensure-pnpm-floor: pnpm is required" >&2
  exit 1
fi

ver=$(pnpm -v)
node -e '
const raw = process.argv[1];
const alpha = raw.match(/^12\.0\.0-alpha\.(\d+)/);
if (alpha && Number(alpha[1]) < 5) {
  console.error(`pnpm ${raw} is below the 12.0.0-alpha.5 floor`);
  process.exit(1);
}
const [major, minor, patch] = raw.split("-")[0].split(".").map((part) => Number(part));
const ok =
  (major === 10 && (minor > 34 || (minor === 34 && patch >= 5))) ||
  (major === 11 && (minor > 11 || (minor === 11 && patch >= 0))) ||
  major >= 12;
if (!ok) {
  console.error(`pnpm ${raw} is below the floor (10.34.5 / 11.11.0 / 12)`);
  process.exit(1);
}
' "$ver"
