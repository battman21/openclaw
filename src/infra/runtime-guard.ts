import process from "node:process";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";

export type RuntimeKind = "node" | "unknown";

type Semver = {
  major: number;
  minor: number;
  patch: number;
};

// Patched floors for CVE-2026-111497 (Brotli decoder) and CVE-2026-111943
// (eMudhra trust store). Node 18 and 20 are end of life and never receive a fix.
// Releases after the 26 line (Node 27+) are allowed; Node 27 stable is scheduled
// after these security releases. Odd lines 23 and 25 are rejected.
const NODE_SECURITY_FLOORS: Semver[] = [
  { major: 22, minor: 23, patch: 4 },
  { major: 24, minor: 22, patch: 1 },
  { major: 26, minor: 12, patch: 1 },
];

export const NODE_REQUIREMENT_LABEL = "Node 22.23.4+, 24.22.1+, or 26.12.1+";

export type RuntimeDetails = {
  kind: RuntimeKind;
  version: string | null;
  execPath: string | null;
  pathEnv: string;
};

const SEMVER_RE = /(\d+)\.(\d+)\.(\d+)/;

export function parseSemver(version: string | null): Semver | null {
  if (!version) {
    return null;
  }
  const match = version.match(SEMVER_RE);
  if (!match) {
    return null;
  }
  const [, major, minor, patch] = match;
  return {
    major: Number.parseInt(major, 10),
    minor: Number.parseInt(minor, 10),
    patch: Number.parseInt(patch, 10),
  };
}

export function isAtLeast(version: Semver | null, minimum: Semver): boolean {
  if (!version) {
    return false;
  }
  if (version.major !== minimum.major) {
    return version.major > minimum.major;
  }
  if (version.minor !== minimum.minor) {
    return version.minor > minimum.minor;
  }
  return version.patch >= minimum.patch;
}

export function detectRuntime(): RuntimeDetails {
  const kind: RuntimeKind = process.versions?.node ? "node" : "unknown";
  const version = process.versions?.node ?? null;

  return {
    kind,
    version,
    execPath: process.execPath ?? null,
    pathEnv: process.env.PATH ?? "(not set)",
  };
}

export function isSupportedNodeVersion(version: string | null): boolean {
  const parsed = parseSemver(version);
  if (!parsed) {
    return false;
  }
  if (parsed.major > 26) {
    return true;
  }
  const floor = NODE_SECURITY_FLOORS.find((candidate) => candidate.major === parsed.major);
  if (!floor) {
    return false;
  }
  return isAtLeast(parsed, floor);
}

export function runtimeSatisfies(details: RuntimeDetails): boolean {
  if (details.kind === "node") {
    return isSupportedNodeVersion(details.version);
  }
  return false;
}

export function assertSupportedRuntime(
  runtime: RuntimeEnv = defaultRuntime,
  details: RuntimeDetails = detectRuntime(),
): void {
  if (runtimeSatisfies(details)) {
    return;
  }

  const versionLabel = details.version ?? "unknown";
  const runtimeLabel =
    details.kind === "unknown" ? "unknown runtime" : `${details.kind} ${versionLabel}`;
  const execLabel = details.execPath ?? "unknown";

  runtime.error(
    [
      `openclaw requires ${NODE_REQUIREMENT_LABEL}.`,
      `Detected: ${runtimeLabel} (exec: ${execLabel}).`,
      `PATH searched: ${details.pathEnv}`,
      "Install Node: https://nodejs.org/en/download",
      "Upgrade Node and re-run openclaw.",
    ].join("\n"),
  );
  runtime.exit(1);
}
