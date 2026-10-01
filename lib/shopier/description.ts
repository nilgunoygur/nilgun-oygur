// Shopier descriptions are HTML. Cards need plain text; the course page gets an allowlisted subset.
const ALLOWED = new Set(["p", "br", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i"]);
const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

const decode = (text: string) => text
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
  .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match);
const withoutCode = (html: string) => html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function descriptionText(html: string): string {
  return decode(withoutCode(html).replace(/<(br|\/p|\/li|\/h[1-6])\b[^>]*>/gi, " ").replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

/** Keeps only attribute-free allowlisted tags; everything else is escaped text or dropped. */
export function descriptionHtml(html: string): string {
  return withoutCode(html).split(/(<[^>]*>)/).map(part => {
    const tag = /^<\s*(\/?)\s*([a-z0-9]+)\b[^>]*>$/i.exec(part);
    if (!tag) return part.startsWith("<") ? "" : escape(decode(part));
    const name = tag[2].toLowerCase();
    if (!ALLOWED.has(name)) return "";
    return name === "br" ? "<br>" : `<${tag[1]}${name}>`;
  }).join("");
}

// The owner edits descriptions as plain text with a few marks: one paragraph per line, "### " heading,
// "- " or "1. " list item, **bold**, *italic*. Shopier's API drops <br> from what it is sent (checked against the
// live API), so a line break inside a paragraph cannot be saved; every line becomes its own paragraph instead.

export function descriptionMarkup(html: string): string {
  let out = "";
  const lists: { ordered: boolean; count: number }[] = [];
  const endLine = () => { out = out.replace(/[ \t]+$/, ""); if (out && !out.endsWith("\n")) out += "\n"; };
  const endBlock = () => { endLine(); if (out && !out.endsWith("\n\n")) out += "\n"; };
  for (const part of withoutCode(html).replace(/\s+/g, " ").split(/(<[^>]*>)/)) {
    const tag = /^<\s*(\/?)\s*([a-z0-9]+)\b[^>]*>$/i.exec(part);
    if (!tag) { if (!part.startsWith("<")) out += decode(part); continue; }
    const closing = !!tag[1], name = tag[2].toLowerCase();
    if (name === "br") { out = out.replace(/[ \t]+$/, "") + "\n"; }
    else if (/^h[1-6]$/.test(name)) { endBlock(); if (!closing) out += `${"#".repeat(Math.min(Math.max(Number(name[1]), 2), 4))} `; }
    else if (name === "p" || name === "div") endBlock();
    else if (name === "ul" || name === "ol") { endBlock(); if (closing) lists.pop(); else lists.push({ ordered: name === "ol", count: 0 }); }
    else if (name === "li") { endLine(); const list = lists.at(-1); if (!closing) out += list?.ordered ? `${++list.count}. ` : "- "; }
    else if (name === "strong" || name === "b") out += "**";
    else if (name === "em" || name === "i") out += "*";
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function markupDescription(text: string): string {
  const inline = (line: string) => escape(line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  const blocks: string[] = [];
  let items: string[] = [], ordered = false;
  const endList = () => {
    if (items.length) blocks.push(`<${ordered ? "ol" : "ul"}>${items.map(item => `<li>${inline(item)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
    items = [];
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim(), heading = /^(#{2,4})\s+(.+)$/.exec(line), item = /^(?:[-•]|(\d+)[.)])\s+(.+)$/.exec(line);
    if (item) { if (items.length && ordered !== !!item[1]) endList(); ordered = !!item[1]; items.push(item[2]); continue; }
    endList();
    if (heading) blocks.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
    else if (line) blocks.push(`<p>${inline(line)}</p>`);
  }
  endList();
  return blocks.join("\n");
}
