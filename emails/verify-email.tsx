import { Text } from "react-email";
import { ActionButton, EmailLayout, LinkFallback, Notice, Title, small, text } from "./_components/layout.tsx";

export type VerifyEmailProps = { url: string };

// The account name is chosen by whoever signs up, so it is never echoed to an unverified address.
const copy = {
  subject: "Akademi e-posta adresinizi doğrulayın",
  preview: "Akademi hesabınızı etkinleştirmek için e-posta adresinizi doğrulayın.",
  title: "E-posta adresinizi doğrulayın",
  body: "Nilgün Oygur Akademi’ye hoş geldiniz. Hesabınızı etkinleştirmek için e-posta adresinizi doğrulamanız yeterli. Ardından giriş yapabilir ve eğitimlerinize erişebilirsiniz.",
  action: "E-posta adresimi doğrula",
  expiry: "Bu bağlantı 1 saat geçerlidir. Süresi dolarsa giriş sayfasından yeni bir doğrulama bağlantısı isteyebilirsiniz.",
  ignore: "Bu hesabı siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz. Adres doğrulanmadan hesap kullanılamaz.",
};

export const verifyEmailSubject = copy.subject;

export function verifyEmailText({ url }: VerifyEmailProps) {
  return `${copy.title}\n\n${copy.body}\n\n${copy.action}:\n${url}\n\n${copy.expiry}\n\n${copy.ignore}\n\nNilgün Oygur Akademi`;
}

export default function VerifyEmail({ url }: VerifyEmailProps) {
  return (
    <EmailLayout preview={copy.preview} siteUrl={new URL(url).origin} footer="Bu e-posta, Akademi hesabı oluşturulurken girilen adrese gönderildi.">
      <Title>{copy.title}</Title>
      <Text style={text}>{copy.body}</Text>
      <ActionButton href={url}>{copy.action}</ActionButton>
      <Text style={small}>{copy.expiry}</Text>
      <LinkFallback url={url} />
      <Notice>{copy.ignore}</Notice>
    </EmailLayout>
  );
}

VerifyEmail.PreviewProps = {
  url: "https://nilgunoygur.com/api/auth/verify-email?token=preview-token&callbackURL=%2Fakademi%2Fgiris%3Fverified%3D1",
} satisfies VerifyEmailProps;
