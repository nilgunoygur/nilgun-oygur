"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatMoney, liraInput } from "@/lib/akademi/format";
import { decideOwnerRefundRequest, ownerQueryKeys, type OwnerRefundList } from "@/lib/akademi/owner-queries";
import { refundDecisionSchema, type RefundDecisionInput } from "@/lib/akademi/owner-forms";
import { DialogFooter } from "@/components/ui/dialog";
import { FormMessage, FormShell, SubmitButton, TextField, TextareaField } from "./form-fields";

export function RefundDecisionForm({ request, approve, onDone }: { request: OwnerRefundList["items"][number]; approve: boolean; onDone: () => void }) {
  const client = useQueryClient();
  const form = useForm({ resolver: zodResolver(refundDecisionSchema), mode: "onTouched",
    defaultValues: approve ? { decision: "approve", amount: liraInput(request.amountKurus), note: "" } : { decision: "decline", note: "" } });
  const decide = useMutation({
    mutationFn: (decision: RefundDecisionInput) => decideOwnerRefundRequest(request.id, decision),
    onSuccess: () => { toast.success(approve ? "İade Shopier’e gönderildi." : "İade talebi reddedildi."); onDone(); },
    onError: error => form.setError("root", { message: error.message }),
    onSettled: () => Promise.all([ownerQueryKeys.refundRequests(), ownerQueryKeys.catalog()].map(queryKey => client.invalidateQueries({ queryKey }))),
  });
  return <FormShell form={form} onSubmit={form.handleSubmit(values => decide.mutateAsync(values).catch(() => undefined))}>
    {approve && <TextField control={form.control} name="amount" label="İade tutarı (₺)" type="number" inputMode="decimal" step="0.01" min={1}
      description={`Bu eğitim için ödenen: ${formatMoney(request.amountKurus, request.currency)}. Onayladığınızda eğitim öğrencinin hesabından kaldırılır. Daha düşük bir tutar kısmi ödeme iadesidir.`} />}
    <TextareaField control={form.control} name="note" label={approve ? "Alıcıya not (isteğe bağlı)" : "Ret nedeni (öğrenci görür)"} rows={3} maxLength={500} />
    <FormMessage />
    <DialogFooter className="mt-2 gap-3"><SubmitButton variant={approve ? "destructive" : "default"} pendingLabel={approve ? "Shopier’e gönderiliyor…" : "Kaydediliyor…"}>{approve ? "Parayı iade et" : "Talebi reddet"}</SubmitButton></DialogFooter>
  </FormShell>;
}

