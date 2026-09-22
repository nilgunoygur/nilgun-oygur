import { formatPrice } from "@/lib/akademi/format";
import { cn } from "@/lib/utils";

export function CoursePrice({ priceKurus, compareAtPriceKurus, className, priceClassName, large = false }: {
  priceKurus: number;
  compareAtPriceKurus: number | null;
  className?: string;
  priceClassName?: string;
  large?: boolean;
}) {
  const discount = compareAtPriceKurus ? Math.round((1 - priceKurus / compareAtPriceKurus) * 100) : 0;
  return <span className={cn("flex flex-wrap items-baseline gap-x-[10px] gap-y-1", className)}>
    <strong className={priceClassName}>{formatPrice(priceKurus)}</strong>
    {compareAtPriceKurus && discount > 0 && <>
      <del className={cn("text-[17px] text-[#7a7a74]", large && "text-[22px]")}><span className="sr-only">İndirimsiz fiyat: </span>{formatPrice(compareAtPriceKurus)}</del>
      <span className="self-center rounded-[99px] bg-forest px-[9px] py-[3px] text-[12px] font-semibold whitespace-nowrap text-lime">%{discount} indirim</span>
    </>}
  </span>;
}
