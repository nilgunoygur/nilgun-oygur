import { Suspense } from "react";
import { ownerPage } from "@/lib/auth/viewer";
import { ownerRefundList } from "@/lib/akademi/server";
import { OwnerRefundManagement } from "@/components/akademi/owner-refund-management";
import { pageWidth, ownerSection, accountTitle, kicker } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/spinner";
import { OwnerBackLink } from "@/components/akademi/owner-back-link";

export const metadata = { title: "İade talepleri" };
export default function Refunds() {
  return <section className={cn(pageWidth, ownerSection)}><Suspense fallback={<PageLoader label="İade talepleri yükleniyor" />}><Content /></Suspense></section>;
}
async function Content() {
  await ownerPage();
  const initialData = await ownerRefundList({ status: "pending" });
  return <><OwnerBackLink /><header className="mb-8"><p className={kicker}>AKADEMİ YÖNETİMİ</p><h1 className={accountTitle}>İade talepleri</h1><p className="mt-3 max-w-2xl text-muted-foreground">Talepleri inceleyin, onaylayın veya reddedin. Kararlar ve Shopier’e gönderilen iadeler burada kayıtlı kalır.</p></header><OwnerRefundManagement initialData={initialData} /></>;
}
