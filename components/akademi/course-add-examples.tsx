import { ArrowUpRight, BookOpen, Check, Mail, ShoppingBag } from "lucide-react";

type Example = "purchase" | "account" | "claim" | "course";
const sampleOrder = "123456789";
const sampleEmail = "ogrenci@example.com";
const field = "mt-2 rounded-xl border border-forest/20 bg-white px-4 py-3 text-sm text-forest";

export function CourseAddExample({ kind }: { kind: Example }) {
  return <figure className="mt-5 overflow-hidden rounded-[18px] border border-forest/15 bg-mist">
    <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-forest/10 px-4 py-3 text-[11px] font-medium text-stone sm:px-5"><span>GÖRSEL REHBER · TEMSİLİ ÖRNEK</span><span>Bilgiler size ait değildir.</span></figcaption>
    <div className="p-4 sm:p-5">
      {kind === "purchase" && <>
        <p className="mb-4 flex items-center gap-2 text-sm font-medium text-forest"><ShoppingBag className="size-4" aria-hidden="true" /> Shopier sipariş onayınız</p>
        <div className="grid gap-3 rounded-xl bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-forest/60 bg-mist px-3 py-3"><span className="text-sm">Sipariş numarası</span><strong className="font-mono text-base text-forest">#{sampleOrder}</strong></div>
          <p className="text-xs leading-relaxed text-stone">Bu numarayı sipariş ekleme formuna yazın. Başındaki # işaretini de yapıştırabilirsiniz.</p>
          <p className="break-all text-sm text-stone">Satın alma e-postası: <span className="text-forest">{sampleEmail}</span></p>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-stone">Shopier’in e-posta tasarımı farklı olabilir. Sipariş numaranızı kendi onay e-postanızda bulun.</p>
      </>}
      {kind === "account" && <>
        <p className="mb-4 flex items-center gap-2 text-sm font-medium text-forest"><Mail className="size-4" aria-hidden="true" /> Akademi hesabınız</p>
        <div className="rounded-xl bg-white p-4"><p className="text-xs text-stone">Kayıt olurken kullanacağınız e-posta</p><p className={`${field} break-all`}>{sampleEmail}</p><div className="mt-4 flex items-start gap-2 text-sm leading-relaxed"><Check className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden="true" /><p>Doğrulama e-postasındaki bağlantıya tıklayın. Ardından Akademi’ye giriş yapın.</p></div></div>
        <p className="mt-3 text-xs leading-relaxed text-stone">Aynı e-posta, siparişin hesabınıza otomatik bağlanmasını sağlar. Mevcut hesabınız farklı bir e-posta kullanıyorsa siparişinizi ekleyebilirsiniz.</p>
      </>}
      {kind === "claim" && <>
        <p className="mb-4 text-sm font-medium text-forest">Shopier siparişinizi ekleyin</p>
        <div className="grid gap-4 rounded-xl bg-white p-4">
          <div><p className="flex items-center gap-2 text-xs font-medium text-forest"><span className="grid size-5 place-items-center rounded-full bg-forest text-[10px] text-white">1</span>Shopier sipariş numarası</p><p className={`${field} font-mono`}>{sampleOrder}</p></div>
          <div><p className="flex items-center gap-2 text-xs font-medium text-forest"><span className="grid size-5 place-items-center rounded-full bg-forest text-[10px] text-white">2</span>Shopier’de kullandığınız e-posta</p><p className={`${field} break-all`}>{sampleEmail}</p></div>
          <p className="rounded-full bg-forest px-4 py-3 text-center text-xs font-medium text-white">Siparişimi doğrula ve ekle</p>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-stone">Üst alana sipariş numarası, alt alana satın alma e-postası gelir. Örnekteki bilgileri kullanmayın.</p>
      </>}
      {kind === "course" && <>
        <p className="mb-4 flex items-center gap-2 text-sm font-medium text-forest"><BookOpen className="size-4" aria-hidden="true" /> Hesabım → Eğitimlerim</p>
        <div className="rounded-xl bg-white p-5"><span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-xs text-forest"><Check className="size-3" aria-hidden="true" /> Erişiminiz aktif</span><p className="mt-4 text-xl font-semibold text-forest">Satın aldığınız eğitim</p><p className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest px-4 py-3 text-xs font-medium text-white">Eğitime devam et <ArrowUpRight className="size-3.5" aria-hidden="true" /></p></div>
        <p className="mt-3 text-xs leading-relaxed text-stone">Eğitim kartındaki “Eğitime devam et” düğmesi derslerinizi açar.</p>
      </>}
    </div>
  </figure>;
}
