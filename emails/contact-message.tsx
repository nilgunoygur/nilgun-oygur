import { Fragment, type ReactNode } from "react";
import { Column, Link, Row, Section, Text } from "react-email";
import { ActionButton, EmailLayout, Title, colors, small, text } from "./_components/layout.tsx";

export type ContactMessageProps = { name: string; email: string; message: string; siteUrl: string };

export const contactMessageSubject = "Web sitesi iletişim mesajı";

export function contactMessageText({ name, email, message }: ContactMessageProps) {
  return `${message}\n\nGönderen: ${name}\nE-posta: ${email}`;
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Row>
      <Column style={{ width: 88, verticalAlign: "top" }}><Text style={{ ...small, margin: "0 0 8px" }}>{label}</Text></Column>
      <Column style={{ verticalAlign: "top" }}><Text style={{ ...text, fontSize: 15, lineHeight: "20px", margin: "0 0 8px" }}>{children}</Text></Column>
    </Row>
  );
}

/** Sent to the site owner; replying goes straight to the visitor through Reply-To. */
export default function ContactMessage({ name, email, message, siteUrl }: ContactMessageProps) {
  const reply = `mailto:${email}?subject=${encodeURIComponent("Re: " + contactMessageSubject)}`;
  return (
    <EmailLayout preview={`${name}: ${message.slice(0, 90)}`} eyebrow="İLETİŞİM" siteUrl={siteUrl} footer="Bu mesaj web sitesindeki iletişim formundan gönderildi.">
      <Title>Yeni iletişim mesajı</Title>
      <Section style={{ margin: "0 0 20px" }}>
        <Detail label="Gönderen">{name}</Detail>
        <Detail label="E-posta"><Link href={`mailto:${email}`} style={{ color: colors.forest }}>{email}</Link></Detail>
      </Section>
      <Section style={{ backgroundColor: colors.panel, borderRadius: 12, padding: "20px 22px" }}>
        {/* Explicit breaks: Outlook ignores white-space: pre-wrap. */}
        <Text style={{ ...text, margin: 0 }}>{message.split("\n").map((line, index) => <Fragment key={index}>{index > 0 && <br />}{line}</Fragment>)}</Text>
      </Section>
      <ActionButton href={reply}>Yanıtla</ActionButton>
      <Text style={{ ...small, margin: 0 }}>Bu e-postayı yanıtladığınızda yanıtınız doğrudan {email} adresine gider.</Text>
    </EmailLayout>
  );
}

ContactMessage.PreviewProps = {
  name: "Ayşe Yılmaz",
  email: "ayse@example.com",
  message: "Merhaba,\n\nBütünsel şifa eğitimi hakkında bilgi almak istiyorum. Yeni dönem ne zaman başlıyor?\n\nTeşekkürler.",
  siteUrl: "https://nilgunoygur.com",
} satisfies ContactMessageProps;
