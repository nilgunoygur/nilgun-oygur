"use client";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
export function DemoCheckout({ slug }: { slug: string }) {
  const [complete,setComplete] = useState(false);
  if (complete) return <div className="academy-demo-complete" role="status"><CheckCircle2 size={38} /><h2>Demo tamamlandı.</h2><p>Gerçek bir sipariş veya eğitim erişimi oluşturulmadı. Canlı sistemde ödeme onayından sonra eğitiminize hesabınızdan ulaşabileceksiniz.</p><Link href="/akademi/giris" className={buttonVariants({size:"pill"})}>Öğrenci girişine git</Link><Link href={`/akademi/${slug}`} className="academy-text-link">Eğitime dön</Link></div>;
  return <div className="academy-demo-complete"><p>Ödeme bilgisi girmenize gerek yok. Bu adım yalnızca satın alma deneyimini göstermek içindir.</p><Button size="hero" onClick={()=>setComplete(true)}>Demo satın almayı tamamla</Button><Link href={`/akademi/${slug}`} className="academy-text-link">Eğitime dön</Link></div>;
}
