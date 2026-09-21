import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSlug } from "../lib/route-slug.ts";
import { contactSchema } from "../lib/contact-schema.ts";

test("Turkish article slugs match whether URL-encoded or decoded", () => {
  const slug = "doğal-taşların-psikolojik-etkileri-bilimsel-bir-bakış";
  assert.equal(normalizeSlug(encodeURIComponent(slug)), slug);
  assert.equal(normalizeSlug(slug), slug);
  assert.equal(normalizeSlug(slug.normalize("NFD")), slug);
  assert.equal(normalizeSlug("%broken"), null);
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
