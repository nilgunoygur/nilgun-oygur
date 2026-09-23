// Display formatting shared by server and client components.
export function formatMoney(kurus: number, currency = "TRY") {
  try { return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: kurus % 100 ? 2 : 0 }).format(kurus / 100); }
  catch { return `${(kurus / 100).toLocaleString("tr-TR")} ${currency}`; }
}
export const formatPrice = (kurus: number) => formatMoney(kurus);
export const dayLabel = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });
export const istanbulDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Istanbul" }).format(date);
export const shortDate = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });

export function formatAccess(days: number) {
  if (days % 365 === 0) return `${(days / 365) * 12} ay erişim`;
  if (days % 30 === 0) return `${days / 30} ay erişim`;
  return `${days} gün erişim`;
}
