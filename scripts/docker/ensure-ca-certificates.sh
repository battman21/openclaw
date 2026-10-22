#!/bin/sh
# Fail the image build unless the distro trust store includes the eMudhra
# intermediate distrust (CVE-2026-111943). Minimums are the vendor security
# updates, checked per codename. Newer packages still pass.
set -eu

if [ -f /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
fi

codename="${VERSION_CODENAME:-}"
case "$codename" in
  bookworm) min_ca='20250419~deb12u2' ;;
  trixie) min_ca='20250419+deb13u1' ;;
  jammy) min_ca='20260816ubuntu0.22.04.1' ;;
  noble) min_ca='20260816ubuntu0.24.04.1' ;;
  *)
    echo "ensure-ca-certificates: unsupported VERSION_CODENAME '${codename}'" >&2
    exit 1
    ;;
esac

if ! command -v dpkg >/dev/null 2>&1; then
  echo "ensure-ca-certificates: dpkg is required" >&2
  exit 1
fi

ver="$(dpkg-query -W -f='${Version}' ca-certificates)"
if ! dpkg --compare-versions "$ver" ge "$min_ca"; then
  echo "ca-certificates ${ver} is older than ${min_ca} (${codename}, CVE-2026-111943)" >&2
  exit 1
fi
