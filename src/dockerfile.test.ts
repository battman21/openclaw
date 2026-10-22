import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PIP_CERTIFI_REQUIREMENTS } from "./agents/sandbox/default-sandbox-dockerfile.js";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const dockerfilePath = join(repoRoot, "Dockerfile");
const NODE_BOOKWORM =
  "node:22.23.4-bookworm@sha256:63538dfe497cc29dfafdda25ada09b46db68a3f4cc205abf1f5d6bf0913f3384";
const NODE_BOOKWORM_SLIM =
  "node:22.23.4-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d";

describe("Dockerfile", () => {
  it("installs optional browser dependencies after pnpm install", async () => {
    const dockerfile = await readFile(dockerfilePath, "utf8");
    const installIndex = dockerfile.indexOf("RUN pnpm install --frozen-lockfile");
    const browserArgIndex = dockerfile.indexOf("ARG OPENCLAW_INSTALL_BROWSER");

    expect(installIndex).toBeGreaterThan(-1);
    expect(browserArgIndex).toBeGreaterThan(-1);
    expect(browserArgIndex).toBeGreaterThan(installIndex);
    expect(dockerfile).toContain(
      "node /app/node_modules/playwright-core/cli.js install --with-deps chromium",
    );
    expect(dockerfile).toContain("apt-get install -y --no-install-recommends xvfb");
  });

  it("pins patched Node, Debian trust store, pip, and certifi", async () => {
    const dockerfile = await readFile(dockerfilePath, "utf8");
    const sandbox = await readFile(join(repoRoot, "Dockerfile.sandbox"), "utf8");
    const requirements = await readFile(
      join(repoRoot, "scripts/docker/requirements-pip-certifi.txt"),
      "utf8",
    );
    const slimFiles = [
      "scripts/docker/cleanup-smoke/Dockerfile",
      "scripts/docker/install-sh-e2e/Dockerfile",
      "scripts/docker/install-sh-smoke/Dockerfile",
      "Dockerfile.sandbox-common",
    ];

    const caScript = await readFile(
      join(repoRoot, "scripts/docker/ensure-ca-certificates.sh"),
      "utf8",
    );
    expect(dockerfile).toContain(NODE_BOOKWORM);
    expect(dockerfile).toContain("openclaw-ensure-ca-certificates");
    expect(sandbox).toContain("openclaw-ensure-ca-certificates");
    expect(sandbox).toContain("requirements-pip-certifi.txt");
    expect(sandbox).toContain("--require-hashes");
    expect(caScript).toContain("20250419~deb12u2");
    expect(caScript).toContain("20250419+deb13u1");
    expect(caScript).toContain("20260816ubuntu0.24.04.1");
    expect(requirements).toContain("pip==26.2.2");
    expect(requirements).toContain("certifi==2026.10.19");
    for (const relativePath of slimFiles) {
      const contents = await readFile(join(repoRoot, relativePath), "utf8");
      expect(contents).toContain(NODE_BOOKWORM_SLIM);
    }
    for (const line of PIP_CERTIFI_REQUIREMENTS.split("\n")) {
      const trimmed = line.trim().replace(/ \\$/, "");
      if (
        trimmed.startsWith("--hash=") ||
        trimmed.startsWith("pip==") ||
        trimmed.startsWith("certifi==")
      ) {
        expect(requirements).toContain(trimmed);
      }
    }
  });
});
