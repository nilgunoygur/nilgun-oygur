const turkish: Record<string, string> = { ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i", ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u" };

export function articleSlugFromTitle(title: string) {
  return title.replace(/[çÇğĞıİöÖşŞüÜ]/g, letter => turkish[letter])
    .normalize("NFKD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 160).replace(/-$/, "") || "yazi";
}
