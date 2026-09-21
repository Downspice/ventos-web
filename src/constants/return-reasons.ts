/** Preset return reasons; `__custom__` means free-text entry. */
export const RETURN_REASON_PRESETS = [
  "Defective or damaged",
  "Wrong item",
  "Customer changed mind",
  "Expired or spoiled",
  "Not as described",
  "__custom__",
] as const;

export const RETURN_REASON_CUSTOM = "__custom__";

export function resolveReturnReason(preset: string, customText: string): string | undefined {
  if (preset === RETURN_REASON_CUSTOM) {
    const t = customText.trim();
    return t || undefined;
  }
  return preset;
}
