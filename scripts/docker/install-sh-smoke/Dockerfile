FROM node:22-trixie-slim

COPY scripts/docker/ensure-ca-certificates.sh /usr/local/bin/openclaw-ensure-ca-certificates
COPY scripts/docker/ensure-node-floor.sh /usr/local/bin/openclaw-ensure-node-floor
COPY scripts/docker/ensure-npm-floor.sh /usr/local/bin/openclaw-ensure-npm-floor
RUN set -eux; \
  chmod +x /usr/local/bin/openclaw-ensure-ca-certificates /usr/local/bin/openclaw-ensure-node-floor \
    /usr/local/bin/openclaw-ensure-npm-floor; \
  for attempt in 1 2 3; do \
    if apt-get update -o Acquire::Retries=3; then break; fi; \
    echo "apt-get update failed (attempt ${attempt})" >&2; \
    if [ "${attempt}" -eq 3 ]; then exit 1; fi; \
    sleep 3; \
  done; \
  apt-get -y upgrade; \
  apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
    sudo \
  && openclaw-ensure-ca-certificates \
  && openclaw-ensure-node-floor \
  && openclaw-ensure-npm-floor \
  && rm -rf /var/lib/apt/lists/*

COPY scripts/docker/install-sh-smoke/run.sh /usr/local/bin/openclaw-install-smoke
RUN chmod +x /usr/local/bin/openclaw-install-smoke

ENTRYPOINT ["/usr/local/bin/openclaw-install-smoke"]
