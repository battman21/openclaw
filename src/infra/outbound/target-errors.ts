export function missingTargetMessage(provider: string, hint?: string): string {
  return `Delivering to ${provider} requires target${formatTargetHint(hint)}`;
}

export function missingTargetError(provider: string, hint?: string): Error {
  return new Error(missingTargetMessage(provider, hint));
}

export function ambiguousTargetMessage(provider: string, raw: string, hint?: string): string {
  return `Ambiguous target "${raw}" for ${provider}. Provide a unique name or an explicit id.${formatTargetHint(hint, true)}`;
}

export function ambiguousTargetError(provider: string, raw: string, hint?: string): Error {
  return new Error(ambiguousTargetMessage(provider, raw, hint));
}

export function unknownTargetMessage(provider: string, raw: string, hint?: string): string {
  return `Unknown target "${raw}" for ${provider}.${formatTargetHint(hint, true)}`;
}

export function unknownTargetError(provider: string, raw: string, hint?: string): Error {
  return new Error(unknownTargetMessage(provider, raw, hint));
}

function formatTargetHint(hint?: string, withLabel = false): string {
  if (!hint) {
    return "";
  }
  return withLabel ? ` Hint: ${hint}` : ` ${hint}`;
}

/**
 * Classify an error message to help plugins identify error types.
 * Returns error type classification: "rate_limit", "overload", "auth", "network", "provider", "unknown"
 */
export function classifyErrorMessage(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();

  // Rate limiting
  if (lower.includes("rate limit") || lower.includes("rate_limit") || lower.includes("429")) {
    return "rate_limit";
  }

  // Overload/capacity
  if (lower.includes("overload") || lower.includes("capacity") || lower.includes("503")) {
    return "overload";
  }

  // Authentication
  if (
    lower.includes("auth") ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden")
  ) {
    return "auth";
  }

  // Network errors
  if (
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound")
  ) {
    return "network";
  }

  // Model/provider errors
  if (lower.includes("model") || lower.includes("provider")) {
    return "provider";
  }

  return "unknown";
}
