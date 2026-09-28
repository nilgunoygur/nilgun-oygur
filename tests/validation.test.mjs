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
  assert.deepEqual(phoneCountries[0], { code: "TR", name: "Türkiye", dial: "+90" });
  assert.equal(phoneCountries.find(country => country.code === "DE")?.name, "Almanya");
});

test("Turkish search ignores case, accents and dotted/dotless i", () => {
  assert.ok(matchesTurkish("Çiğli", "cig"));
  assert.ok(matchesTurkish("İzmir", "IZM"));
  assert.ok(matchesTurkish("Iğdır", "igdir"));
  assert.ok(!matchesTurkish("Bornova", "kad"));
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
