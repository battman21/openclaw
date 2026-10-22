#!/bin/sh
# Fail the image or CI job unless Node is on a release that includes the
# Brotli decoder fix (CVE-2026-111497) and the updated trust store
# (CVE-2026-111943). Floors, not exact pins: 22.23.4+, 24.22.1+, 26.12.1+.
# Node 18 and Node 20 never receive the Brotli fix.
set -eu

ver="$(node -p process.versions.node)"
major=$(printf '%s' "$ver" | cut -d. -f1)
minor=$(printf '%s' "$ver" | cut -d. -f2)
patch=$(printf '%s' "$ver" | cut -d. -f3 | cut -d- -f1)
minor="${minor:-0}"
patch="${patch:-0}"

ok=0
if [ "$major" -eq 22 ] && { [ "$minor" -gt 23 ] || { [ "$minor" -eq 23 ] && [ "$patch" -ge 4 ]; }; }; then
  ok=1
fi
if [ "$major" -eq 24 ] && { [ "$minor" -gt 22 ] || { [ "$minor" -eq 22 ] && [ "$patch" -ge 1 ]; }; }; then
  ok=1
fi
if [ "$major" -eq 26 ] && { [ "$minor" -gt 12 ] || { [ "$minor" -eq 12 ] && [ "$patch" -ge 1 ]; }; }; then
  ok=1
fi
if [ "$major" -gt 26 ]; then
  ok=1
fi

if [ "$ok" -ne 1 ]; then
  echo "Node ${ver} is below the security floor (22.23.4, 24.22.1, or 26.12.1)" >&2
  exit 1
fi
