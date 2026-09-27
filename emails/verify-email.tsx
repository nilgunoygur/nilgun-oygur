import { AuthEmail, type AuthCopy } from "./_components/auth-email.tsx";

// Never echo the unverified sign-up name.
export const verifyCopy: AuthCopy = {
  subject: "Akademi e-posta adresinizi doğrulayın",
  preview: "Hesabınızı etkinleştirmek için tek bir adım kaldı.",
  hero: { file: "welcome.jpg", alt: "Nilgün Oygur" },
  kicker: "AKADEMİ HESABINIZ",
  title: ["Hoş geldiniz,", "bir adım kaldı."],
  body: "Nilgün Oygur Akademi hesabınız oluşturuldu. Hesabınızı etkinleştirmek için e-posta adresinizi doğrulayın; ardından giriş yapıp eğitimlerinize başlayabilirsiniz.",
  action: "E-posta adresimi doğrula",
  notes: [
    "Bu bağlantı 1 saat geçerlidir. Süresi dolarsa giriş sayfasından yeni bir doğrulama bağlantısı isteyebilirsiniz.",
    "Bu hesabı siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz. Adres doğrulanmadan hesap kullanılamaz.",
  ],
  checklist: {
    title: "SONRAKİ ADIMLAR",
    items: [
      "E-posta adresinizi doğrulayın.",
      "Akademi hesabınıza giriş yapın.",
      "Bu adresle Shopier’den aldığınız eğitimler hesabınıza otomatik olarak eklenir.",
    ],
  },
  footnote: "Bu e-posta, Nilgün Oygur Akademi’de hesap oluşturulurken girilen adrese gönderildi.",
};

export default function VerifyEmail({ url }: { url: string }) {
  return <AuthEmail copy={verifyCopy} url={url} />;
}

VerifyEmail.PreviewProps = { url: "http://localhost:3000/api/auth/verify-email?token=preview-token&callbackURL=%2Fakademi%2Fgiris%3Fverified%3D1" };
