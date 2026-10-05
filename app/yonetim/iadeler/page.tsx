import { Suspense } from "react";
import { ownerPage } from "@/lib/auth/viewer";
import { akademi } from "@/lib/akademi/server";
import { OwnerRefundManagement } from "@/components/akademi/owner-refund-management";
import { pageWidth, ownerSection, accountTitle, kicker } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata = { title: "İade talepleri" };
export default function Refunds() {
  return <section className={cn(pageWidth, ownerSection)}><Suspense fallback={<p className="py-16 text-muted-foreground">İade talepleri yükleniyor…</p>}><Content /></Suspense></section>;
}
async function Content() {
  await ownerPage();
  const initialData = await akademi().owner.refundRequests({ status: "pending" });
  return <><header className="mb-8"><p className={kicker}>AKADEMİ YÖNETİMİ</p><h1 className={accountTitle}>İade talepleri</h1><p className="mt-3 max-w-2xl text-muted-foreground">Talepleri inceleyin, onaylayın veya reddedin. Kararlar ve Shopier’e gönderilen iadeler burada kayıtlı kalır.</p></header><OwnerRefundManagement initialData={initialData} /></>;
}
