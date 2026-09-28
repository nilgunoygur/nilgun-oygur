import { districtsByPlateCode } from "./turkiye-districts.ts";

// Türkiye address data (provinces and districts), shared by the browser and the server.

/** The 81 provinces in plate-code order: index + 1 is the plate code, which is also the first two digits of every postcode there. */
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

/** Alphabetical (Turkish collation) for pickers. */
export const provinceOptions = [...provinces].sort((a, b) => a.localeCompare(b, "tr-TR"));

// "İSTANBUL", "Istanbul" and "istanbul" all fold to "istanbul".
const fold = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{M}/gu, "")
  .replaceAll("ı", "i").replace(/[^a-z]/g, "");
/** Case-, accent- and dotted/dotless-i-insensitive search: "kadikoy" finds Kadıköy, "IGDIR" finds Iğdır. */
export const matchesTurkish = (text: string, query: string) => fold(text).includes(fold(query));
const aliases: Record<string, Province> = { icel: "Mersin", afyon: "Afyonkarahisar", maras: "Kahramanmaraş", kmaras: "Kahramanmaraş", urfa: "Şanlıurfa", antep: "Gaziantep" };
const byFolded = new Map<string, Province>([...provinces.map(name => [fold(name), name] as const), ...Object.entries(aliases)]);

/** The canonical province name for free text (e.g. a Shopier checkout city), or null. */
export function matchProvince(value: string | null | undefined): Province | null {
  return value ? byFolded.get(fold(value)) ?? null : null;
}

export function plateCode(province: Province): string {
  return String(provinces.indexOf(province) + 1).padStart(2, "0");
}

/** The province's districts (ilçe), alphabetical, as PTT names them. */
export function districtsOf(province: Province): readonly string[] {
  return districtsByPlateCode[plateCode(province)] ?? [];
}

/** The canonical district of this province for free text, or null. PTT names central districts "Merkez"; the province name matches it too. */
export function matchDistrict(province: Province, value: string | null | undefined): string | null {
  if (!value) return null;
  const folded = fold(value);
  const districts = districtsOf(province);
  return districts.find(name => fold(name) === folded)
    ?? (folded === fold(province) || folded === `${fold(province)}merkez` ? districts.find(name => name === "Merkez") ?? null : null);
}
