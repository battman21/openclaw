#!/bin/sh
# Node 22 images still vendor npm 10, whose tree is below the advisory floors
# (brace-expansion 2.0.2, picomatch 4.0.3, ip-address 10.1.0, pacote 19/20,
# sigstore 3.1.0). npm 12.2.1 vendors the patched releases. Install at least
# that line, then fail the build if the global tree regresses.
set -eu

if ! command -v npm >/dev/null 2>&1; then
  echo "ensure-npm-floor: npm is not on PATH" >&2
  exit 1
fi

if [ "${OPENCLAW_NPM_FLOOR_CHECK_ONLY:-}" != "1" ]; then
  npm install -g --no-fund --no-audit "npm@>=12.2.1"
fi

export OPENCLAW_NPM_VERSION="$(npm -v)"
export OPENCLAW_NPM_ROOT="$(npm root -g)"

node <<'EOF'
const fs = require("node:fs");
const path = require("node:path");

const version = process.env.OPENCLAW_NPM_VERSION ?? "";
const root = process.env.OPENCLAW_NPM_ROOT ?? "";

function parts(value) {
  return String(value)
    .split(".")
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10) || 0);
}

function atLeast(actual, floor) {
  const left = parts(actual);
  const right = parts(floor);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] > right[i]) return true;
    if (left[i] < right[i]) return false;
  }
  return true;
}

function meetsFloor(name, actual) {
  const major = parts(actual)[0];
  if (name === "brace-expansion") {
    if (major === 1) return atLeast(actual, "1.1.21");
    if (major === 2) return atLeast(actual, "2.1.7");
    if (major === 3) return atLeast(actual, "3.0.9");
    return major >= 5 && atLeast(actual, "5.0.12");
  }
  if (name === "picomatch") {
    if (major === 2) return atLeast(actual, "2.3.2");
    if (major === 3) return atLeast(actual, "3.0.2");
    return major >= 4 && atLeast(actual, "4.0.4");
  }
  if (name === "ip-address") return atLeast(actual, "10.3.1");
  if (name === "pacote") return atLeast(actual, "21.5.1");
  if (name === "sigstore") return atLeast(actual, "4.1.1");
  return true;
}

if (!atLeast(version, "12.2.1")) {
  console.error(`npm ${version} is below the floor (12.2.1)`);
  process.exit(1);
}

const watched = new Set(["brace-expansion", "picomatch", "ip-address", "pacote", "sigstore"]);
const tree = path.join(root, "npm", "node_modules");
const failures = [];

function visit(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const pkgDir = path.join(dir, entry.name);
    const manifest = path.join(pkgDir, "package.json");
    if (fs.existsSync(manifest)) {
      const parsed = JSON.parse(fs.readFileSync(manifest, "utf8"));
      if (watched.has(parsed.name) && !meetsFloor(parsed.name, parsed.version)) {
        failures.push(`${parsed.name}@${parsed.version} (${manifest})`);
      }
    }
    visit(path.join(pkgDir, "node_modules"));
  }
}

visit(tree);
if (failures.length > 0) {
  console.error("npm bundles packages below the advisory floors:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
EOF
