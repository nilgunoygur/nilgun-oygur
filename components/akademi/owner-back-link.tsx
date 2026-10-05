import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { backLink } from "@/lib/styles";

export function OwnerBackLink({ href = "/yonetim", children = "Genel bakış" }: { href?: string; children?: React.ReactNode }) {
  return <Link href={href} className={backLink}><ArrowLeft className="size-4" /> {children}</Link>;
}
