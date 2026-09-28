import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/mobile";

export type { CountryCode };
const defaultCountry: CountryCode = "TR";

/** Any common way of writing a mobile number ("+90 532…", "0532…", "532…") → E.164; national formats are read as Turkish. Null for landlines and invalid numbers. */
export function normalizePhone(value: string | null | undefined): string | null {
  const phone = value ? parsePhoneNumberFromString(value, defaultCountry) : undefined;
  return phone?.isValid() ? phone.number : null;
}

/** E.164 → "+90 532 123 45 67"; unparseable values are returned unchanged. */
export function formatPhone(value: string): string {
  return parsePhoneNumberFromString(value)?.formatInternational() ?? value;
}

export const callingCode = (country: CountryCode) => `+${getCountryCallingCode(country)}`;

/** National digits grouped the way the country writes them, without the trunk 0: TR "5321234567" → "532 123 45 67". */
export function groupNational(country: CountryCode, digits: string): string {
  const prefix = callingCode(country);
  const formatted = new AsYouType().input(prefix + digits);
  return formatted.startsWith(`${prefix} `) ? formatted.slice(prefix.length + 1) : digits;
}

/** Splits a stored or pasted number into country and national digits, for editing. */
export function splitPhone(value: string | null | undefined, fallback: CountryCode = defaultCountry): { country: CountryCode; digits: string } {
  const phone = value ? parsePhoneNumberFromString(value, fallback) : undefined;
  return phone?.country ? { country: phone.country, digits: phone.nationalNumber } : { country: fallback, digits: "" };
}

const regionNames = new Intl.DisplayNames(["tr"], { type: "region" });
const turkishOrder = new Intl.Collator("tr-TR").compare;
/** Every country with a calling code, named in Turkish; Türkiye first, the rest alphabetical. */
export const phoneCountries: readonly { code: CountryCode; name: string; dial: string }[] = getCountries()
  .map(code => ({ code, name: regionNames.of(code) ?? code, dial: callingCode(code) }))
  .sort((a, b) => a.code === defaultCountry ? -1 : b.code === defaultCountry ? 1 : turkishOrder(a.name, b.name));
