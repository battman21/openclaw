#!/bin/sh
# Fail unless pip and certifi meet the eMudhra trust-store floors
# (CVE-2026-111943). pip 26.2.2+ and certifi 2026.10.19+ bundle the updated
# CA list. Newer releases still pass. This does not pin an exact version.
set -eu

pip_ver="$(python3 -c 'import pip; print(pip.__version__)')"
cert_ver="$(python3 -c 'import certifi; print(certifi.__version__)')"

version_ge() {
  awk -v actual="$1" -v floor="$2" 'BEGIN {
    split(actual, a, ".")
    split(floor, b, ".")
    for (i = 1; i <= 3; i++) {
      av = a[i] + 0
      bv = b[i] + 0
      if (av > bv) exit 0
      if (av < bv) exit 1
    }
    exit 0
  }'
}

if ! version_ge "$pip_ver" "26.2.2"; then
  echo "pip ${pip_ver} is older than 26.2.2" >&2
  exit 1
fi
if ! version_ge "$cert_ver" "2026.10.19"; then
  echo "certifi ${cert_ver} is older than 2026.10.19" >&2
  exit 1
fi
