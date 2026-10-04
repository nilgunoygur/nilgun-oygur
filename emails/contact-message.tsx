import { Fragment, type ReactNode } from "react";
import { Column, Link, Row, Section, Text } from "react-email";
import { ActionButton, EmailLayout, Small, colors, kicker, text } from "./_components/layout.tsx";

type Props = { name: string; email: string; message: string; siteUrl: string; orderNumber?: string };

export const contactSubject = "Web sitesi iletişim mesajı";
export const supportSubject = "Akademi destek mesajı";

export function contactText({ name, email, message, orderNumber }: Props) {
  return `${message}\n\nGönderen: ${name}\nE-posta: ${email}${orderNumber ? `\nShopier siparişi: ${orderNumber}` : ""}`;
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Row>
      <Column style={{ width: 96, verticalAlign: "top" }}><Text className="muted" style={{ ...kicker, color: colors.muted, margin: "0 0 10px", lineHeight: "22px" }}>{label}</Text></Column>
      <Column style={{ verticalAlign: "top" }}><Text className="ink" style={{ ...text, fontSize: 15, lineHeight: "22px", margin: "0 0 10px" }}>{children}</Text></Column>
    </Row>
  );
}

/** A message with `orderNumber` defined (even empty) came from the Akademi support form. */
export default function ContactMessage({ name, email, message, siteUrl, orderNumber }: Props) {
  const support = orderNumber !== undefined, subject = support ? supportSubject : contactSubject;
  return (
    <EmailLayout
      preview={`${name}: ${message.slice(0, 90)}`}
      siteUrl={siteUrl}
      hero={{ file: "contact.jpg", alt: "" }}
      headerLink={{ label: "Web sitesi", href: siteUrl }}
      kicker={support ? "AKADEMİ DESTEK" : "İLETİŞİM FORMU"}
      title={["Yeni bir mesajınız", "var."]}
      footnote={support ? "Bu mesaj Akademi eğitim ekleme rehberindeki destek formundan gönderildi." : "Bu mesaj web sitesindeki iletişim formundan gönderildi."}
    >
      <Section style={{ margin: "6px 0 18px" }}>
        <Detail label="GÖNDEREN">{name}</Detail>
        <Detail label="E-POSTA"><Link className="link" href={`mailto:${email}`} style={{ color: colors.forest }}>{email}</Link></Detail>
        {orderNumber && <Detail label="SİPARİŞ">{orderNumber}</Detail>}
      </Section>
      <Section className="panel" style={{ backgroundColor: colors.panel, borderRadius: 20, padding: "22px 24px" }}>
        {/* Outlook ignores white-space: pre-wrap. */}
        <Text className="ink" style={{ ...text, margin: 0 }}>{message.split("\n").map((line, index) => <Fragment key={index}>{index > 0 && <br />}{line}</Fragment>)}</Text>
      </Section>
      <ActionButton href={`mailto:${email}?subject=${encodeURIComponent(`Re: ${subject}`)}`}>Yanıtla</ActionButton>
      <Small style={{ margin: 0 }}>Bu e-postayı yanıtladığınızda yanıtınız doğrudan {email} adresine gider.</Small>
    </EmailLayout>
  );
}

ContactMessage.PreviewProps = {
  name: "Ayşe Yılmaz",
  email: "ayse@example.com",
  message: "Merhaba,\n\nBütünsel şifa eğitimi hakkında bilgi almak istiyorum. Yeni dönem ne zaman başlıyor?\n\nTeşekkürler.",
  siteUrl: "http://localhost:3000",
} satisfies Props;
