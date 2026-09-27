import { ActionButton, Checklist, EmailLayout, Kicker, LinkFallback, Paragraph, Title, asset } from "./_components/layout.tsx";

export type ResetPasswordProps = { url: string };

const copy = {
  subject: "Akademi şifrenizi yenileyin",
  preview: "Akademi hesabınız için şifre yenileme bağlantınız.",
  title: ["Şifrenizi", "yenileyin."],
  body: "Akademi hesabınız için şifre yenileme isteği aldık. Yeni şifrenizi belirlemek için aşağıdaki düğmeyi kullanın.",
  action: "Şifremi yenile",
  safetyTitle: "GÜVENLİĞİNİZ İÇİN",
  safety: [
    "Bu bağlantı 1 saat geçerlidir ve yalnızca bir kez kullanılabilir.",
    "Yeni şifreniz kaydedildiğinde tüm cihazlardaki oturumlarınız kapatılır.",
    "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.",
  ],
};

export const resetPasswordSubject = copy.subject;

export function resetPasswordText({ url }: ResetPasswordProps) {
  return `${copy.title.join(" ")}\n\n${copy.body}\n\n${copy.action}:\n${url}\n\n${copy.safety.join("\n")}\n\nNilgün Oygur Akademi`;
}

export default function ResetPassword({ url }: ResetPasswordProps) {
  const siteUrl = new URL(url).origin;
  return (
    <EmailLayout
      preview={copy.preview}
      siteUrl={siteUrl}
      hero={{ src: asset(siteUrl, "reset.jpg"), alt: "Aydınlık bir atölyede meditasyon" }}
      headerLink={{ label: "Akademi", href: `${siteUrl}/akademi` }}
      footnote="Bu e-posta, Akademi hesabınız için yapılan şifre yenileme isteği üzerine gönderildi."
      aside={<Checklist siteUrl={siteUrl} title={copy.safetyTitle} items={copy.safety} />}
    >
      <Kicker siteUrl={siteUrl}>HESAP GÜVENLİĞİ</Kicker>
      <Title lead={copy.title[0]} accent={copy.title[1]} />
      <Paragraph>{copy.body}</Paragraph>
      <ActionButton href={url}>{copy.action}</ActionButton>
      <LinkFallback url={url} />
    </EmailLayout>
  );
}

ResetPassword.PreviewProps = {
  url: "http://localhost:3000/api/auth/reset-password/preview-token?callbackURL=%2Fakademi%2Fsifre-yenile",
} satisfies ResetPasswordProps;
