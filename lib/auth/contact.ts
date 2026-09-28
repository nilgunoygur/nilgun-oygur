import { z } from "zod";
import { matchDistrict, matchProvince, plateCode, type Province } from "../turkiye.ts";
import { normalizePhone } from "../phone.ts";
import { emailField, matchingPasswords, newPassword } from "./forms.ts";

// Contact fields, named after Shopier's buyer fields.
export const contactFields = {
  phone: z.string().transform((value, ctx) => normalizePhone(value) ?? (ctx.addIssue({ code: "custom", message: value ? "Geçerli bir cep telefonu numarası girin." : "Cep telefonu numaranızı yazın." }), z.NEVER)),
  city: z.string().transform((value, ctx) => matchProvince(value) ?? (ctx.addIssue({ code: "custom", message: "İlinizi listeden seçin." }), z.NEVER)),
  district: z.string().trim().min(2, "İlçenizi seçin.").max(60, "İlçe adı en fazla 60 karakter olabilir."),
  address: z.string().trim().min(10, "Açık adresinizi mahalle, sokak ve numarayla yazın.").max(250, "Adres en fazla 250 karakter olabilir."),
  // Optional; an empty value clears it.
  postcode: z.string().nullable().transform(value => value?.trim() || null).pipe(z.string().regex(/^\d{5}$/, "Posta kodu 5 haneden oluşmalıdır.").nullable()),
};
export type Contact = { [K in keyof typeof contactFields]: string | null };
export const contactKeys = Object.keys(contactFields) as (keyof Contact)[];

export function checkDistrict(city: Province, district: string) {
  const match = matchDistrict(city, district);
  return match ? { district: match, error: null } : { district: null, error: `${district} bir ${city} ilçesi değil. İlçenizi listeden seçin.` };
}

/** The one contact rule set: forms, server actions and the Better Auth hook all parse with it. */
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
export type ContactFormValues = { phone: string; city: string; district: string; address: string; postcode: string };
export const contactFormValues = (contact?: Contact): ContactFormValues => ({
  phone: contact?.phone ?? "", city: contact?.city ?? "", district: contact?.district ?? "", address: contact?.address ?? "", postcode: contact?.postcode ?? "",
});
export const contactFormSchema = z.object({ contact: contactInput });

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Adınızı ve soyadınızı yazın.").max(100, "Ad en fazla 100 karakter olabilir."),
  email: emailField(), password: newPassword, confirmPassword: z.string(), contact: contactInput,
}).refine(matchingPasswords, { path: ["confirmPassword"], message: "Şifreler eşleşmiyor." });

// The postcode is optional.
export const hasCompleteContact = (contact: Contact) => !!(contact.phone && contact.city && contact.district && contact.address);
