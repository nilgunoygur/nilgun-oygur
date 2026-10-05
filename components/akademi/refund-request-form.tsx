"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { accountQueryRoot } from "@/lib/akademi/account-query";
import { requestRefund } from "@/app/akademi/hesabim/actions";
import { refundRequestSchema } from "@/lib/akademi/claim-schema";
import { FormMessage, FormShell, SubmitButton, submitAction, TextareaField } from "./form-fields";

export function RefundRequestForm({ courseId }: { courseId: string }) {
  const form = useForm({ resolver: zodResolver(refundRequestSchema), mode: "onTouched", defaultValues: { reason: "" } });
  const client = useQueryClient();
  // No success state: the action's refresh replaces this form, and the header menu picks up the new notice.
  const submit = form.handleSubmit(async values => {
    if (await submitAction(form, () => requestRefund(courseId, values), "İade talebi şu anda alınamıyor. Lütfen biraz sonra yeniden deneyin.")) void client.invalidateQueries({ queryKey: accountQueryRoot });
  });

  return <FormShell form={form} onSubmit={submit}>
    <TextareaField control={form.control} name="reason" label="İade nedeniniz" rows={4} maxLength={1000}
      description="Talebi gönderdiğinizde tüm derslere erişiminiz durdurulur. Talep reddedilirse erişiminiz yeniden açılır; onaylanırsa eğitim hesabınızdan kaldırılır ve ödemeniz Shopier üzerinden iade edilir." />
    <FormMessage />
    <div><SubmitButton variant="outline" pendingLabel="Gönderiliyor…">İade talebi gönder</SubmitButton></div>
  </FormShell>;
}
