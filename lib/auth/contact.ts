import { z } from "zod";
import { matchDistrict, matchProvince, plateCode } from "../turkiye.ts";
import { normalizePhone } from "../phone.ts";
import { emailField, matchingPasswords, mismatch, newPassword } from "./forms.ts";

export const contactFields = {
  phone: z.string().max(40).transform((value, ctx) => normalizePhone(value) ?? (ctx.addIssue({ code: "custom", message: value ? "Geçerli bir cep telefonu numarası girin." : "Cep telefonu numaranızı yazın." }), z.NEVER)),
  city: z.string().max(60, "İlinizi listeden seçin.").transform((value, ctx) => matchProvince(value) ?? (ctx.addIssue({ code: "custom", message: "İlinizi listeden seçin." }), z.NEVER)),
  district: z.string().trim().min(2, "İlçenizi seçin.").max(60, "İlçe adı en fazla 60 karakter olabilir."),
  address: z.string().trim().min(10, "Açık adresinizi mahalle, sokak ve numarayla yazın.").max(250, "Adres en fazla 250 karakter olabilir."),
  // An empty postcode clears it.
  postcode: z.string().nullable().transform(value => value?.trim() || null).pipe(z.string().regex(/^\d{5}$/, "Posta kodu 5 haneden oluşmalıdır.").nullable()),
};
export type Contact = Record<keyof typeof contactFields, string | null>;
export type ContactFormValues = Record<keyof Contact, string>;
export const contactKeys = Object.keys(contactFields) as (keyof Contact)[];

export const contactInput = z.object(contactFields).transform((value, ctx) => {
  const district = matchDistrict(value.city, value.district);
  if (!district) { ctx.addIssue({ code: "custom", path: ["district"], message: `${value.district} bir ${value.city} ilçesi değil. İlçenizi listeden seçin.` }); return z.NEVER; }
  if (value.postcode && !value.postcode.startsWith(plateCode(value.city))) {
    ctx.addIssue({ code: "custom", path: ["postcode"], message: `${value.city} posta kodları ${plateCode(value.city)} ile başlar.` });
    return z.NEVER;
  }
  return { ...value, district };
});
export type ContactInput = z.input<typeof contactInput>;
export const contactFormValues = (contact?: Contact): ContactFormValues => ({
  phone: contact?.phone ?? "", city: contact?.city ?? "", district: contact?.district ?? "", address: contact?.address ?? "", postcode: contact?.postcode ?? "",
});
export const contactFormSchema = z.object({ contact: contactInput });

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Adınızı ve soyadınızı yazın.").max(100, "Ad en fazla 100 karakter olabilir."),
  email: emailField(), password: newPassword, confirmPassword: z.string(), contact: contactInput, newsletter: z.boolean(),
}).refine(matchingPasswords, mismatch);

export const hasCompleteContact = (contact: Contact) => !!(contact.phone && contact.city && contact.district && contact.address);
