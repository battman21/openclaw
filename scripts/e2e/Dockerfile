FROM node:22.23.4-bookworm@sha256:63538dfe497cc29dfafdda25ada09b46db68a3f4cc205abf1f5d6bf0913f3384

COPY scripts/docker/ensure-ca-certificates.sh /usr/local/bin/openclaw-ensure-ca-certificates
RUN chmod +x /usr/local/bin/openclaw-ensure-ca-certificates \
  && apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && openclaw-ensure-ca-certificates \
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

CMD ["bash"]
