FROM node:22.23.4-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d

COPY scripts/docker/ensure-ca-certificates.sh /usr/local/bin/openclaw-ensure-ca-certificates
RUN set -eux; \
  chmod +x /usr/local/bin/openclaw-ensure-ca-certificates; \
  for attempt in 1 2 3; do \
    if apt-get update -o Acquire::Retries=3; then break; fi; \
    echo "apt-get update failed (attempt ${attempt})" >&2; \
    if [ "${attempt}" -eq 3 ]; then exit 1; fi; \
    sleep 3; \
  done; \
  apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
    sudo \
  && openclaw-ensure-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY scripts/docker/install-sh-smoke/run.sh /usr/local/bin/openclaw-install-smoke
RUN chmod +x /usr/local/bin/openclaw-install-smoke

ENTRYPOINT ["/usr/local/bin/openclaw-install-smoke"]
