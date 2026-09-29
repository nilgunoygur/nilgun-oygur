import { z } from "zod";

// Each schema accepts its own output, so the server can re-parse what the form submits.

const number = (label: string, min: number, max: number, step: "integer" | "price") => z.coerce.string().trim().min(1, `${label} yazın.`)
  .transform(Number).pipe(z.number({ error: `${label} bir sayı olmalıdır.` })
    .refine(value => step === "price" || Number.isInteger(value), `${label} tam sayı olmalıdır.`)
    .refine(value => value >= min && value <= max, `${label} ${min} ile ${max.toLocaleString("tr-TR")} arasında olmalıdır.`));

export const coursePriceSchema = z.object({ value: number("Fiyat", 1, 10_000_000, "price") });
export const courseAccessSchema = z.object({ value: number("Erişim süresi", 1, 3650, "integer") });
export const courseChangeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("status"), status: z.enum(["draft", "published", "archived"]) }),
  coursePriceSchema.extend({ kind: z.literal("price") }),
  courseAccessSchema.extend({ kind: z.literal("access") }),
]);
export type CourseChange = z.output<typeof courseChangeSchema>;

export const linkSchema = z.object({ url: z.string().trim().min(1, "Bir bağlantı yazın.").max(2048) });
export const imageInsertSchema = z.object({ src: z.string().min(1, "Bir görsel seçin."), alt: z.string().trim().max(160, "Açıklama en fazla 160 karakter olabilir.") });

const hexColor = z.string().regex(/^#[\da-fA-F]{6}$/, "Rengi #224c40 biçiminde yazın.");
const bannerItemSchema = z.object({
  text: z.string().trim().min(3, "Mesaj en az 3 karakter olmalıdır.").max(180, "Mesaj en fazla 180 karakter olabilir."),
  href: z.string().trim().max(500).refine(value => !value || /^\/(?!\/)[^\s]*$/.test(value) || /^https:\/\/[^\s]+$/.test(value), "Geçerli bir site yolu veya HTTPS bağlantısı girin.")
    .optional().transform(value => value || undefined),
});
export const bannerSchema = z.object({
  items: z.array(bannerItemSchema).min(1, "En az bir mesaj ekleyin.").max(10, "En fazla 10 mesaj ekleyebilirsiniz."),
  backgroundColor: hexColor, textColor: hexColor, accentColor: hexColor,
  animation: z.enum(["scroll", "fade", "static"]),
  speedSeconds: number("Süre", 2, 30, "integer"),
  loop: z.boolean(), pauseOnHover: z.boolean(),
  direction: z.enum(["left", "right"]),
  separator: z.string().trim().min(1, "Bir ayraç yazın.").max(3, "Ayraç en fazla 3 karakter olabilir."),
});
export type BannerFormValues = z.input<typeof bannerSchema>;

export const articleMinLength = { length: 40, message: "Yazı içeriği en az 40 karakter olmalıdır." };
const plainText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
export const articleSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalıdır.").max(180, "Başlık en fazla 180 karakter olabilir."),
  category: z.string().trim().min(2, "Kategori en az 2 karakter olmalıdır.").max(70, "Kategori en fazla 70 karakter olabilir."),
  image: z.string().trim().regex(/^(\/images\/[\w.-]+|\/api\/article-images\/[0-9a-f-]{36})$/i, "Bir kapak görseli seçin."),
  date: z.iso.date("Bir tarih seçin."),
  durationAmount: number("Okuma süresi", 1, 999, "integer"),
  durationUnit: z.enum(["minute", "hour"]),
  body: z.string().trim().max(100_000, "Yazı çok uzun.").refine(value => plainText(value).length >= articleMinLength.length, articleMinLength.message),
});
export const articleStatus = z.enum(["draft", "published"]);

export const lessonFormSchema = z.object({
  title: z.string().trim().min(1, "Ders başlığını yazın.").max(160, "Başlık en fazla 160 karakter olabilir."),
  description: z.string().trim().max(10000, "Açıklama en fazla 10.000 karakter olabilir."),
  status: z.enum(["draft", "published"]),
  startsAt: z.string(),
  durationMinutes: number("Süre", 1, 1440, "integer"),
  joinUrl: z.string().trim().max(2048, "Bağlantı çok uzun.").refine(value => !value || /^https:\/\/\S+$/.test(value), "Toplantı için geçerli bir https:// bağlantısı girin."),
  passcode: z.string().trim().max(100, "Şifre en fazla 100 karakter olabilir."),
  liveStatus: z.enum(["scheduled", "rescheduled", "cancelled", "completed"]),
});
export const lessonInput = lessonFormSchema.extend({ courseId: z.uuid(), lessonId: z.uuid() });
