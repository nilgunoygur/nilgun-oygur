import { AuthEmail, type AuthCopy } from "./_components/auth-email.tsx";

export const resetCopy: AuthCopy = {
  subject: "Akademi şifrenizi yenileyin",
  preview: "Akademi hesabınız için şifre yenileme bağlantınız.",
  hero: { file: "reset.jpg", alt: "Aydınlık bir atölyede meditasyon" },
  kicker: "HESAP GÜVENLİĞİ",
  title: ["Şifrenizi", "yenileyin."],
  body: "Akademi hesabınız için şifre yenileme isteği aldık. Yeni şifrenizi belirlemek için aşağıdaki düğmeyi kullanın.",
  action: "Şifremi yenile",
  notes: [],
  checklist: {
    title: "GÜVENLİĞİNİZ İÇİN",
    items: [
      "Bu bağlantı 1 saat geçerlidir ve yalnızca bir kez kullanılabilir.",
      "Yeni şifreniz kaydedildiğinde tüm cihazlardaki oturumlarınız kapatılır.",
      "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.",
    ],
  },
  footnote: "Bu e-posta, Akademi hesabınız için yapılan şifre yenileme isteği üzerine gönderildi.",
};

export default function ResetPassword({ url }: { url: string }) {
  return <AuthEmail copy={resetCopy} url={url} />;
}

ResetPassword.PreviewProps = { url: "http://localhost:3000/api/auth/reset-password/preview-token?callbackURL=%2Fakademi%2Fsifre-yenile" };
