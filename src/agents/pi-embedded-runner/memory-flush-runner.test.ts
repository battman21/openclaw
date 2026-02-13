import { describe, expect, it, vi } from "vitest";
import type { SessionEntry } from "../../config/sessions/types.js";
import { runMemoryFlushIfNeeded } from "./memory-flush-runner.js";

describe("runMemoryFlushIfNeeded", () => {
  it("skips when memory flush is disabled", async () => {
    const sessionEntry: SessionEntry = {
      sessionId: "test-session",
      updatedAt: Date.now(),
      totalTokens: 50000,
      contextTokens: 128000,
    };

    const result = await runMemoryFlushIfNeeded({
      sessionKey: "test-key",
      storePath: "/tmp/test-store.json",
      sessionEntry,
      sessionId: "test-session",
      sessionFile: "/tmp/test.jsonl",
      workspaceDir: "/tmp/workspace",
      config: {
        agents: {
          defaults: {
            compaction: {
              memoryFlush: {
                enabled: false,
              },
            },
          },
        },
      },
      provider: "anthropic",
      model: "claude-sonnet-4.5",
    });

    expect(result.flushed).toBe(false);
    expect(result.compacted).toBe(false);
    expect(result.reason).toBe("memory_flush_disabled");
  });

  it("skips when threshold not reached", async () => {
    const sessionEntry: SessionEntry = {
      sessionId: "test-session",
      updatedAt: Date.now(),
      totalTokens: 10000, // Well below threshold
      contextTokens: 128000,
      compactionCount: 0,
    };

    const result = await runMemoryFlushIfNeeded({
      sessionKey: "test-key",
      storePath: "/tmp/test-store.json",
      sessionEntry,
      sessionId: "test-session",
      sessionFile: "/tmp/test.jsonl",
      workspaceDir: "/tmp/workspace",
      config: undefined,
      provider: "anthropic",
      model: "claude-sonnet-4.5",
    });

    expect(result.flushed).toBe(false);
    expect(result.compacted).toBe(false);
    expect(result.reason).toBe("threshold_not_reached");
    expect(result.compactionCount).toBe(0);
  });

  it("skips when already flushed at current compaction count", async () => {
    const sessionEntry: SessionEntry = {
      sessionId: "test-session",
      updatedAt: Date.now(),
      totalTokens: 110000, // Above threshold
      contextTokens: 128000,
      compactionCount: 5,
      memoryFlushCompactionCount: 5, // Already flushed at this count
    };

    const result = await runMemoryFlushIfNeeded({
      sessionKey: "test-key",
      storePath: "/tmp/test-store.json",
      sessionEntry,
      sessionId: "test-session",
      sessionFile: "/tmp/test.jsonl",
      workspaceDir: "/tmp/workspace",
      config: undefined,
      provider: "anthropic",
      model: "claude-sonnet-4.5",
    });

    expect(result.flushed).toBe(false);
    expect(result.compacted).toBe(false);
    expect(result.reason).toBe("threshold_not_reached");
  });
});
