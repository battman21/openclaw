import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const nodeScript = join(repoRoot, "scripts/docker/ensure-node-floor.sh");
const goScript = join(repoRoot, "scripts/docker/ensure-go-floor.sh");
const pipScript = join(repoRoot, "scripts/docker/ensure-pip-certifi.sh");
const caScript = join(repoRoot, "scripts/docker/ensure-ca-certificates.sh");

function binDir(): string {
  return mkdtempSync(join(tmpdir(), "openclaw-floor-"));
}

function writeExe(dir: string, name: string, body: string): void {
  const path = join(dir, name);
  writeFileSync(path, body);
  chmodSync(path, 0o755);
}

function run(
  script: string,
  pathDir: string,
  extraEnv: Record<string, string> = {},
): {
  status: number;
  output: string;
} {
  try {
    const output = execFileSync("/bin/sh", [script], {
      env: { ...process.env, PATH: `${pathDir}:${process.env.PATH ?? ""}`, ...extraEnv },
      encoding: "utf8",
    });
    return { status: 0, output };
  } catch (error) {
    const failed = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: failed.status ?? 1,
      output: `${failed.stdout ?? ""}${failed.stderr ?? ""}`,
    };
  }
}

describe("trust store floor scripts", () => {
  it("accepts patched Node lines and rejects unfixed ones", () => {
    const dir = binDir();
    writeExe(
      dir,
      "node",
      `#!/bin/sh
echo "$FAKE_NODE_VERSION"
`,
    );
    for (const version of ["22.23.4", "22.24.0", "24.22.1", "26.12.1", "27.0.0"]) {
      const result = run(nodeScript, dir, { FAKE_NODE_VERSION: version });
      expect(result.status, version).toBe(0);
    }
    for (const version of ["22.23.3", "24.22.0", "26.12.0", "20.20.0", "18.20.8", "23.11.0"]) {
      const result = run(nodeScript, dir, { FAKE_NODE_VERSION: version });
      expect(result.status, version).not.toBe(0);
    }
  });

  it("accepts patched Go lines and rejects 1.27.0 through 1.27.2", () => {
    const dir = binDir();
    writeExe(
      dir,
      "go",
      `#!/bin/sh
echo "go version go$FAKE_GO_VERSION linux/amd64"
`,
    );
    for (const version of ["1.26.10", "1.26.11", "1.27.3", "1.28.0"]) {
      expect(run(goScript, dir, { FAKE_GO_VERSION: version }).status, version).toBe(0);
    }
    for (const version of ["1.26.9", "1.27.0", "1.27.2", "1.25.5"]) {
      expect(run(goScript, dir, { FAKE_GO_VERSION: version }).status, version).not.toBe(0);
    }
  });

  it("accepts pip and certifi at or above the trust-store floor", () => {
    const dir = binDir();
    writeExe(
      dir,
      "python3",
      `#!/bin/sh
case "$2" in
  *pip.__version__*) echo "$FAKE_PIP_VERSION" ;;
  *certifi.__version__*) echo "$FAKE_CERTIFI_VERSION" ;;
esac
`,
    );
    expect(
      run(pipScript, dir, { FAKE_PIP_VERSION: "26.2.2", FAKE_CERTIFI_VERSION: "2026.10.19" })
        .status,
    ).toBe(0);
    expect(
      run(pipScript, dir, { FAKE_PIP_VERSION: "26.3.0", FAKE_CERTIFI_VERSION: "2026.11.1" }).status,
    ).toBe(0);
    expect(
      run(pipScript, dir, { FAKE_PIP_VERSION: "26.2.1", FAKE_CERTIFI_VERSION: "2026.10.19" })
        .status,
    ).not.toBe(0);
    expect(
      run(pipScript, dir, { FAKE_PIP_VERSION: "26.2.2", FAKE_CERTIFI_VERSION: "2026.10.18" })
        .status,
    ).not.toBe(0);
  });

  it("checks ca-certificates and OpenSSL against the image codename", () => {
    const dir = binDir();
    const osRelease = join(dir, "os-release");
    writeFileSync(osRelease, "VERSION_CODENAME=trixie\n");
    writeExe(
      dir,
      "dpkg-query",
      `#!/bin/sh
pkg=""
for arg in "$@"; do pkg="$arg"; done
case "$pkg" in
  ca-certificates) echo "$FAKE_CA_VERSION" ;;
  openssl) echo "$FAKE_OPENSSL_VERSION" ;;
  curl) echo "$FAKE_CURL_VERSION" ;;
  *) echo "missing $pkg" >&2; exit 1 ;;
esac
`,
    );
    writeExe(
      dir,
      "dpkg",
      `#!/bin/sh
# dpkg --compare-versions "$ver" ge "$min"
actual="$2"
op="$3"
floor="$4"
python3 - "$actual" "$op" "$floor" <<'PY'
import sys
actual, op, floor = sys.argv[1:]
def key(value: str):
    return value.replace("~", " ").replace("+", " ")
if op != "ge":
    sys.exit(2)
sys.exit(0 if key(actual) >= key(floor) else 1)
PY
`,
    );
    const trixieOk = {
      OPENCLAW_OS_RELEASE: osRelease,
      FAKE_CA_VERSION: "20250419+deb13u1",
      FAKE_OPENSSL_VERSION: "3.5.7-1~deb13u3",
    };
    expect(run(caScript, dir, trixieOk).status).toBe(0);
    expect(
      run(caScript, dir, { ...trixieOk, FAKE_OPENSSL_VERSION: "3.5.7-1~deb13u2" }).status,
    ).not.toBe(0);
    writeFileSync(osRelease, "VERSION_CODENAME=bookworm\n");
    expect(run(caScript, dir, trixieOk).status).not.toBe(0);
    writeFileSync(osRelease, "VERSION_CODENAME=sid\n");
    expect(run(caScript, dir, trixieOk).status).not.toBe(0);
  });
});
