FROM node:22.23.4-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d

COPY scripts/docker/ensure-ca-certificates.sh /usr/local/bin/openclaw-ensure-ca-certificates
RUN chmod +x /usr/local/bin/openclaw-ensure-ca-certificates \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
  && openclaw-ensure-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY scripts/docker/install-sh-e2e/run.sh /usr/local/bin/openclaw-install-e2e
RUN chmod +x /usr/local/bin/openclaw-install-e2e

ENTRYPOINT ["/usr/local/bin/openclaw-install-e2e"]
