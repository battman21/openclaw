FROM node:22-bookworm-slim

COPY scripts/docker/ensure-ca-certificates.sh /usr/local/bin/openclaw-ensure-ca-certificates
COPY scripts/docker/ensure-node-floor.sh /usr/local/bin/openclaw-ensure-node-floor
RUN chmod +x /usr/local/bin/openclaw-ensure-ca-certificates /usr/local/bin/openclaw-ensure-node-floor \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
  && openclaw-ensure-ca-certificates \
  && openclaw-ensure-node-floor \
  && rm -rf /var/lib/apt/lists/*

COPY scripts/docker/install-sh-e2e/run.sh /usr/local/bin/openclaw-install-e2e
RUN chmod +x /usr/local/bin/openclaw-install-e2e

ENTRYPOINT ["/usr/local/bin/openclaw-install-e2e"]
