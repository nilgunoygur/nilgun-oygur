/** % and _ in the text match literally. */
export const containsPattern = (text: string) => `%${text.replace(/[\\%_]/g, "\\$&")}%`;
