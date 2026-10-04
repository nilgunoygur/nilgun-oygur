import test from "node:test";
import assert from "node:assert/strict";
import { authDestination, authErrorMessage, verificationCallback } from "../lib/auth/navigation.ts";

test("post-login navigation accepts only known local destinations", () => {
  for (const unsafe of [undefined, null, "https://attacker.example", "//attacker.example", "/\\attacker.example", "/yonetim?next=https://attacker.example", ["/yonetim"], "/akademi/giris", "/akademi/../yonetim/satin-al", "/akademi/kurs/satin-al?x=//evil", "/akademi/KURS/satin-al"]) {
    assert.equal(authDestination(unsafe), "/akademi/hesabim");
  }
  assert.equal(authDestination("/yonetim"), "/yonetim");
  assert.equal(authDestination("/yonetim/guvenlik"), "/yonetim/guvenlik");
  assert.equal(authDestination("/akademi/kuantum-egitimi/satin-al"), "/akademi/kuantum-egitimi/satin-al");
});

test("auth failures use Turkish messages instead of exposing provider details", () => {
  assert.match(authErrorMessage({ status: 429 }), /bir dakika/i);
  assert.match(authErrorMessage({ code: "INVALID_TOKEN" }), /süresi dolmuş/);
  assert.match(authErrorMessage({ code: "EMAIL_NOT_VERIFIED" }), /doğrulayın/);
  assert.equal(authErrorMessage({ code: "private database error" }), "İşlem tamamlanamadı. Bilgilerinizi kontrol edip yeniden deneyin.");
});

test("course claiming survives login and email verification without accepting external redirects", () => {
  for (const path of ["/akademi/siparis-ekle", "/akademi/satin-alim-sonrasi"]) {
    assert.equal(authDestination(path), path);
    const callback = new URL(verificationCallback(path), "https://www.nilgunoygur.com");
    assert.equal(callback.pathname, "/akademi/giris");
    assert.equal(callback.searchParams.get("verified"), "1");
    assert.equal(callback.searchParams.get("next"), path);
  }
  assert.equal(new URL(verificationCallback("https://evil.example"), "https://www.nilgunoygur.com").searchParams.get("next"), "/akademi/hesabim");
});
