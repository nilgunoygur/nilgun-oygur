/** Next.js can expose an encoded slug during prerendering and a decoded one at runtime. */
export function normalizeSlug(slug: string): string | null {
  try {
    return decodeURIComponent(slug).normalize("NFC");
  } catch {
    return null;
  }
}
