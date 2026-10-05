import sanitizeHtml from "sanitize-html";
import { plainToHtml } from "./html.ts";

export const richPlainText = (html: string) => sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();

export function cleanRichHtml(value: string, { images = true } = {}) {
  return sanitizeHtml(value, {
    allowedTags: ["p", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "code", "ul", "ol", "li", "blockquote", "a", "br", "hr", ...(images ? ["img"] : [])],
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt"], p: ["style"], h2: ["style"], h3: ["style"], h4: ["style"] },
    // Alignment is the only inline style the editor produces.
    allowedStyles: { "*": { "text-align": [/^(left|center|right|justify)$/] } },
    allowedSchemes: ["http", "https", "mailto"],
    // Images: site paths or https only.
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    exclusiveFilter: frame => frame.tag === "img" && !frame.attribs.src,
    transformTags: { a: (_tag, attributes) => ({ tagName: "a", attribs: { href: attributes.href ?? "#", rel: "noopener noreferrer", target: "_blank" } }) },
  });
}

export const cleanNotes = (notes: string) => cleanRichHtml(plainToHtml(notes), { images: false });
