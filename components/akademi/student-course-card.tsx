import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/** A course in the student's list; `children` sit beside the action. */
export function StudentCourseCard({ href, title, image, badge, action, children }: { href: string; title: string; image: string; badge?: React.ReactNode; action: string; children?: React.ReactNode }) {
  return <article className="flex min-w-0 flex-col rounded-[24px] border border-[#e1e8dc] bg-white p-[10px] shadow-[0_6px_25px_#19392f08]">
    <Link href={href} aria-label={`${title} eğitimine devam et`} className="group relative block aspect-[1.65] overflow-hidden rounded-[17px] bg-mist">
      <Image src={image} alt="" fill sizes="(max-width: 760px) 90vw, (max-width: 1280px) 46vw, 590px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
      {badge && <span className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-forest px-3 py-2 text-xs font-semibold text-white shadow-sm">{badge}</span>}
    </Link>
    <div className="flex flex-1 flex-col px-[18px] pt-6 pb-[18px] max-tablet:px-[10px]">
      <p className="mb-3 text-[10px] font-semibold tracking-[1.6px] text-stone">EĞİTİMİNİZ</p>
      <h2 className="mb-5 text-[28px] leading-snug max-tablet:text-[25px]"><Link href={href}>{title}</Link></h2>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-5 border-t border-border pt-5">
        {children}
        <Link className={buttonVariants({ size: "pill", className: "min-h-11 bg-forest hover:bg-forest/90" })} href={href}>{action} <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div>
    </div>
  </article>;
}
