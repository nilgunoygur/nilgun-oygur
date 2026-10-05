// Display formatting shared by server and client components.
export function formatMoney(kurus: number, currency = "TRY") {
  try { return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: kurus % 100 ? 2 : 0 }).format(kurus / 100); }
  catch { return `${(kurus / 100).toLocaleString("tr-TR")} ${currency}`; }
}
export const formatPrice = (kurus: number) => formatMoney(kurus);
/** Kuruş as a lira form value: 1250 is "12.50", 1200 is "12". */
export const liraInput = (kurus: number | null | undefined) => kurus ? (kurus / 100).toFixed(2).replace(/\.00$/, "") : "";
export const dayLabel = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });
export const istanbulDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Istanbul" }).format(date);
export const dateTimeLabel = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
export const shortDate = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });

export function formatAccess(days: number) {
  if (days % 365 === 0) return `${(days / 365) * 12} ay erişim`;
  if (days % 30 === 0) return `${days / 30} ay erişim`;
  return `${days} gün erişim`;
}
export const formatDuration = (seconds: number) => seconds < 60 ? `${seconds} sn` : `${Math.floor(seconds / 60)} dk${seconds % 60 ? ` ${seconds % 60} sn` : ""}`;
