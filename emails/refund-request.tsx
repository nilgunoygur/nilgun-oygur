import { Text } from "react-email";
import { ActionButton, EmailLayout, MessagePanel, text } from "./_components/layout.tsx";

export type RefundRequestEmailProps = { requestId: string; name: string; email: string; course: string; orderId: string; amount: string; reason: string; siteUrl: string };
export function refundRequestText(p: RefundRequestEmailProps) {
  return `Yeni iade talebi\n\nÖğrenci: ${p.name}\nE-posta: ${p.email}\nEğitim: ${p.course}\nShopier siparişi: ${p.orderId}\nÖdenen tutar: ${p.amount}\n\nTalep nedeni:\n${p.reason}\n\nTalebi inceleyin: ${p.siteUrl}/yonetim/iadeler\nTalep: ${p.requestId}`;
}
export default function RefundRequestEmail(p: RefundRequestEmailProps) {
  return <EmailLayout siteUrl={p.siteUrl} preview={`${p.name} · ${p.course}`} hero={{ file: "contact.jpg", alt: "" }} headerLink={{ label: "İade talepleri", href: `${p.siteUrl}/yonetim/iadeler` }} kicker="AKADEMİ YÖNETİMİ" title={["Yeni bir iade", "talebi var."]} footnote="Bu bildirim öğrencinin iade talebi üzerine gönderildi.">
    <Text style={text}>{p.name} ({p.email})<br />{p.course}<br />Sipariş #{p.orderId} · {p.amount}</Text>
    <MessagePanel>{p.reason}</MessagePanel>
    <ActionButton href={`${p.siteUrl}/yonetim/iadeler`}>Talebi incele</ActionButton>
  </EmailLayout>;
}
