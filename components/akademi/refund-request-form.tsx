"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { requestRefund } from "@/app/akademi/hesabim/actions";
import { refundRequestSchema } from "@/lib/akademi/claim-schema";
import { FormMessage, FormShell, SubmitButton, submitAction, TextareaField } from "./form-fields";

export function RefundRequestForm({ courseId }: { courseId: string }) {
  const form = useForm({ resolver: zodResolver(refundRequestSchema), mode: "onTouched", defaultValues: { reason: "" } });
  // On success the action refreshes the page, which then shows the request's status instead of this form.
  const submit = form.handleSubmit(values => submitAction(form, () => requestRefund(courseId, values), "İade talebi şu anda alınamıyor. Lütfen biraz sonra yeniden deneyin."));

  return <FormShell form={form} onSubmit={submit}>
    <TextareaField control={form.control} name="reason" label="İade nedeniniz" rows={4} maxLength={1000}
      description="Talebiniz incelenir. Onaylanırsa ödemeniz Shopier üzerinden iade edilir ve eğitim erişiminiz kapanır." />
    <FormMessage />
    <div><SubmitButton variant="outline" pendingLabel="Gönderiliyor…">İade talebi gönder</SubmitButton></div>
  </FormShell>;
}
