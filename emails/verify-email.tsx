import { ActionButton, Checklist, EmailLayout, Kicker, LinkFallback, Paragraph, Small, Title, asset } from "./_components/layout.tsx";

export type VerifyEmailProps = { url: string };

// The account name is chosen by whoever signs up, so it is never echoed to an unverified address.
const copy = {
  subject: "Akademi e-posta adresinizi doğrulayın",
  preview: "Hesabınızı etkinleştirmek için tek bir adım kaldı.",
  title: ["Hoş geldiniz,", "bir adım kaldı."],
  body: "Nilgün Oygur Akademi hesabınız oluşturuldu. Hesabınızı etkinleştirmek için e-posta adresinizi doğrulayın; ardından giriş yapıp eğitimlerinize başlayabilirsiniz.",
  action: "E-posta adresimi doğrula",
  expiry: "Bu bağlantı 1 saat geçerlidir. Süresi dolarsa giriş sayfasından yeni bir doğrulama bağlantısı isteyebilirsiniz.",
  ignore: "Bu hesabı siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz. Adres doğrulanmadan hesap kullanılamaz.",
  stepsTitle: "SONRAKİ ADIMLAR",
  steps: [
    "E-posta adresinizi doğrulayın.",
    "Akademi hesabınıza giriş yapın.",
    "Bu adresle Shopier’den aldığınız eğitimler hesabınıza otomatik olarak eklenir.",
  ],
};

export const verifyEmailSubject = copy.subject;

export function verifyEmailText({ url }: VerifyEmailProps) {
  return `${copy.title.join(" ")}\n\n${copy.body}\n\n${copy.action}:\n${url}\n\n${copy.expiry}\n\n${copy.ignore}\n\nNilgün Oygur Akademi`;
}

export default function VerifyEmail({ url }: VerifyEmailProps) {
  const siteUrl = new URL(url).origin;
  return (
    <EmailLayout
      preview={copy.preview}
      siteUrl={siteUrl}
      hero={{ src: asset(siteUrl, "welcome.jpg"), alt: "Nilgün Oygur" }}
      headerLink={{ label: "Akademi", href: `${siteUrl}/akademi` }}
      footnote="Bu e-posta, Nilgün Oygur Akademi’de hesap oluşturulurken girilen adrese gönderildi."
      aside={<Checklist siteUrl={siteUrl} title={copy.stepsTitle} items={copy.steps} />}
    >
      <Kicker siteUrl={siteUrl}>AKADEMİ HESABINIZ</Kicker>
      <Title lead={copy.title[0]} accent={copy.title[1]} />
      <Paragraph>{copy.body}</Paragraph>
      <ActionButton href={url}>{copy.action}</ActionButton>
      <Small>{copy.expiry}</Small>
      <Small style={{ margin: 0 }}>{copy.ignore}</Small>
      <LinkFallback url={url} />
    </EmailLayout>
  );
}

VerifyEmail.PreviewProps = {
  url: "http://localhost:3000/api/auth/verify-email?token=preview-token&callbackURL=%2Fakademi%2Fgiris%3Fverified%3D1",
} satisfies VerifyEmailProps;
