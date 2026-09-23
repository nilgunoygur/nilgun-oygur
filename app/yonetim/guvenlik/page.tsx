import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ownerPage } from "@/lib/auth/viewer";

export const metadata = { title: "Yönetim" };
export default function SecurityPage() {
  return <Suspense fallback={null}><ContinueToOwner /></Suspense>;
}
async function ContinueToOwner() {
  await ownerPage();
  return redirect("/yonetim");
}
