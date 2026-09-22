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
