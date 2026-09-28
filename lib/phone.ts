import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/mobile";

export type { CountryCode };
const defaultCountry: CountryCode = "TR";

/** A mobile number in any common form → E.164 (national forms read as Turkish); null otherwise. */
export function normalizePhone(value: string | null | undefined): string | null {
  const phone = value ? parsePhoneNumberFromString(value, defaultCountry) : undefined;
  return phone?.isValid() ? phone.number : null;
}

export function formatPhone(value: string): string {
  return parsePhoneNumberFromString(value)?.formatInternational() ?? value;
}

export const callingCode = (country: CountryCode) => `+${getCountryCallingCode(country)}`;

/** TR "5321234567" → "532 123 45 67" (no trunk 0). */
export function groupNational(country: CountryCode, digits: string): string {
  const prefix = callingCode(country);
  const formatted = new AsYouType().input(prefix + digits);
  return formatted.startsWith(`${prefix} `) ? formatted.slice(prefix.length + 1) : digits;
}

export function splitPhone(value: string | null | undefined, fallback: CountryCode = defaultCountry): { country: CountryCode; digits: string } {
  const phone = value ? parsePhoneNumberFromString(value, fallback) : undefined;
  return phone?.country ? { country: phone.country, digits: phone.nationalNumber } : { country: fallback, digits: "" };
}

export type PhoneCountry = { code: CountryCode; name: string; dial: string };
let countries: readonly PhoneCountry[] | undefined;
/** Türkiye first, the rest by Turkish name; built on first use (only the phone input needs it). */
export function phoneCountries(): readonly PhoneCountry[] {
  if (countries) return countries;
  const names = new Intl.DisplayNames(["tr"], { type: "region" });
  const order = new Intl.Collator("tr-TR").compare;
  return countries = getCountries().map(code => ({ code, name: names.of(code) ?? code, dial: callingCode(code) }))
    .sort((a, b) => a.code === defaultCountry ? -1 : b.code === defaultCountry ? 1 : order(a.name, b.name));
}
