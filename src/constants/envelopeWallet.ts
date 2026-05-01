export const ENVELOPE_WALLET_CATEGORIES = [
  "general",
  "food",
  "transportation",
  "personal_care",
  "household",
] as const;

export const ENVELOPE_WALLET_CATEGORY_SET = new Set<string>(ENVELOPE_WALLET_CATEGORIES);
export const ENVELOPE_WALLET_MODE_SET = new Set<string>(["strict", "dynamic"]);
