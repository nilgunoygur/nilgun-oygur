// Only known post-login destinations are accepted; never redirect to user-supplied URLs.
export function authDestination(value: unknown): string {
  return value === "/yonetim" || value === "/yonetim/guvenlik"
    ? value
    : "/akademi/hesabim";
}

export function authErrorMessage(error: { code?: string; status?: number }): string {
  if (error.status === 429) return "Çok fazla deneme yaptınız. Bir dakika bekleyip yeniden deneyin.";
  if (error.status === 503) return "Hesap işlemleri şu anda kullanılamıyor. Lütfen daha sonra yeniden deneyin.";
  switch (error.code) {
    case "EMAIL_NOT_VERIFIED": return "Giriş yapmadan önce e-posta adresinizi doğrulayın.";
    case "INVALID_TOKEN":
    case "TOKEN_EXPIRED": return "Bağlantı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı isteyin.";
    case "INVALID_CODE":
    case "INVALID_BACKUP_CODE": return "Doğrulama kodu geçersiz. Güncel kodu kontrol edip yeniden deneyin.";
    case "INVALID_TWO_FACTOR_COOKIE": return "Doğrulama oturumunuz sona erdi. Lütfen tekrar giriş yapın.";
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD": return "E-posta adresinizi ve şifrenizi kontrol edin.";
    default: return "İşlem tamamlanamadı. Bilgilerinizi kontrol edip yeniden deneyin.";
  }
}
