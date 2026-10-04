"use client";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { requestRefund } from "@/app/akademi/hesabim/actions";
import { refundRequestSchema } from "@/lib/akademi/claim-schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormMessage, FormShell, SubmitButton, submitAction, TextareaField } from "./form-fields";

export function RefundRequestForm({ courseId }: { courseId: string }) {
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(refundRequestSchema), mode: "onTouched", defaultValues: { reason: "" } });
  const submit = form.handleSubmit(async (values) => {
    const result = await submitAction(form, () => requestRefund(courseId, values), "İade talebi şu anda alınamıyor. Lütfen biraz sonra yeniden deneyin.");
    if (result) setSent(result.message);
  });
  if (sent) return <div role="status"><Alert><AlertDescription>{sent}</AlertDescription></Alert></div>;

  return <FormShell form={form} onSubmit={submit}>
    <TextareaField control={form.control} name="reason" label="İade nedeniniz" rows={4} maxLength={1000}
      description="Talebiniz incelenir. Onaylanırsa ödemeniz Shopier üzerinden iade edilir ve eğitim erişiminiz kapanır." />
    <FormMessage />
    <div><SubmitButton variant="outline" pendingLabel="Gönderiliyor…">İade talebi gönder</SubmitButton></div>
  </FormShell>;
}
