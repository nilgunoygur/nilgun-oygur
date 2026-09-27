import { Text } from "react-email";
import { ActionButton, EmailLayout, LinkFallback, Notice, Title, small, text } from "./_components/layout.tsx";

export type ResetPasswordProps = { url: string };

const copy = {
  subject: "Akademi şifrenizi yenileyin",
  preview: "Akademi hesabınız için şifre yenileme bağlantınız.",
  title: "Şifrenizi yenileyin",
  body: "Akademi hesabınız için şifre yenileme isteği aldık. Yeni şifrenizi belirlemek için aşağıdaki düğmeyi kullanın.",
  action: "Şifremi yenile",
  expiry: "Bu bağlantı 1 saat geçerlidir ve yalnızca bir kez kullanılabilir. Şifreniz değiştiğinde tüm cihazlardaki oturumlarınız kapatılır.",
  ignore: "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz. Bağlantıyı açıp yeni bir şifre belirlemediğiniz sürece şifreniz değişmez.",
};

export const resetPasswordSubject = copy.subject;

export function resetPasswordText({ url }: ResetPasswordProps) {
  return `${copy.title}\n\n${copy.body}\n\n${copy.action}:\n${url}\n\n${copy.expiry}\n\n${copy.ignore}\n\nNilgün Oygur Akademi`;
}

export default function ResetPassword({ url }: ResetPasswordProps) {
  return (
    <EmailLayout preview={copy.preview} siteUrl={new URL(url).origin} footer="Bu e-posta, Akademi hesabınız için yapılan şifre yenileme isteği üzerine gönderildi.">
      <Title>{copy.title}</Title>
      <Text style={text}>{copy.body}</Text>
      <ActionButton href={url}>{copy.action}</ActionButton>
      <Text style={small}>{copy.expiry}</Text>
      <LinkFallback url={url} />
      <Notice>{copy.ignore}</Notice>
    </EmailLayout>
  );
}

ResetPassword.PreviewProps = {
  url: "https://nilgunoygur.com/api/auth/reset-password/preview-token?callbackURL=%2Fakademi%2Fsifre-yenile",
} satisfies ResetPasswordProps;
