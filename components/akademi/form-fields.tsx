"use client";
import { useId, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { Controller, FormProvider, useFormState, type Control, type ControllerRenderProps, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { authErrorMessage } from "@/lib/auth/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FormStatus, type FormState } from "./form-status";

// shadcn's React Hook Form pattern: every form is a FormShell of Controller → Field fields.

// Sets --control-h, which Input, InputGroup, Select and the pickers read.
const controlHeights = { sm: "[--control-h:2rem]", md: "[--control-h:2.75rem]", lg: "[--control-h:3rem]" };

/** Disables every field while submitting or `busy`. */
export function FormShell<T extends FieldValues, C, U>({ form, onSubmit, size = "md", busy, disabled, id, className, fieldsClassName, children }: {
  form: UseFormReturn<T, C, U>; onSubmit: (event: FormEvent<HTMLFormElement>) => void; size?: keyof typeof controlHeights;
  busy?: boolean; disabled?: boolean; id?: string; className?: string; fieldsClassName?: string; children: ReactNode;
}) {
  const pending = form.formState.isSubmitting || !!busy;
  // stopPropagation: React bubbles a portaled form's submit into the form around it.
  return <FormProvider {...form}><form id={id} className={cn(controlHeights[size], className)} onSubmit={event => { event.stopPropagation(); onSubmit(event); }} noValidate aria-busy={pending}>
    <fieldset disabled={pending || disabled} className="contents"><FieldGroup className={fieldsClassName}>{children}</FieldGroup></fieldset>
  </form></FormProvider>;
}

/** Relabelled with a spinner while its form submits or `busy`. */
export function SubmitButton({ children, pendingLabel = "Kaydediliyor…", busy, ...button }: ComponentProps<typeof Button> & { pendingLabel?: string; busy?: boolean }) {
  const { isSubmitting } = useFormState();
  return <Button type="submit" {...button}>
    {isSubmitting || busy ? <><LoaderCircle data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />{pendingLabel}</> : children}
  </Button>;
}

/** The root error from submitAction or authAttempt, otherwise `status`. */
export function FormMessage({ status }: { status?: FormState }) {
  const message = useFormState().errors.root?.message;
  if (message) return <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>;
  return status ? <FormStatus state={status} /> : null;
}

type Controlled<T extends FieldValues, U> = { control: Control<T, unknown, U>; name: FieldPath<T>; label: ReactNode; description?: ReactNode };
type Managed = "name" | "value" | "defaultValue" | "onChange" | "onBlur";

/** Controller → Field with label, description and error around any control. */
export function ControlledField<T extends FieldValues, U = T>({ control, name, label, description, className, children }: Controlled<T, U> & {
  className?: string; children: (field: ControllerRenderProps<T, FieldPath<T>>, id: string, invalid: boolean) => ReactNode;
}) {
  const id = useId();
  return <Controller control={control} name={name} render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children(field, id, fieldState.invalid)}
      {description && <FieldDescription>{description}</FieldDescription>}
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )} />;
}

export function TextField<T extends FieldValues, U = T>({ control, name, label, description, ...input }: Controlled<T, U> & Omit<ComponentProps<typeof Input>, Managed>) {
  return <ControlledField control={control} name={name} label={label} description={description}>
    {(field, id, invalid) => <Input {...field} {...input} value={field.value ?? ""} id={id} aria-invalid={invalid} />}
  </ControlledField>;
}

export function TextareaField<T extends FieldValues, U = T>({ control, name, label, description, ...input }: Controlled<T, U> & Omit<ComponentProps<typeof Textarea>, Managed>) {
  return <ControlledField control={control} name={name} label={label} description={description}>
    {(field, id, invalid) => <Textarea {...field} {...input} value={field.value ?? ""} id={id} aria-invalid={invalid} />}
  </ControlledField>;
}

export function SelectField<T extends FieldValues, U = T>({ options, disabled, className, ...frame }: Controlled<T, U> & { options: Record<string, string>; disabled?: boolean; className?: string }) {
  return <ControlledField {...frame}>
    {(field, id, invalid) => <Select items={options} value={field.value} onValueChange={field.onChange} disabled={disabled}>
      <SelectTrigger id={id} ref={field.ref} className={cn("w-full", className)} aria-invalid={invalid}><SelectValue /></SelectTrigger>
      <SelectContent>{Object.entries(options).map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent>
    </Select>}
  </ControlledField>;
}

export function PasswordField<T extends FieldValues, U = T>({ autoComplete, ...frame }: Controlled<T, U> & { autoComplete: "current-password" | "new-password" }) {
  const [visible, setVisible] = useState(false);
  return <ControlledField {...frame}>
    {(field, id, invalid) => <InputGroup>
      <InputGroupInput {...field} value={field.value ?? ""} id={id} type={visible ? "text" : "password"} autoComplete={autoComplete} maxLength={128} aria-invalid={invalid} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-sm" className="rounded-md" onClick={() => setVisible(value => !value)} aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={visible}>
          {visible ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>}
  </ControlledField>;
}

type RootErrors = { setError: (name: "root", error: { message: string }) => void };

/** Error results and throws become the root error; returns the result, or null. */
export async function submitAction(form: RootErrors, action: () => Promise<FormState>, fallback: string): Promise<FormState | null> {
  try {
    const result = await action();
    if (result.status !== "error") return result;
    form.setError("root", { message: result.message });
  } catch { form.setError("root", { message: fallback }); }
  return null;
}

/** Auth and network errors become the root error; returns { data }, or null. */
export async function authAttempt<D>(form: RootErrors, call: () => Promise<{ data: D | null; error: { code?: string; status?: number } | null }>): Promise<{ data: D | null } | null> {
  try {
    const { data, error } = await call();
    if (!error) return { data };
    form.setError("root", { message: authErrorMessage(error) });
  } catch { form.setError("root", { message: "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip yeniden deneyin." }); }
  return null;
}
