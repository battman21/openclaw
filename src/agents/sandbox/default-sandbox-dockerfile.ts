/**
 * Fallback sandbox image used when `openclaw-sandbox:trixie-slim` is missing.
 * The base tag floats on Debian 13. The build upgrades packages, then fails
 * if ca-certificates, OpenSSL, pip, or certifi are below the advisory floors.
 *
 * Keep PIP_CERTIFI_REQUIREMENTS identical to scripts/docker/requirements-pip-certifi.txt.
 */

export const DEBIAN_TRIXIE_SLIM_IMAGE = "debian:trixie-slim";

/** Trixie security update that distrusts the compromised eMudhra intermediates. */
export const TRIXIE_CA_CERTIFICATES_MIN = "20250419+deb13u1";

/** Trixie OpenSSL that includes the CVE-2026-84782 fix. */
export const TRIXIE_OPENSSL_MIN = "3.5.7-1~deb13u3";

export const PIP_CERTIFI_REQUIREMENTS = `pip>=26.2.2
certifi>=2026.10.19
`;

export function renderDefaultSandboxDockerfile(): string {
  return `FROM ${DEBIAN_TRIXIE_SLIM_IMAGE}
ENV DEBIAN_FRONTEND=noninteractive
COPY requirements-pip-certifi.txt /tmp/requirements-pip-certifi.txt
RUN apt-get update \\
  && apt-get -y upgrade \\
  && apt-get install -y --no-install-recommends \\
    bash \\
    ca-certificates \\
    curl \\
    git \\
    jq \\
    openssl \\
    python3 \\
    python3-pip \\
    ripgrep \\
  && ca="$(dpkg-query -W -f='\${Version}' ca-certificates)" \\
  && ssl="$(dpkg-query -W -f='\${Version}' openssl)" \\
  && dpkg --compare-versions "$ca" ge "${TRIXIE_CA_CERTIFICATES_MIN}" \\
  && dpkg --compare-versions "$ssl" ge "${TRIXIE_OPENSSL_MIN}" \\
  && python3 -m pip install --break-system-packages --ignore-installed --upgrade -r /tmp/requirements-pip-certifi.txt \\
  && python3 -c 'import certifi, pip; \
cv=tuple(int(p) for p in certifi.__version__.split(".")[:3]); \
pv=tuple(int(p) for p in pip.__version__.split(".")[:3]); \
assert cv>=(2026,10,19), certifi.__version__; \
assert pv>=(26,2,2), pip.__version__' \\
  && rm -rf /var/lib/apt/lists/* /tmp/requirements-pip-certifi.txt
RUN useradd --create-home --shell /bin/bash sandbox
USER sandbox
WORKDIR /home/sandbox
CMD ["sleep", "infinity"]
`;
}
