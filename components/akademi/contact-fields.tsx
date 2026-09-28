"use client";
import { useId, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { ContactFormValues } from "@/lib/auth/contact";
import { districtsOf, matchProvince, provinceOptions } from "@/lib/turkiye";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { SearchableSelect } from "./searchable-select";
import { PhoneInput } from "./phone-input";
import { ControlledField, TextField, TextareaField } from "./form-fields";
import { cn } from "@/lib/utils";

export function ContactFields() {
  const id = useId();
  const { control, setValue } = useFormContext<{ contact: ContactFormValues }>();
  const city = matchProvince(useWatch({ control, name: "contact.city" }));
  const [zeroRemoved, setZeroRemoved] = useState(false);
  return <>
    <ControlledField control={control} name="contact.phone" label="Cep telefonunuz"
      description={<span className={cn(zeroRemoved && "text-primary")}>{zeroRemoved ? "Baştaki 0 gerekmez, sizin için kaldırdık." : "Numaranızı başında 0 olmadan yazın."}</span>}>
      {(field, fieldId, invalid) => <PhoneInput id={fieldId} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} invalid={invalid} onZeroRemoved={setZeroRemoved} />}
    </ControlledField>
    <div className="grid gap-5 sm:grid-cols-2">
      <ControlledField control={control} name="contact.city" label="İl">
        {(field, fieldId, invalid) => <SearchableSelect id={fieldId} items={provinceOptions} value={city} ref={field.ref} onBlur={field.onBlur} invalid={invalid}
          onValueChange={(value) => { field.onChange(value ?? ""); setValue("contact.district", ""); }}
          placeholder="İl seçin" searchPlaceholder="İl ara…" emptyText="Bu adla bir il bulunamadı." />}
      </ControlledField>
      <Controller control={control} name="contact.district" render={({ field, fieldState }) => {
        // No district error until a province is chosen.
        const invalid = fieldState.invalid && !!city;
        return <Field data-invalid={invalid}>
          <FieldLabel htmlFor={`${id}-district`}>İlçe</FieldLabel>
          <SearchableSelect key={city ?? ""} id={`${id}-district`} items={city ? districtsOf(city) : []} value={field.value || null} ref={field.ref} onBlur={field.onBlur} invalid={invalid}
            onValueChange={(value) => field.onChange(value ?? "")} disabled={!city}
            placeholder={city ? "İlçe seçin" : "Önce il seçin"} searchPlaceholder="İlçe ara…" emptyText={`${city ?? ""} içinde bu adla bir ilçe yok.`} />
          {invalid && <FieldError errors={[fieldState.error]} />}
        </Field>;
      }} />
    </div>
    <TextareaField control={control} name="contact.address" label="Açık adres" autoComplete="street-address" maxLength={250} rows={2} placeholder="Mahalle, cadde/sokak, bina ve daire no" />
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField control={control} name="contact.postcode" label={<>Posta kodu <span className="font-normal text-stone">(isteğe bağlı)</span></>} inputMode="numeric" autoComplete="postal-code" maxLength={5} />
    </div>
  </>;
}
