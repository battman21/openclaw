/**
 * Fallback sandbox image used when `openclaw-sandbox:bookworm-slim` is missing.
 * The base tag floats. The build installs the latest ca-certificates, pip, and
 * certifi, then fails if they are below the CVE-2026-111943 floors.
 *
 * Keep PIP_CERTIFI_REQUIREMENTS identical to scripts/docker/requirements-pip-certifi.txt.
 */

export const DEBIAN_BOOKWORM_SLIM_IMAGE = "debian:bookworm-slim";

/** Bookworm security update that distrusts the compromised eMudhra intermediates. */
export const BOOKWORM_CA_CERTIFICATES_MIN = "20250419~deb12u2";

export const PIP_CERTIFI_REQUIREMENTS = `pip>=26.2.2
certifi>=2026.10.19
`;

export function renderDefaultSandboxDockerfile(): string {
  return `FROM ${DEBIAN_BOOKWORM_SLIM_IMAGE}
ENV DEBIAN_FRONTEND=noninteractive
COPY requirements-pip-certifi.txt /tmp/requirements-pip-certifi.txt
RUN apt-get update \\
  && apt-get install -y --no-install-recommends \\
    bash \\
    ca-certificates \\
    curl \\
    git \\
    jq \\
    python3 \\
    python3-pip \\
    ripgrep \\
  && ver="$(dpkg-query -W -f='\${Version}' ca-certificates)" \\
  && dpkg --compare-versions "$ver" ge "${BOOKWORM_CA_CERTIFICATES_MIN}" \\
  && python3 -m pip install --break-system-packages --upgrade -r /tmp/requirements-pip-certifi.txt \\
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
