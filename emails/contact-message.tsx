import { Fragment, type ReactNode } from "react";
import { Column, Link, Row, Section, Text } from "react-email";
import { ActionButton, EmailLayout, Kicker, Small, Title, asset, colors, kicker, text } from "./_components/layout.tsx";

export type ContactMessageProps = { name: string; email: string; message: string; siteUrl: string };

export const contactMessageSubject = "Web sitesi iletişim mesajı";

export function contactMessageText({ name, email, message }: ContactMessageProps) {
  return `${message}\n\nGönderen: ${name}\nE-posta: ${email}`;
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Row>
      <Column style={{ width: 96, verticalAlign: "top" }}><Text className="muted" style={{ ...kicker, color: colors.muted, margin: "0 0 10px", lineHeight: "22px" }}>{label}</Text></Column>
      <Column style={{ verticalAlign: "top" }}><Text className="ink" style={{ ...text, fontSize: 15, lineHeight: "22px", margin: "0 0 10px" }}>{children}</Text></Column>
    </Row>
  );
}

/** Sent to the site owner; replying goes straight to the visitor through Reply-To. */
export default function ContactMessage({ name, email, message, siteUrl }: ContactMessageProps) {
  const reply = `mailto:${email}?subject=${encodeURIComponent("Re: " + contactMessageSubject)}`;
  return (
    <EmailLayout
      preview={`${name}: ${message.slice(0, 90)}`}
      siteUrl={siteUrl}
      hero={{ src: asset(siteUrl, "contact.jpg"), alt: "" }}
      headerLink={{ label: "Web sitesi", href: siteUrl }}
      footnote="Bu mesaj web sitesindeki iletişim formundan gönderildi. Yanıtınız doğrudan gönderene iletilir."
    >
      <Kicker siteUrl={siteUrl}>İLETİŞİM FORMU</Kicker>
      <Title lead="Yeni bir mesajınız" accent="var." />
      <Section style={{ margin: "6px 0 18px" }}>
        <Detail label="GÖNDEREN">{name}</Detail>
        <Detail label="E-POSTA"><Link className="link" href={`mailto:${email}`} style={{ color: colors.forest }}>{email}</Link></Detail>
      </Section>
      <Section className="panel" style={{ backgroundColor: colors.panel, borderRadius: 20, padding: "22px 24px" }}>
        {/* Explicit breaks: Outlook ignores white-space: pre-wrap. */}
        <Text className="ink" style={{ ...text, margin: 0 }}>{message.split("\n").map((line, index) => <Fragment key={index}>{index > 0 && <br />}{line}</Fragment>)}</Text>
      </Section>
      <ActionButton href={reply}>Yanıtla</ActionButton>
      <Small style={{ margin: 0 }}>Bu e-postayı yanıtladığınızda yanıtınız doğrudan {email} adresine gider.</Small>
    </EmailLayout>
  );
}

ContactMessage.PreviewProps = {
  name: "Ayşe Yılmaz",
  email: "ayse@example.com",
  message: "Merhaba,\n\nBütünsel şifa eğitimi hakkında bilgi almak istiyorum. Yeni dönem ne zaman başlıyor?\n\nTeşekkürler.",
  siteUrl: "http://localhost:3000",
} satisfies ContactMessageProps;
