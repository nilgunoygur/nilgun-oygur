import { z } from "zod";
import { matchDistrict, matchProvince, normalizePhone, plateCode, type Province } from "../turkiye.ts";

// Small raster avatars are stored with the profile; no public file upload endpoint is needed.
export const profileImage = z.string().max(100000).regex(/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/).nullable();
export const profileInput = z.object({ name: z.string().trim().min(1, "Adınızı yazın.").max(100), image: profileImage });
export function avatarSource(value: string | null | undefined) {
  return value && profileImage.safeParse(value).success ? value : undefined;
}

// Contact details, named after Shopier's buyer fields. Each schema also validates Better Auth's
// sign-up and update-user input, so direct API calls get the same normalization as the forms.
export const contactFields = {
  /** Stored as E.164 (+905321234567). */
  phone: z.string().transform((value, ctx) => normalizePhone(value) ?? (ctx.addIssue({ code: "custom", message: "Geçerli bir cep telefonu numarası girin: 05XX XXX XX XX." }), z.NEVER)),
  city: z.string().transform((value, ctx) => matchProvince(value) ?? (ctx.addIssue({ code: "custom", message: "İlinizi listeden seçin." }), z.NEVER)),
  district: z.string().trim().min(2, "İlçenizi yazın.").max(60, "İlçe adı en fazla 60 karakter olabilir."),
  address: z.string().trim().min(10, "Açık adresinizi mahalle, sokak ve numarayla yazın.").max(250, "Adres en fazla 250 karakter olabilir."),
  /** Optional; an empty value clears it. */
  postcode: z.string().nullable().transform(value => value?.trim() || null).pipe(z.string().regex(/^\d{5}$/, "Posta kodu 5 haneden oluşmalıdır.").nullable()),
};
/** The canonical district of this province, or the Turkish message for a mismatch. */
export function checkDistrict(city: Province, district: string) {
  const match = matchDistrict(city, district);
  return match ? { district: match, error: null } : { district: null, error: `${district} bir ${city} ilçesi değil. İlçenizi listeden seçin.` };
}
export const contactInput = z.object(contactFields).transform((value, ctx) => {
  const checked = checkDistrict(value.city, value.district);
  if (checked.district === null) { ctx.addIssue({ code: "custom", path: ["district"], message: checked.error }); return z.NEVER; }
  if (value.postcode && !value.postcode.startsWith(plateCode(value.city))) {
    ctx.addIssue({ code: "custom", path: ["postcode"], message: `${value.city} posta kodları ${plateCode(value.city)} ile başlar.` });
    return z.NEVER;
  }
  return { ...value, district: checked.district };
});
export type ContactInput = z.input<typeof contactInput>;
export type Contact = { [K in keyof typeof contactFields]: string | null };

/** Legacy accounts and some Shopier-filled profiles are incomplete; the postcode is optional. */
export const hasCompleteContact = (contact: Contact) => !!(contact.phone && contact.city && contact.district && contact.address);
