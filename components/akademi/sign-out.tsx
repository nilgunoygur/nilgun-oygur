"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export function SignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return <div className="flex flex-col gap-2"><Button variant="outline" size="pill" disabled={pending} onClick={async () => {
    setPending(true); setError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) { setError(true); return; }
      router.replace("/akademi/giris"); router.refresh();
    } catch { setError(true); } finally { setPending(false); }
  }}>{pending ? "Çıkış yapılıyor…" : "Çıkış yap"}</Button>{error && <span role="alert">Çıkış yapılamadı. Yeniden deneyin.</span>}</div>;
}
