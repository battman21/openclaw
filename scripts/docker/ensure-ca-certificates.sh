#!/bin/sh
# Fail the image build unless the distro trust store and OpenSSL meet the
# advisory floors. Minimums are vendor security updates, checked per codename.
# Newer packages still pass. Debian bookworm OpenSSL is unfixed (CVE-2026-84782).
set -eu

os_release="${OPENCLAW_OS_RELEASE:-/etc/os-release}"
if [ -f "$os_release" ]; then
  # shellcheck disable=SC1090
  . "$os_release"
fi

codename="${VERSION_CODENAME:-}"

if ! command -v dpkg >/dev/null 2>&1; then
  echo "ensure-ca-certificates: dpkg is required" >&2
  exit 1
fi

require_ge() {
  pkg="$1"
  min="$2"
  reason="$3"
  ver=$(dpkg-query -W -f='${Version}' "$pkg") || {
    echo "ensure-ca-certificates: ${pkg} is not installed" >&2
    exit 1
  }
  if ! dpkg --compare-versions "$ver" ge "$min"; then
    echo "${pkg} ${ver} is older than ${min} (${codename}, ${reason})" >&2
    exit 1
  fi
}

case "$codename" in
  bookworm)
    echo "ensure-ca-certificates: Debian bookworm OpenSSL is still vulnerable to CVE-2026-84782. Use trixie." >&2
    exit 1
    ;;
  trixie)
    require_ge ca-certificates '20250419+deb13u1' 'CVE-2026-111943'
    require_ge openssl '3.5.7-1~deb13u3' 'CVE-2026-84782'
    ;;
  jammy)
    require_ge ca-certificates '20260816ubuntu0.22.04.1' 'CVE-2026-111943'
    ;;
  noble)
    require_ge ca-certificates '20260816ubuntu0.24.04.1' 'CVE-2026-111943'
    require_ge openssl '3.0.13-0ubuntu3.16' 'CVE-2026-84782'
    require_ge curl '8.5.0-2ubuntu10.16' 'USN-8932-1'
    ;;
  *)
    echo "ensure-ca-certificates: unsupported VERSION_CODENAME '${codename}'" >&2
    exit 1
    ;;
esac
