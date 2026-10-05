const escapeHtml = (text: string) => text.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

/** Notes saved before the rich editor are plain text; this turns them into paragraphs. */
export const notesHtml = (notes: string) => !notes.trim() || /^\s*</.test(notes) ? notes
  : notes.split(/\n{2,}/).map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
