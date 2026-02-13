import { log } from "./logger.js";
import { compactEmbeddedPiSessionDirect } from "./compact.js";
import {
  resolveMemoryFlushSettings,
  resolveMemoryFlushContextWindowTokens,
  shouldRunMemoryFlush,
} from "../../auto-reply/reply/memory-flush.js";
import type { OpenClawConfig } from "../../config/config.js";
import type { SessionEntry } from "../../config/sessions/types.js";
import { updateSessionStoreEntry } from "../../config/sessions/store.js";
import type { ThinkLevel } from "../../auto-reply/thinking.js";
import type { ExecElevatedDefaults } from "../bash-tools.js";
import type { SkillSnapshot } from "../skills.js";

export type MemoryFlushRunnerParams = {
  sessionKey: string;
  storePath: string;
  sessionEntry: SessionEntry;
  sessionId: string;
  sessionFile: string;
  workspaceDir: string;
  agentDir?: string;
  config?: OpenClawConfig;
  skillsSnapshot?: SkillSnapshot;
  provider: string;
  model: string;
  thinkLevel?: ThinkLevel;
  bashElevated?: ExecElevatedDefaults;
  messageChannel?: string;
  messageProvider?: string;
  agentAccountId?: string;
  authProfileId?: string;
  groupId?: string | null;
  groupChannel?: string | null;
  groupSpace?: string | null;
  spawnedBy?: string | null;
  extraSystemPrompt?: string;
  ownerNumbers?: string[];
  lane?: string;
};

export type MemoryFlushRunResult = {
  flushed: boolean;
  compacted: boolean;
  compactionCount: number;
  reason?: string;
};

/**
 * Check if memory flush is needed and run it if so.
 * This prevents context overflow by proactively compacting before reaching the limit.
 */
export async function runMemoryFlushIfNeeded(
  params: MemoryFlushRunnerParams,
): Promise<MemoryFlushRunResult> {
  const flushSettings = resolveMemoryFlushSettings(params.config);

  // Memory flush disabled or not configured
  if (!flushSettings) {
    return {
      flushed: false,
      compacted: false,
      compactionCount: params.sessionEntry.compactionCount ?? 0,
      reason: "memory_flush_disabled",
    };
  }

  // Determine context window size for threshold calculation
  const contextWindowTokens = resolveMemoryFlushContextWindowTokens({
    modelId: params.model,
    agentCfgContextTokens: params.sessionEntry.contextTokens,
  });

  // Check if we should run memory flush
  const shouldFlush = shouldRunMemoryFlush({
    entry: params.sessionEntry,
    contextWindowTokens,
    reserveTokensFloor: flushSettings.reserveTokensFloor,
    softThresholdTokens: flushSettings.softThresholdTokens,
  });

  if (!shouldFlush) {
    return {
      flushed: false,
      compacted: false,
      compactionCount: params.sessionEntry.compactionCount ?? 0,
      reason: "threshold_not_reached",
    };
  }

  const currentCompactionCount = params.sessionEntry.compactionCount ?? 0;

  log.info(
    `[memory-flush] Proactive memory flush triggered for ${params.provider}/${params.model} ` +
      `(totalTokens=${params.sessionEntry.totalTokens}, contextWindow=${contextWindowTokens})`,
  );

  // Run compaction directly (memory flush prompt would require injecting another agent turn,
  // which is complex - for now, we'll just run compaction when the threshold is reached)
  const compactResult = await compactEmbeddedPiSessionDirect({
    sessionId: params.sessionId,
    sessionKey: params.sessionKey,
    messageChannel: params.messageChannel,
    messageProvider: params.messageProvider,
    agentAccountId: params.agentAccountId,
    authProfileId: params.authProfileId,
    groupId: params.groupId,
    groupChannel: params.groupChannel,
    groupSpace: params.groupSpace,
    spawnedBy: params.spawnedBy,
    sessionFile: params.sessionFile,
    workspaceDir: params.workspaceDir,
    agentDir: params.agentDir,
    config: params.config,
    skillsSnapshot: params.skillsSnapshot,
    provider: params.provider,
    model: params.model,
    thinkLevel: params.thinkLevel,
    bashElevated: params.bashElevated,
    extraSystemPrompt: params.extraSystemPrompt,
    ownerNumbers: params.ownerNumbers,
    lane: params.lane,
  });

  if (!compactResult.compacted) {
    log.warn(`[memory-flush] Proactive compaction failed: ${compactResult.reason ?? "unknown"}`);
    return {
      flushed: false,
      compacted: false,
      compactionCount: currentCompactionCount,
      reason: compactResult.reason ?? "compaction_failed",
    };
  }

  // Update compaction tracking in session store
  const newCompactionCount = currentCompactionCount + 1;

  await updateSessionStoreEntry({
    storePath: params.storePath,
    sessionKey: params.sessionKey,
    update: async () => ({
      compactionCount: newCompactionCount,
      memoryFlushCompactionCount: newCompactionCount,
      updatedAt: Date.now(),
    }),
  });

  log.info(
    `[memory-flush] Proactive compaction succeeded (compactionCount: ${currentCompactionCount} → ${newCompactionCount})`,
  );

  return {
    flushed: true,
    compacted: true,
    compactionCount: newCompactionCount,
  };
}
