/** An ILIKE pattern that finds `text` anywhere, with % and _ taken literally. */
export const containsPattern = (text: string) => `%${text.replace(/[\\%_]/g, "\\$&")}%`;
