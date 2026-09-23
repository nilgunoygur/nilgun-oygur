const turkish: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };

/** "Doğal Taş Eğitimi" → "dogal-tas-egitimi" */
export function courseSlug(value: string, maxLength = 80): string {
  return value.toLocaleLowerCase("tr-TR").replace(/[çğıöşü]/g, c => turkish[c])
    .normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, maxLength).replace(/-+$/, "");
}

export const articleSlug = (title: string) => courseSlug(title, 160) || "yazi";
