import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

function simpleGitPackageDir(): string {
  const root = join(process.cwd(), "node_modules", ".pnpm");
  const matches = readdirSync(root).filter((name) => name.startsWith("simple-git@4."));
  const match = matches.find((name) => name.includes("_patch_hash=")) ?? matches.toSorted().at(-1);
  if (!match) {
    throw new Error("simple-git 4 is not installed");
  }
  return join(root, match, "node_modules", "simple-git");
}

describe("simple-git security floor", () => {
  it("installs simple-git 4 and still allows a normal user.name config write", async () => {
    const lockfile = readFileSync(join(process.cwd(), "pnpm-lock.yaml"), "utf8");
    expect(lockfile).toContain("simple-git@4.");
    expect(lockfile).not.toContain("simple-git@3.");

    const pkgDir = simpleGitPackageDir();
    const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as {
      version: string;
      module?: string;
      exports?: { "."?: { default?: string; import?: string } | string };
    };
    const [major = 0, minor = 0, patch = 0] = pkg.version.split(".").map((part) => Number(part));
    expect(major > 4 || (major === 4 && (minor > 0 || patch >= 2))).toBe(true);

    const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      pnpm?: { patchedDependencies?: Record<string, string> };
    };
    expect(manifest.pnpm?.patchedDependencies?.["simple-git@4.0.2"]).toContain(
      "simple-git@4.0.2.patch",
    );

    const exportEntry = pkg.exports?.["."];
    const entry =
      typeof exportEntry === "string"
        ? exportEntry
        : (exportEntry?.import ?? exportEntry?.default ?? pkg.module ?? "./dist/index.mjs");
    const imported = (await import(pathToFileURL(join(pkgDir, entry)).href)) as {
      default?: (baseDir: string) => {
        init: () => Promise<unknown>;
        addConfig: (key: string, value: string) => Promise<unknown>;
        raw: (args: string[]) => Promise<string>;
      };
      simpleGit?: (baseDir: string) => {
        init: () => Promise<unknown>;
        addConfig: (key: string, value: string) => Promise<unknown>;
        raw: (args: string[]) => Promise<string>;
      };
    };
    const simpleGit = imported.default;
    if (!simpleGit) {
      throw new Error("simple-git default export missing");
    }
    expect(simpleGit).toBe(imported.simpleGit);

    const repo = mkdtempSync(join(tmpdir(), "openclaw-simple-git-"));
    execFileSync("git", ["init"], { cwd: repo });
    const git = simpleGit(repo);
    await git.init();
    await git.addConfig("user.name", "openclaw-floor");
    const name = (await git.raw(["config", "--get", "user.name"])).trim();
    expect(name).toBe("openclaw-floor");
  });
});
