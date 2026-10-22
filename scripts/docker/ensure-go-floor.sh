#!/bin/sh
# Fail unless the Go toolchain includes the eMudhra trust-store update
# (CVE-2026-111943). Fixed lines are Go 1.26.10+ and 1.27.3+. Go 1.27.0
# through 1.27.2 are newer than 1.26.10 and still unfixed.
set -eu

line="$(go version)"
ver=$(printf '%s\n' "$line" | sed -n 's/.* go\([0-9][0-9.]*\).*/\1/p')
if [ -z "$ver" ]; then
  echo "ensure-go-floor: could not parse Go version from: ${line}" >&2
  exit 1
fi

major=$(printf '%s' "$ver" | cut -d. -f1)
minor=$(printf '%s' "$ver" | cut -d. -f2)
patch=$(printf '%s' "$ver" | cut -d. -f3 | cut -d- -f1)
minor="${minor:-0}"
patch="${patch:-0}"

ok=0
if [ "$major" -gt 1 ]; then
  ok=1
fi
if [ "$major" -eq 1 ] && [ "$minor" -eq 26 ] && [ "$patch" -ge 10 ]; then
  ok=1
fi
if [ "$major" -eq 1 ] && [ "$minor" -eq 27 ] && [ "$patch" -ge 3 ]; then
  ok=1
fi
if [ "$major" -eq 1 ] && [ "$minor" -ge 28 ]; then
  ok=1
fi

if [ "$ok" -ne 1 ]; then
  echo "Go ${ver} is below the security floor (1.26.10+ or 1.27.3+)" >&2
  exit 1
fi
