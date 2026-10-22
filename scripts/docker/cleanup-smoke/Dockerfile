FROM node:22-trixie-slim

COPY scripts/docker/ensure-ca-certificates.sh /usr/local/bin/openclaw-ensure-ca-certificates
COPY scripts/docker/ensure-node-floor.sh /usr/local/bin/openclaw-ensure-node-floor
COPY scripts/docker/ensure-npm-floor.sh /usr/local/bin/openclaw-ensure-npm-floor
COPY scripts/docker/remove-unpatched-go-prebuilts.sh /usr/local/bin/openclaw-remove-unpatched-go-prebuilts
RUN chmod +x /usr/local/bin/openclaw-ensure-ca-certificates /usr/local/bin/openclaw-ensure-node-floor \
    /usr/local/bin/openclaw-ensure-npm-floor /usr/local/bin/openclaw-remove-unpatched-go-prebuilts \
  && apt-get update \
  && apt-get -y upgrade \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    git \
  && openclaw-ensure-ca-certificates \
  && openclaw-ensure-node-floor \
  && openclaw-ensure-npm-floor \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches ./patches
RUN corepack enable \
  && pnpm install --frozen-lockfile \
  && openclaw-remove-unpatched-go-prebuilts /repo/node_modules \
  && pnpm store prune

COPY . .
COPY scripts/docker/cleanup-smoke/run.sh /usr/local/bin/openclaw-cleanup-smoke
RUN chmod +x /usr/local/bin/openclaw-cleanup-smoke

ENTRYPOINT ["/usr/local/bin/openclaw-cleanup-smoke"]
