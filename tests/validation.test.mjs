import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSlug } from "../lib/route-slug.ts";
import { contactSchema } from "../lib/contact-schema.ts";
import { articles } from "../lib/content.ts";
import { districtsOf, matchDistrict, matchProvince, matchesTurkish, plateCode, provinces } from "../lib/turkiye.ts";
import { callingCode, formatPhone, groupNational, normalizePhone, phoneCountries, splitPhone } from "../lib/phone.ts";
import { contactInput } from "../lib/auth/contact.ts";

test("Turkish article slugs match whether URL-encoded or decoded", () => {
  const slug = "doğal-taşların-psikolojik-etkileri-bilimsel-bir-bakış";
  assert.equal(normalizeSlug(encodeURIComponent(slug)), slug);
  assert.equal(normalizeSlug(slug), slug);
  assert.equal(normalizeSlug(slug.normalize("NFD")), slug);
  assert.equal(normalizeSlug("%broken"), null);
  for (const { href } of articles) {
    const articleSlug = href.slice("/blog/".length);
    assert.equal(normalizeSlug(encodeURIComponent(articleSlug)), articleSlug, href);
  }
});

test("contact validation rejects incomplete submissions and trims valid input", () => {
  assert.equal(
    contactSchema.safeParse({ name: "", email: "bad", message: "short" })
      .success,
    false,
  );
  const result = contactSchema.parse({
    name: "  Ayşe Yılmaz  ",
    email: "ayse@example.com",
    message: "Eğitim hakkında bilgi almak istiyorum.",
  });
  assert.equal(result.name, "Ayşe Yılmaz");
});

test("course addresses are ASCII slugs derived from Turkish titles", async () => {
  const { courseSlug } = await import("../lib/akademi/slug.ts");
  assert.equal(courseSlug("Doğal Taş Eğitimi"), "dogal-tas-egitimi");
  assert.equal(courseSlug("  İLİŞKİ Atölyesi: 7 Gün! "), "iliski-atolyesi-7-gun");
  assert.equal(courseSlug("Çiçek & Güneş — Öz"), "cicek-gunes-oz");
  assert.equal(courseSlug("???"), "");
});

test("Shopier descriptions become plain text for cards and allowlisted HTML for the course page", async () => {
  const { descriptionText, descriptionHtml } = await import("../lib/shopier/description.ts");
  const html = '<h3>Program</h3><p>7 gün&nbsp;boyunca &amp; <strong>sesli</strong><br>anlatım</p><ul><li>Bir</li></ul>';
  assert.equal(descriptionText(html), "Program 7 gün boyunca & sesli anlatım Bir");
  assert.equal(descriptionHtml(html), "<h3>Program</h3><p>7 gün boyunca &amp; <strong>sesli</strong><br>anlatım</p><ul><li>Bir</li></ul>");
  assert.equal(descriptionHtml('<p onclick="x()">a</p><script>alert(1)</script><img src=x onerror=y><a href="javascript:z">b</a>'), "<p>a</p>b");
  assert.equal(descriptionHtml("1 &lt; 2 &lt;script&gt;"), "1 &lt; 2 &lt;script&gt;");
});

test("mobile numbers normalize to E.164 however they are typed; national formats are Turkish", () => {
  for (const typed of ["0532 123 45 67", "5321234567", "+90 532 123 45 67", "905321234567", "(0532) 123-45-67"]) assert.equal(normalizePhone(typed), "+905321234567", typed);
  assert.equal(normalizePhone("+49 1512 3456789"), "+4915123456789", "other countries' mobiles are accepted in international form");
  for (const typed of ["0212 123 45 67", "0850 123 45 67", "+49 30 1234567", "0532 123 45", "", null]) assert.equal(normalizePhone(typed), null, String(typed));
  assert.equal(formatPhone("+905321234567"), "+90 532 123 45 67");
});

test("the phone input groups national digits without the trunk 0 and lists Türkiye first", () => {
  assert.equal(groupNational("TR", "5321234567"), "532 123 45 67");
  assert.equal(groupNational("TR", "532"), "532");
  assert.equal(groupNational("DE", "15123456789"), "1512 3456789");
  assert.deepEqual(splitPhone("+4915123456789"), { country: "DE", digits: "15123456789" });
  assert.deepEqual(splitPhone(""), { country: "TR", digits: "" });
  assert.equal(callingCode("TR"), "+90");
  assert.deepEqual(phoneCountries()[0], { code: "TR", name: "Türkiye", dial: "+90" });
  assert.equal(phoneCountries().find(country => country.code === "DE")?.name, "Almanya");
});

test("Turkish search ignores case, accents and dotted/dotless i", () => {
  assert.ok(matchesTurkish("Çiğli", "cig"));
  assert.ok(matchesTurkish("İzmir", "IZM"));
  assert.ok(matchesTurkish("Iğdır", "igdir"));
  assert.ok(!matchesTurkish("Bornova", "kad"));
  assert.ok(matchesTurkish("19 Mayıs", "19") && !matchesTurkish("Atakum", "19"), "digits narrow the search");
});

test("provinces match Shopier spellings and carry their postcode prefix", () => {
  assert.equal(provinces.length, 81);
  assert.equal(new Set(provinces).size, 81);
  for (const [typed, name] of [["ISTANBUL", "İstanbul"], ["istanbul", "İstanbul"], ["IĞDIR", "Iğdır"], ["igdir", "Iğdır"], ["Şanlıurfa", "Şanlıurfa"], ["icel", "Mersin"], ["K.Maraş", "Kahramanmaraş"], ["çanakkale ", "Çanakkale"]]) assert.equal(matchProvince(typed), name, typed);
  assert.equal(matchProvince("Atlantis"), null);
  assert.deepEqual([plateCode("Adana"), plateCode("İstanbul"), plateCode("Düzce")], ["01", "34", "81"]);
});

test("contact input requires a matching postcode prefix when a postcode is given", () => {
  const input = { phone: "0532 123 45 67", city: "İzmir", district: "Bornova", address: "Kazımdirik Mah. 372. Sk. No: 5", postcode: "" };
  assert.equal(contactInput.parse(input).postcode, null);
  assert.equal(contactInput.parse({ ...input, postcode: "35040" }).postcode, "35040");
  assert.equal(contactInput.safeParse({ ...input, postcode: "34710" }).error?.issues[0].message, "İzmir posta kodları 35 ile başlar.");
  assert.equal(contactInput.safeParse({ ...input, address: "Ev" }).success, false);
  assert.equal(contactInput.safeParse({ ...input, city: "İzmir".repeat(1000) }).success, false, "free-text input is capped before any matching");
  assert.equal(contactInput.parse({ ...input, district: "BORNOVA" }).district, "Bornova");
  assert.equal(contactInput.safeParse({ ...input, district: "Kadıköy" }).error?.issues[0].message, "Kadıköy bir İzmir ilçesi değil. İlçenizi listeden seçin.");
});

test("every province has its PTT districts, matched however they are spelled", () => {
  assert.equal(provinces.reduce((sum, name) => sum + districtsOf(name).length, 0), 973);
  assert.ok(provinces.every(name => districtsOf(name).length > 0));
  assert.equal(districtsOf("İstanbul").length, 39);
  assert.equal(matchDistrict("İstanbul", "KADIKOY"), "Kadıköy");
  assert.equal(matchDistrict("Iğdır", "Iğdır"), "Merkez", "central districts are listed as Merkez");
  assert.equal(matchDistrict("İzmir", "Kadıköy"), null);
});

test("the owner's plain-text description format round-trips what the course page shows", async () => {
  const { descriptionMarkup, markupDescription, descriptionHtml } = await import("../lib/shopier/description.ts");
  const shopier = "<h3><strong>7 Günlük Çalışma</strong></h3>\r\n\r\n<p><strong>Kalın</strong> ve <em>eğik</em> &amp; düz.</p>\r\n\r\n<p>✔️ Bir<br>\r\n✔️ İki</p>\r\n<ul><li>Madde</li><li>İkinci</li></ul><ol><li>Adım</li></ol><script>x()</script>";
  const text = descriptionMarkup(shopier);
  assert.equal(text, "### **7 Günlük Çalışma**\n\n**Kalın** ve *eğik* & düz.\n\n✔️ Bir\n✔️ İki\n\n- Madde\n- İkinci\n\n1. Adım");
  const html = markupDescription(text);
  assert.equal(html, "<h3><strong>7 Günlük Çalışma</strong></h3>\n<p><strong>Kalın</strong> ve <em>eğik</em> &amp; düz.</p>\n<p>✔️ Bir</p>\n<p>✔️ İki</p>\n<ul><li>Madde</li><li>İkinci</li></ul>\n<ol><li>Adım</li></ol>");
  assert.ok(!html.includes("<br"));
  assert.equal(descriptionHtml(html), html, "everything written is on the course page's allowlist");
  const saved = descriptionMarkup(html);
  assert.equal(saved, text.replace("✔️ Bir\n✔️ İki", "✔️ Bir\n\n✔️ İki"));
  assert.equal(markupDescription(saved), html, "saving again changes nothing");
  assert.equal(markupDescription("a < b\n\n<script>alert(1)</script>"), "<p>a &lt; b</p>\n<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>", "typed HTML stays text");
  assert.equal(markupDescription("  \n\n"), "");
  assert.equal(descriptionMarkup("Kişiye özel eğitim<br>\r\nOnline Eğitim"), "Kişiye özel eğitim\nOnline Eğitim");
});

test("homework files must be PDFs within the size limit, and are stored under their lesson", async () => {
  const { lessonFileProblem, lessonFileType, lessonFilePath, isLessonFilePath, formatFileSize } = await import("../lib/akademi/lesson-file-rules.ts");
  assert.equal(lessonFileProblem({ type: "application/pdf", size: 1_000 }), null);
  assert.match(lessonFileProblem({ type: "image/png", size: 1_000 }), /PDF/);
  assert.match(lessonFileProblem({ type: "application/pdf", size: 26 * 1024 * 1024 }), /büyük/);
  assert.equal(lessonFileType({ name: "Ödev.PDF", type: "" }), "application/pdf", "browsers that report no type fall back to the extension");
  assert.equal(lessonFileType({ name: "x.exe", type: "" }), "");
  const lesson = "11111111-1111-4111-8111-111111111111";
  const path = lessonFilePath(lesson, "key", "Ödev 1 – Günlük Nefes Takibi.PDF");
  assert.equal(path, `lessons/${lesson}/key/odev-1-gunluk-nefes-takibi.pdf`);
  assert.equal(lessonFilePath(lesson, "key", "???"), `lessons/${lesson}/key/dosya`);
  assert.equal(isLessonFilePath(lesson, path), true);
  assert.equal(isLessonFilePath("22222222-2222-4222-8222-222222222222", path), false, "a file of another lesson");
  assert.equal(isLessonFilePath(lesson, `lessons/${lesson}/../covers/x.jpg`), false);
  assert.deepEqual([formatFileSize(500), formatFileSize(482_113), formatFileSize(2_340_000)], ["1 KB", "471 KB", "2,2 MB"]);
});

test("a recording's waveform is its loudness per bar, scaled so one loud moment doesn't flatten the rest", async () => {
  const { peaksFromSamples } = await import("../lib/audio-peaks.ts");
  const samples = new Float32Array(8000);
  for (let i = 0; i < samples.length; i++) samples[i] = (i < 4000 ? 0.1 : 0.4) * Math.sin(i / 5);
  samples.fill(1, 7990);
  const peaks = peaksFromSamples(samples, 80);
  assert.equal(peaks.length, 80);
  assert.ok(peaks.every(value => Number.isInteger(value) && value >= 0 && value <= 100));
  assert.ok(peaks[10] > 15 && peaks[10] < 35, `quiet half ${peaks[10]}`);
  assert.ok(peaks[60] >= 95, `loud half ${peaks[60]}`);
  assert.deepEqual(peaksFromSamples(new Float32Array(100), 10), Array(10).fill(0), "silence");
});

test("a copied Shopier order number accepts its displayed hash prefix and rejects invalid identifiers", async () => {
  const { claimSchema } = await import("../lib/akademi/claim-schema.ts");
  const base = { email: "buyer@example.com" };
  assert.equal(claimSchema.parse({ ...base, orderNumber: " #123456789 " }).orderNumber, "123456789");
  assert.equal(claimSchema.parse({ ...base, orderNumber: "# 123456789" }).orderNumber, "123456789");
  assert.equal(claimSchema.parse({ ...base, orderNumber: "123456789" }).orderNumber, "123456789");
  assert.equal(claimSchema.parse({ ...base, orderNumber: "# 12345678901234567890" }).orderNumber, "12345678901234567890");
  for (const value of ["##123456789", "12345abc", "#12", "../orders", "123 456"]) assert.equal(claimSchema.safeParse({ ...base, orderNumber: value }).success, false);
});
