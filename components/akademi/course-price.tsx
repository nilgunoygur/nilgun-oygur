import { formatPrice } from "@/lib/akademi/catalog";

export function CoursePrice({ priceKurus, compareAtPriceKurus, className }: { priceKurus: number; compareAtPriceKurus: number | null; className?: string }) {
  const discount = compareAtPriceKurus ? Math.round((1 - priceKurus / compareAtPriceKurus) * 100) : 0;
  return <span className="course-price">
    <strong className={className}>{formatPrice(priceKurus)}</strong>
    {compareAtPriceKurus && discount > 0 && <>
      <del><span className="sr-only">İndirimsiz fiyat: </span>{formatPrice(compareAtPriceKurus)}</del>
      <span className="course-price-badge">%{discount} indirim</span>
    </>}
  </span>;
}
