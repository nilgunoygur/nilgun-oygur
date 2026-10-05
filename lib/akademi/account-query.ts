/** The header menu's query; a student action that changes its notices invalidates `accountQueryRoot`. */
export const accountQueryRoot = ["account"] as const;
export const accountQueryKey = (userId: string | null) => [...accountQueryRoot, userId] as const;
