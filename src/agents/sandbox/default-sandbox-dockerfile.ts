/**
 * Fallback sandbox image used when `openclaw-sandbox:bookworm-slim` is missing.
 * The base tag is digest-pinned. ca-certificates, pip, and certifi are upgraded
 * from the vendor packages at build time (CVE-2026-111943).
 *
 * Keep PIP_CERTIFI_REQUIREMENTS identical to scripts/docker/requirements-pip-certifi.txt.
 */

export const DEBIAN_BOOKWORM_SLIM_IMAGE =
  "debian:bookworm-slim@sha256:7ff6ba31527b9e336162fa061746c366c4b2032f4d2cff2078bea43f78efe3f8";

/** Bookworm security update that distrusts the compromised eMudhra intermediates. */
export const BOOKWORM_CA_CERTIFICATES_MIN = "20250419~deb12u2";

export const PIP_CERTIFI_REQUIREMENTS = `\
pip==26.2.2 \\
    --hash=sha256:3a8e5c800492787f33a4114ef54444546c340df428974ebba17e0fd47e11af2f \\
    --hash=sha256:fd7f4dfa8190e014013b9f08f3e973f4e4c26ffd179a204895533a7254813a70

certifi==2026.10.19 \\
    --hash=sha256:035c1e85572b141bf1c3a3eff0e33a8eb74917522f2559075ff8d2fea780a1ae \\
    --hash=sha256:42d35340cc5b9ba78e818ddbff0c5b1c2b779de448a340fd1b989f5fa8670e1b
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
  && python3 -m pip install --break-system-packages --require-hashes --no-deps -r /tmp/requirements-pip-certifi.txt \\
  && python3 -c 'import certifi, pip; cv=tuple(int(p) for p in certifi.__version__.split(".")); pv=tuple(int(p) for p in pip.__version__.split(".")[:3]); assert cv>=(2026,10,19), certifi.__version__; assert pv>=(26,2,2), pip.__version__' \\
  && rm -rf /var/lib/apt/lists/* /tmp/requirements-pip-certifi.txt
RUN useradd --create-home --shell /bin/bash sandbox
USER sandbox
WORKDIR /home/sandbox
CMD ["sleep", "infinity"]
`;
}
