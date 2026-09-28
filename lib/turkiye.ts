import { districtsByPlateCode } from "./turkiye-districts.ts";

/** Plate-code order: index + 1 is the plate code (and postcode prefix). */
export const provinces = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
  "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
  "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
  "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
  "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
  "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
  "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye",
  "Düzce",
] as const;
export type Province = (typeof provinces)[number];

export const provinceOptions = [...provinces].sort(new Intl.Collator("tr-TR").compare);

// Folds case, accents and ı/i: "IGDIR" → "igdir".
const fold = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ı", "i").replace(/[^a-z]/g, "");
// Only list names (provinces, districts, countries) are cached; user input never is.
const foldedNames = new Map<string, string>();
const foldName = (name: string) => foldedNames.get(name) ?? foldedNames.set(name, fold(name)).get(name)!;
let lastQuery = { raw: "", folded: "" };
/** Picker search: `name` must come from a fixed list. */
export function matchesTurkish(name: string, query: string) {
  if (lastQuery.raw !== query) lastQuery = { raw: query, folded: fold(query) };
  return foldName(name).includes(lastQuery.folded);
}
const aliases: Record<string, Province> = { icel: "Mersin", afyon: "Afyonkarahisar", maras: "Kahramanmaraş", kmaras: "Kahramanmaraş", urfa: "Şanlıurfa", antep: "Gaziantep" };
const byFolded = new Map<string, Province>([...provinces.map(name => [fold(name), name] as const), ...Object.entries(aliases)]);

/** The canonical province for free text (e.g. a Shopier city), or null. */
export function matchProvince(value: string | null | undefined): Province | null {
  return value ? byFolded.get(fold(value)) ?? null : null;
}

export function plateCode(province: Province): string {
  return String(provinces.indexOf(province) + 1).padStart(2, "0");
}

export function districtsOf(province: Province): readonly string[] {
  return districtsByPlateCode[plateCode(province)] ?? [];
}

/** The canonical district for free text, or null; the province name matches its "Merkez". */
export function matchDistrict(province: Province, value: string | null | undefined): string | null {
  if (!value) return null;
  const folded = fold(value);
  const districts = districtsOf(province);
  return districts.find(name => foldName(name) === folded)
    ?? (folded === foldName(province) || folded === `${foldName(province)}merkez` ? districts.find(name => name === "Merkez") ?? null : null);
}
