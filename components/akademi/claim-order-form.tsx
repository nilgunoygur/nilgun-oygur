"use client";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { claimOrder } from "@/app/akademi/hesabim/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormStatus, idleForm } from "@/components/akademi/form-status";

export function ClaimOrderForm() {
  const [attempt, setAttempt] = useState(0);
  return <ClaimAttempt key={attempt} reset={() => setAttempt(value => value + 1)} />;
}

function ClaimAttempt({ reset }: { reset: () => void }) {
  const [state, action, pending] = useActionState(claimOrder, idleForm);
  useEffect(() => { if (state.status === "error") toast.error(state.message); }, [state]);
  return <div>
    {state.status === "success" ? <div className="grid gap-5"><FormStatus state={state} /><Button type="button" variant="outline" onClick={reset}>Başka sipariş ekle</Button></div> :
      <form action={action}><FieldGroup className="gap-6">
        <Field><FieldLabel htmlFor="orderNumber">Shopier sipariş numarası</FieldLabel><Input id="orderNumber" name="orderNumber" inputMode="numeric" autoComplete="off" placeholder="Sipariş numaranızı yazın" required /><FieldDescription>Shopier’in gönderdiği sipariş onay e-postasında yer alır.</FieldDescription></Field>
        <Field><FieldLabel htmlFor="claimEmail">Shopier’de kullandığınız e-posta</FieldLabel><Input id="claimEmail" name="email" type="email" autoComplete="email" placeholder="ornek@eposta.com" required /></Field>
        <div className="flex flex-wrap gap-3"><Button type="submit" disabled={pending}>{pending ? "Shopier’de kontrol ediliyor…" : "Siparişimi doğrula ve ekle"}</Button>{state.status === "error" && <Button type="button" variant="outline" onClick={reset}>Temizle ve tekrar dene</Button>}</div>
      </FieldGroup></form>}
  </div>;
}
