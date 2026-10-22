import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PIP_CERTIFI_REQUIREMENTS } from "./agents/sandbox/default-sandbox-dockerfile.js";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const dockerfilePath = join(repoRoot, "Dockerfile");

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

  it("tracks Node 22 and enforces trust-store floors without digest pins", async () => {
    const dockerfile = await readFile(dockerfilePath, "utf8");
    const sandbox = await readFile(join(repoRoot, "Dockerfile.sandbox"), "utf8");
    const requirements = await readFile(
      join(repoRoot, "scripts/docker/requirements-pip-certifi.txt"),
      "utf8",
    );
    const caScript = await readFile(
      join(repoRoot, "scripts/docker/ensure-ca-certificates.sh"),
      "utf8",
    );
    const nodeScript = await readFile(
      join(repoRoot, "scripts/docker/ensure-node-floor.sh"),
      "utf8",
    );
    const slimFiles = [
      "scripts/docker/cleanup-smoke/Dockerfile",
      "scripts/docker/install-sh-e2e/Dockerfile",
      "scripts/docker/install-sh-smoke/Dockerfile",
      "Dockerfile.sandbox-common",
    ];

    expect(dockerfile.startsWith("FROM node:22-trixie\n")).toBe(true);
    expect(dockerfile).not.toContain("sha256:");
    expect(dockerfile).not.toContain("node:22.23.4");
    expect(dockerfile).toContain("openclaw-ensure-ca-certificates");
    expect(dockerfile).toContain("openclaw-ensure-node-floor");
    expect(sandbox.startsWith("FROM debian:trixie-slim\n")).toBe(true);
    expect(sandbox).not.toContain("sha256:");
    expect(sandbox).toContain("requirements-pip-certifi.txt");
    expect(sandbox).toContain("openclaw-ensure-pip-certifi");
    expect(sandbox).not.toContain("pip==");
    expect(sandbox).not.toContain("--require-hashes");
    expect(caScript).toContain("20250419+deb13u1");
    expect(caScript).toContain("3.5.7-1~deb13u3");
    expect(caScript).toContain("3.0.13-0ubuntu3.16");
    expect(caScript).toContain("8.5.0-2ubuntu10.16");
    expect(caScript).toContain("Debian bookworm OpenSSL");
    expect(dockerfile).toContain("apt-get -y upgrade");
    expect(sandbox).toContain("apt-get -y upgrade");
    expect(nodeScript).toContain("22.23.4");
    expect(nodeScript).toContain("24.22.1");
    expect(nodeScript).toContain("26.12.1");
    expect(requirements).toContain("pip>=26.2.2");
    expect(requirements).toContain("certifi>=2026.10.19");
    expect(requirements).not.toContain("==");
    for (const relativePath of slimFiles) {
      const contents = await readFile(join(repoRoot, relativePath), "utf8");
      expect(contents).not.toContain("sha256:");
      expect(contents).toContain("node:22-");
    }
    expect(requirements).toBe(PIP_CERTIFI_REQUIREMENTS);

    const sandboxBrowser = await readFile(join(repoRoot, "Dockerfile.sandbox-browser"), "utf8");
    expect(sandboxBrowser).toContain("node:22-trixie-slim");
    expect(sandboxBrowser).toContain("openclaw-ensure-node-floor");
    expect(sandboxBrowser).toContain("ln -sf /usr/local/bin/node /usr/bin/node");
    expect(sandboxBrowser).not.toContain("sha256:");

    const sandboxCommon = await readFile(join(repoRoot, "Dockerfile.sandbox-common"), "utf8");
    expect(sandboxCommon).toContain(
      "ln -sf ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm",
    );
    expect(sandboxCommon).not.toContain("COPY --from=node_runtime /usr/local/bin/npm");

    const cleanupSmoke = await readFile(
      join(repoRoot, "scripts/docker/cleanup-smoke/Dockerfile"),
      "utf8",
    );
    const cleanupInstall = cleanupSmoke.indexOf("pnpm install --frozen-lockfile");
    const cleanupPatches = cleanupSmoke.indexOf("COPY patches ./patches");
    expect(cleanupPatches).toBeGreaterThan(-1);
    expect(cleanupInstall).toBeGreaterThan(cleanupPatches);
  });
});
