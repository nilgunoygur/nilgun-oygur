export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
export const isRichHtml = (value: string) => /^\s*</.test(value);
/** Text saved before the rich editor, as paragraphs. */
export const plainToHtml = (text: string) => !text.trim() || isRichHtml(text) ? text
  : text.split(/\n{2,}/).map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
