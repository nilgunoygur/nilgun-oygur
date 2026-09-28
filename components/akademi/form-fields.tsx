"use client";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Controller, type Control, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

// shadcn's React Hook Form pattern (Controller → Field → FieldLabel/FieldDescription/FieldError) for the common inputs.
// Disable a whole form while it submits with <fieldset disabled>, not per input.

type Controlled<T extends FieldValues, U> = { control: Control<T, unknown, U>; name: FieldPath<T>; label: ReactNode; description?: ReactNode };
type Managed = "name" | "value" | "defaultValue" | "onChange" | "onBlur";

export function TextField<T extends FieldValues, U = T>({ control, name, label, description, ...input }: Controlled<T, U> & Omit<ComponentProps<typeof Input>, Managed>) {
  const id = useId();
  return <Controller control={control} name={name} render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input {...field} {...input} value={field.value ?? ""} id={id} aria-invalid={fieldState.invalid} />
      {description && <FieldDescription>{description}</FieldDescription>}
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )} />;
}

export function TextareaField<T extends FieldValues, U = T>({ control, name, label, description, ...input }: Controlled<T, U> & Omit<ComponentProps<typeof Textarea>, Managed>) {
  const id = useId();
  return <Controller control={control} name={name} render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea {...field} {...input} value={field.value ?? ""} id={id} aria-invalid={fieldState.invalid} />
      {description && <FieldDescription>{description}</FieldDescription>}
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )} />;
}

/** A password input with a show/hide toggle inside the field. */
export function PasswordField<T extends FieldValues, U = T>({ control, name, label, description, autoComplete }: Controlled<T, U> & { autoComplete: "current-password" | "new-password" }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return <Controller control={control} name={name} render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput {...field} value={field.value ?? ""} id={id} type={visible ? "text" : "password"} autoComplete={autoComplete} maxLength={128} aria-invalid={fieldState.invalid} />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-sm" className="rounded-md" onClick={() => setVisible(value => !value)} aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={visible}>
            {visible ? <EyeOff /> : <Eye />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )} />;
}

/** Server-side failures set with form.setError("root", …). */
export function FormRootError<T extends FieldValues, C, U>({ form }: { form: UseFormReturn<T, C, U> }) {
  const message = form.formState.errors.root?.message;
  return message ? <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert> : null;
}
