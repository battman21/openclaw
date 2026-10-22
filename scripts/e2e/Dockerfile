FROM node:22-trixie

COPY scripts/docker/ensure-ca-certificates.sh /usr/local/bin/openclaw-ensure-ca-certificates
COPY scripts/docker/ensure-node-floor.sh /usr/local/bin/openclaw-ensure-node-floor
COPY scripts/docker/ensure-npm-floor.sh /usr/local/bin/openclaw-ensure-npm-floor
COPY scripts/docker/remove-unpatched-go-prebuilts.sh /usr/local/bin/openclaw-remove-unpatched-go-prebuilts
RUN chmod +x /usr/local/bin/openclaw-ensure-ca-certificates /usr/local/bin/openclaw-ensure-node-floor \
    /usr/local/bin/openclaw-ensure-npm-floor /usr/local/bin/openclaw-remove-unpatched-go-prebuilts \
  && apt-get update \
  && apt-get -y upgrade \
  && apt-get install -y --no-install-recommends ca-certificates \
  && openclaw-ensure-ca-certificates \
  && openclaw-ensure-node-floor \
  && openclaw-ensure-npm-floor \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

ENV NODE_OPTIONS="--disable-warning=ExperimentalWarning"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.plugin-sdk.dts.json tsdown.config.ts vitest.config.ts vitest.e2e.config.ts openclaw.mjs ./
COPY src ./src
COPY test ./test
COPY scripts ./scripts
COPY docs ./docs
COPY skills ./skills
COPY patches ./patches
COPY ui ./ui
COPY extensions/memory-core ./extensions/memory-core
COPY vendor/a2ui/renderers/lit ./vendor/a2ui/renderers/lit
COPY apps/shared/OpenClawKit/Tools/CanvasA2UI ./apps/shared/OpenClawKit/Tools/CanvasA2UI

RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm ui:build
RUN openclaw-remove-unpatched-go-prebuilts /app/node_modules && pnpm store prune

CMD ["bash"]
