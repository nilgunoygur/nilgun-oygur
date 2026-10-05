import { Section, Text } from "react-email";
import { ActionButton, EmailLayout, colors, text } from "./_components/layout.tsx";

export type RefundRequestEmailProps = { requestId: string; name: string; email: string; course: string; orderId: string; amount: string; reason: string; siteUrl: string };
export function refundRequestText(p: RefundRequestEmailProps) {
  return `Yeni iade talebi\n\nÖğrenci: ${p.name}\nE-posta: ${p.email}\nEğitim: ${p.course}\nShopier siparişi: ${p.orderId}\nÖdenen tutar: ${p.amount}\n\nTalep nedeni:\n${p.reason}\n\nTalebi inceleyin: ${p.siteUrl}/yonetim/iadeler\nTalep: ${p.requestId}`;
}
export default function RefundRequestEmail(p: RefundRequestEmailProps) {
  return <EmailLayout siteUrl={p.siteUrl} preview={`${p.name} · ${p.course}`} hero={{ file: "contact.jpg", alt: "" }} headerLink={{ label: "İade talepleri", href: `${p.siteUrl}/yonetim/iadeler` }} kicker="AKADEMİ YÖNETİMİ" title={["Yeni bir iade", "talebi var."]} footnote="Bu bildirim öğrencinin iade talebi üzerine gönderildi.">
    <Text style={text}>{p.name} ({p.email})<br />{p.course}<br />Sipariş #{p.orderId} · {p.amount}</Text>
    <Section style={{ backgroundColor: colors.panel, borderRadius: 20, padding: "20px 24px" }}><Text style={{ ...text, whiteSpace: "pre-wrap" }}>{p.reason}</Text></Section>
    <ActionButton href={`${p.siteUrl}/yonetim/iadeler`}>Talebi incele</ActionButton>
  </EmailLayout>;
}
