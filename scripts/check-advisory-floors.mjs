#!/usr/bin/env node
// Fail when a locked package is below the 22 Oct 2026 advisory floors.
// Absent packages are skipped. Line-specific floors stay on that major.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lock = readFileSync(join(root, "pnpm-lock.yaml"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

/** @type {Map<string, Set<string>>} */
const versions = new Map();
for (const line of lock.split("\n")) {
  const match = line.match(/^ {2}'?((?:@[^@'\s]+\/)?[^@'\s]+)'?@([^':]+)'?:/);
  if (!match) {
    continue;
  }
  const name = match[1];
  const version = match[2];
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    continue;
  }
  let set = versions.get(name);
  if (!set) {
    set = new Set();
    versions.set(name, set);
  }
  set.add(version);
}

function parts(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function gte(version, floor) {
  const left = parts(version);
  const right = parts(floor);
  if (!left || !right) {
    return false;
  }
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) {
      return left[i] > right[i];
    }
  }
  return true;
}

function majorOf(version) {
  return parts(version)?.[0] ?? -1;
}

/** @type {Array<{name: string, ok: (version: string) => boolean, floor: string}>} */
const rules = [
  { name: "axios", floor: ">=1.20.0", ok: (version) => gte(version, "1.20.0") },
  {
    name: "brace-expansion",
    floor: "1.1.21 / 2.1.7 / 3.0.9 / 5.0.12",
    ok: (version) => {
      const major = majorOf(version);
      if (major === 1) {
        return gte(version, "1.1.21");
      }
      if (major === 2) {
        return gte(version, "2.1.7");
      }
      if (major === 3) {
        return gte(version, "3.0.9");
      }
      if (major >= 5) {
        return gte(version, "5.0.12");
      }
      return false;
    },
  },
  { name: "dompurify", floor: ">=3.4.16", ok: (version) => gte(version, "3.4.16") },
  {
    name: "express",
    floor: "4.22.1 (4.x, no in-window advisory) / >=5.3.0",
    ok: (version) => {
      const major = majorOf(version);
      if (major === 4) {
        return gte(version, "4.22.1");
      }
      if (major >= 5) {
        return gte(version, "5.3.0");
      }
      return false;
    },
  },
  { name: "handlebars", floor: ">=4.7.10", ok: (version) => gte(version, "4.7.10") },
  { name: "hono", floor: ">=4.13.11", ok: (version) => gte(version, "4.13.11") },
  {
    name: "nanoid",
    floor: ">=3.3.18 / >=5.1.16",
    ok: (version) => {
      const major = majorOf(version);
      if (major === 3) {
        return gte(version, "3.3.18");
      }
      if (major === 4) {
        return false;
      }
      if (major === 5) {
        return gte(version, "5.1.16");
      }
      return major > 5;
    },
  },
  { name: "postcss", floor: ">=8.5.23", ok: (version) => gte(version, "8.5.23") },
  { name: "qs", floor: ">=6.16.0", ok: (version) => gte(version, "6.16.0") },
  { name: "sanitize-html", floor: ">=2.18.1", ok: (version) => gte(version, "2.18.1") },
  { name: "sharp", floor: ">=0.35.5", ok: (version) => gte(version, "0.35.5") },
  { name: "tar", floor: ">=7.5.21", ok: (version) => gte(version, "7.5.21") },
  {
    name: "undici",
    floor: "6.28.1 / 7.29.1 / >=8.10.2",
    ok: (version) => {
      const major = majorOf(version);
      if (major === 6) {
        return gte(version, "6.28.1");
      }
      if (major === 7) {
        return gte(version, "7.29.1");
      }
      if (major >= 8) {
        return gte(version, "8.10.2");
      }
      return false;
    },
  },
  {
    name: "vite",
    floor: "7.3.7 / >=8.3.3",
    ok: (version) => {
      const major = majorOf(version);
      if (major === 7) {
        return gte(version, "7.3.7");
      }
      if (major >= 8) {
        return gte(version, "8.3.3");
      }
      return false;
    },
  },
  { name: "ws", floor: ">=8.21.0", ok: (version) => gte(version, "8.21.0") },
];

const failures = [];
for (const rule of rules) {
  const found = versions.get(rule.name);
  if (!found) {
    continue;
  }
  for (const version of found) {
    if (!rule.ok(version)) {
      failures.push(`${rule.name}@${version} below ${rule.floor}`);
    }
  }
}

const manager = String(pkg.packageManager ?? "");
const managerVersion = manager.replace(/^pnpm@/, "").split("+")[0];
const [pmMajor, pmMinor, pmPatch] = managerVersion.split(".").map((part) => Number(part));
const pnpmOk =
  (pmMajor === 10 && (pmMinor > 34 || (pmMinor === 34 && pmPatch >= 5))) ||
  (pmMajor === 11 && (pmMinor > 11 || (pmMinor === 11 && pmPatch >= 0))) ||
  pmMajor >= 12;
if (!pnpmOk) {
  failures.push(`packageManager ${manager} below pnpm 10.34.5 / 11.11.0 / 12`);
}

const engines = String(pkg.engines?.node ?? "");
if (
  !engines.includes(">=22.23.4") ||
  !engines.includes(">=24.22.1") ||
  !engines.includes(">=26.12.1")
) {
  failures.push(`engines.node ${engines} is missing the Node 22/24/26 floors`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("advisory floors satisfied");
