"use client";
import { useId, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { ContactFormValues } from "@/lib/auth/profile";
import { districtsOf, matchProvince, provinceOptions } from "@/lib/turkiye";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { SearchableSelect } from "./searchable-select";
import { PhoneInput } from "./phone-input";
import { TextField, TextareaField } from "./form-fields";
import { cn } from "@/lib/utils";

/**
 * Phone and address controls for any React Hook Form whose values include `contact` (see contactFormFields).
 * Render inside <FormProvider>.
 */
export function ContactFields() {
  const id = useId();
  const { control, setValue } = useFormContext<{ contact: ContactFormValues }>();
  const city = matchProvince(useWatch({ control, name: "contact.city" }));
  const [zeroRemoved, setZeroRemoved] = useState(false);
  return <>
    <Controller control={control} name="contact.phone" render={({ field, fieldState }) => (
      <Field data-invalid={fieldState.invalid}>
        <FieldLabel htmlFor={`${id}-phone`}>Cep telefonunuz</FieldLabel>
        <PhoneInput id={`${id}-phone`} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} invalid={fieldState.invalid} onZeroRemoved={setZeroRemoved} />
        <FieldDescription className={cn(zeroRemoved && "text-primary")}>
          {zeroRemoved ? "Baştaki 0 gerekmez, sizin için kaldırdık." : "Numaranızı başında 0 olmadan yazın."}
        </FieldDescription>
        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
      </Field>
    )} />
    <div className="grid gap-5 sm:grid-cols-2">
      <Controller control={control} name="contact.city" render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={`${id}-city`}>İl</FieldLabel>
          <SearchableSelect id={`${id}-city`} items={provinceOptions} value={matchProvince(field.value)} ref={field.ref} onBlur={field.onBlur} invalid={fieldState.invalid}
            onValueChange={(value) => { field.onChange(value ?? ""); setValue("contact.district", ""); }}
            placeholder="İl seçin" searchPlaceholder="İl ara…" emptyText="Bu adla bir il bulunamadı." />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )} />
      <Controller control={control} name="contact.district" render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid && !!city}>
          <FieldLabel htmlFor={`${id}-district`}>İlçe</FieldLabel>
          <SearchableSelect key={city ?? ""} id={`${id}-district`} items={city ? districtsOf(city) : []} value={field.value || null} ref={field.ref} onBlur={field.onBlur} invalid={fieldState.invalid && !!city}
            onValueChange={(value) => field.onChange(value ?? "")} disabled={!city}
            placeholder={city ? "İlçe seçin" : "Önce il seçin"} searchPlaceholder="İlçe ara…" emptyText={`${city ?? ""} içinde bu adla bir ilçe yok.`} />
          {/* Until a province is chosen the province error says it all. */}
          {fieldState.invalid && city && <FieldError errors={[fieldState.error]} />}
        </Field>
      )} />
    </div>
    <TextareaField control={control} name="contact.address" label="Açık adres" autoComplete="street-address" maxLength={250} rows={2} placeholder="Mahalle, cadde/sokak, bina ve daire no" />
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField control={control} name="contact.postcode" label={<>Posta kodu <span className="font-normal text-stone">(isteğe bağlı)</span></>} inputMode="numeric" autoComplete="postal-code" maxLength={5} />
    </div>
  </>;
}
