"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatMoney } from "@/lib/akademi/format";
import { decideOwnerRefundRequest, ownerQueryKeys, type OwnerCatalogSnapshot, type OwnerRefundRequest } from "@/lib/akademi/owner-queries";
import { refundApprovalSchema } from "@/lib/akademi/owner-forms";
import { DialogFooter } from "@/components/ui/dialog";
import { FormMessage, FormShell, SubmitButton, TextField, TextareaField } from "./form-fields";
const lira = (kurus: number) => (kurus / 100).toFixed(2).replace(/\.00$/, "");
/** A decline ignores the amount. */
export function RefundDecisionForm({ request, approve, onDone }: { request: OwnerRefundRequest; approve: boolean; onDone: () => void }) {
  const client = useQueryClient();
  const form = useForm({ resolver: zodResolver(refundApprovalSchema), mode: "onTouched", defaultValues: { amount: lira(request.amountKurus), note: "" } });
  const decide = useMutation({
    mutationFn: ({ amount, note }: { amount: number; note: string }) => decideOwnerRefundRequest(request.id, approve ? { decision: "approve", amount, note } : { decision: "decline", note }),
    onSuccess: () => {
      client.setQueryData<OwnerCatalogSnapshot>(ownerQueryKeys.catalog(), current => current && { ...current, refundRequests: current.refundRequests.filter(item => item.id !== request.id) });
      toast.success(approve ? "İade Shopier’e gönderildi." : "İade talebi reddedildi."); onDone();
    },
    onError: error => form.setError("root", { message: error.message }),
    onSettled: () => client.invalidateQueries({ queryKey: ownerQueryKeys.all }),
  });
  return <FormShell form={form} onSubmit={form.handleSubmit(values => decide.mutateAsync(values).catch(() => undefined))}>
    {approve && <TextField control={form.control} name="amount" label="İade tutarı (₺)" type="number" inputMode="decimal" step="0.01" min={1}
      description={`Bu eğitim için ödenen: ${formatMoney(request.amountKurus, request.currency)}. Daha düşük bir tutar kısmi iade olur ve erişimi kapatmaz.`} />}
    <TextareaField control={form.control} name="note" label={approve ? "Alıcıya not (isteğe bağlı)" : "Ret nedeni (öğrenci görür)"} rows={3} maxLength={500} />
    <FormMessage />
    <DialogFooter><SubmitButton variant={approve ? "destructive" : "default"} pendingLabel={approve ? "Shopier’e gönderiliyor…" : "Kaydediliyor…"}>{approve ? "Parayı iade et" : "Talebi reddet"}</SubmitButton></DialogFooter>
  </FormShell>;
}

