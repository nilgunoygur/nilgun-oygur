import { Undo2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { RefundStatus } from "@/lib/akademi/owner-forms";

export const refundNoticeCopy = {
  pending: { title: "İade talebiniz inceleniyor", message: "Talebiniz sonuçlanana kadar bu eğitimin dersleri, kayıtları, canlı katılım bağlantıları ve materyalleri kapalıdır." },
  approved: { title: "İade talebiniz onaylandı", message: "Bu eğitim hesabınızdan kaldırıldı. Ödeme iadenizin durumu Shopier tarafından bildirilir." },
  declined: { title: "İade talebiniz reddedildi", message: "Erişim süreniz devam ediyorsa eğitiminize kaldığınız yerden devam edebilirsiniz." },
};

export function RefundNotice({ status, note, course, orderId }: { status: RefundStatus; note?: string | null; course?: string; orderId?: string }) {
  const copy = refundNoticeCopy[status];
  return <Alert><Undo2 /><AlertTitle>{copy.title}</AlertTitle><AlertDescription>{course && <p className="font-medium">{course}{orderId && ` · Sipariş #${orderId}`}</p>}<p>{copy.message}</p>{note && <p className="whitespace-pre-wrap break-words">Yanıt: {note}</p>}</AlertDescription></Alert>;
}
