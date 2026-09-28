"use client";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Controller, type Control, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { authErrorMessage } from "@/lib/auth/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FormState } from "./form-status";

// shadcn's Controller → Field pattern for the common inputs; forms disable themselves with <fieldset disabled>.

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

export function SelectField<T extends FieldValues, U = T>({ control, name, label, description, options, disabled, className }: Controlled<T, U> & { options: Record<string, string>; disabled?: boolean; className?: string }) {
  const id = useId();
  return <Controller control={control} name={name} render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select items={options} value={field.value} onValueChange={field.onChange} disabled={disabled}>
        <SelectTrigger id={id} ref={field.ref} className={className ?? "h-11 w-full"} aria-invalid={fieldState.invalid}><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(options).map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )} />;
}

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

export function FormRootError<T extends FieldValues, C, U>({ form }: { form: UseFormReturn<T, C, U> }) {
  const message = form.formState.errors.root?.message;
  return message ? <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert> : null;
}

type RootErrors = { setError: (name: "root", error: { message: string }) => void };

/** Runs a server action; an error result or a throw becomes the root error. Returns the success state, or null. */
export async function submitAction(form: RootErrors, action: () => Promise<FormState>, fallback: string): Promise<FormState | null> {
  try {
    const result = await action();
    if (result.status !== "error") return result;
    form.setError("root", { message: result.message });
  } catch { form.setError("root", { message: fallback }); }
  return null;
}

/** Runs a Better Auth call; an error or a network failure becomes the root error. Returns { data } on success, or null. */
export async function authAttempt<D>(form: RootErrors, call: () => Promise<{ data: D | null; error: { code?: string; status?: number } | null }>): Promise<{ data: D | null } | null> {
  try {
    const { data, error } = await call();
    if (!error) return { data };
    form.setError("root", { message: authErrorMessage(error) });
  } catch { form.setError("root", { message: "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip yeniden deneyin." }); }
  return null;
}
