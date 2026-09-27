import test from "node:test";
import assert from "node:assert/strict";
import { authenticationEmail, contactEmail } from "../lib/email/templates.tsx";

test("authentication templates keep text links and escape HTML attributes", async () => {
  const url = 'https://example.com/verify?token=abc&callbackURL="<script>';
  for (const kind of ["verification", "reset"]) {
    const message = await authenticationEmail(kind, "student@example.com", url);
    assert.ok(message.text.includes(url));
    assert.ok(message.html.includes('lang="tr"'));
    assert.ok(message.html.includes("&amp;callbackURL=&quot;&lt;script&gt;"));
    assert.ok(!message.html.includes("<script>"));
    assert.ok(message.expiresAt.getTime() > Date.now() + 3_590_000);
  }
});

test("verification and reset emails carry the right action, expiry and site footer", async () => {
  const verify = await authenticationEmail("verification", "student@example.com", "https://nilgunoygur.com/api/auth/verify-email?token=t");
  assert.equal(verify.subject, "Akademi e-posta adresinizi doğrulayın");
  assert.ok(verify.html.includes("E-posta adresimi doğrula"));
  assert.ok(verify.html.includes("1 saat geçerlidir"));
  assert.ok(verify.html.includes('src="https://nilgunoygur.com/email/welcome.jpg"'), "images load from the site origin");
  assert.ok(verify.html.includes('name="viewport"') && verify.html.includes("prefers-color-scheme: dark"), "mobile and dark-mode rules ship with the email");
  assert.ok(!verify.html.includes("Şifremi yenile"));

  const reset = await authenticationEmail("reset", "student@example.com", "https://nilgunoygur.com/api/auth/reset-password/t");
  assert.equal(reset.subject, "Akademi şifrenizi yenileyin");
  assert.ok(reset.html.includes("Şifremi yenile"));
  assert.ok(reset.text.includes("yalnızca bir kez"));
  assert.ok(reset.html.includes('href="https://nilgunoygur.com/api/auth/reset-password/t"'));
  assert.ok(reset.html.includes('src="https://nilgunoygur.com/email/reset.jpg"'));
});

test("contact messages go only to the configured inbox, with the visitor as Reply-To", async () => {
  const input = { name: "Visitor <b>", email: "visitor@example.com", message: "Hello from the website\n<img src=x onerror=alert(1)>" };
  const message = await contactEmail(input, "owner@example.com", "https://nilgunoygur.com");
  assert.equal(message.to, "owner@example.com");
  assert.equal(message.replyTo, "visitor@example.com");
  assert.equal(message.subject, "Web sitesi iletişim mesajı");
  assert.ok(message.text.includes("Hello from the website"));
  assert.ok(message.html.includes("mailto:visitor@example.com"));
  assert.ok(!message.html.includes("<img src=x") && !message.html.includes("<b>"), "visitor input is escaped");
  assert.ok(message.expiresAt.getTime() < Date.now() + 24 * 3_600_000);
});
