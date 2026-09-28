"use client";
import { useId, useState } from "react";
import { contactInput, type Contact } from "@/lib/auth/profile";
import { districtsOf, formatPhone, matchDistrict, matchProvince, normalizePhone, provinceOptions, type Province } from "@/lib/turkiye";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";

/** Reads the fields below from a submitted form: normalized values, or the first problem in Turkish. */
export function readContact(data: FormData) {
  const text = (key: string) => String(data.get(key) ?? "");
  const parsed = contactInput.safeParse({ phone: text("phone"), city: text("city"), district: text("district"), address: text("address"), postcode: text("postcode") });
  return parsed.success ? { contact: parsed.data, error: null } : { contact: null, error: parsed.error.issues[0]?.message ?? "İletişim bilgilerinizi kontrol edin." };
}

// Long lists open downward with a scrollable popup instead of centring the selected item over the trigger.
const listProps = { alignItemWithTrigger: false, className: "max-h-72" } as const;

/** Phone and address inputs; submit them with the surrounding form (the selects post hidden inputs) and read them with readContact. */
export function ContactFields({ defaults, disabled }: { defaults?: Contact; disabled?: boolean }) {
  const id = useId();
  const [city, setCity] = useState<Province | null>(() => matchProvince(defaults?.city));
  const [district, setDistrict] = useState<string | null>(() => city && matchDistrict(city, defaults?.district));
  const districts = city ? districtsOf(city) : [];
  return <>
    <Field>
      <FieldLabel htmlFor={`${id}-phone`}>Cep telefonunuz</FieldLabel>
      <Input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} placeholder="0532 123 45 67" disabled={disabled}
        defaultValue={defaults?.phone ? formatPhone(defaults.phone) : ""}
        onBlur={(event) => { const phone = normalizePhone(event.currentTarget.value); if (phone) event.currentTarget.value = formatPhone(phone); }} />
      <FieldDescription>Türkiye cep telefonu numarası.</FieldDescription>
    </Field>
    <div className="grid gap-5 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={`${id}-city`}>İl</FieldLabel>
        <Select name="city" required disabled={disabled} value={city} onValueChange={(value) => { setCity(value); setDistrict(null); }}>
          <SelectTrigger id={`${id}-city`} className="w-full"><SelectValue placeholder="İl seçin" /></SelectTrigger>
          <SelectContent {...listProps}>{provinceOptions.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-district`}>İlçe</FieldLabel>
        <Select key={city ?? ""} name="district" required disabled={disabled || !city} value={district} onValueChange={setDistrict}>
          <SelectTrigger id={`${id}-district`} className="w-full"><SelectValue placeholder={city ? "İlçe seçin" : "Önce il seçin"} /></SelectTrigger>
          <SelectContent {...listProps}>{districts.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    </div>
    <Field>
      <FieldLabel htmlFor={`${id}-address`}>Açık adres</FieldLabel>
      <Textarea id={`${id}-address`} name="address" autoComplete="street-address" required minLength={10} maxLength={250} rows={2} placeholder="Mahalle, cadde/sokak, bina ve daire no" disabled={disabled} defaultValue={defaults?.address ?? ""} />
    </Field>
    <div className="grid gap-5 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={`${id}-postcode`}>Posta kodu <span className="font-normal text-stone">(isteğe bağlı)</span></FieldLabel>
        <Input id={`${id}-postcode`} name="postcode" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" maxLength={5} disabled={disabled} defaultValue={defaults?.postcode ?? ""} />
      </Field>
    </div>
  </>;
}
