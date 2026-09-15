import test from "node:test";
import assert from "node:assert/strict";
import { authDestination, authErrorMessage } from "../lib/auth/navigation.ts";

test("post-login navigation accepts only known local destinations", () => {
  for (const unsafe of [undefined, null, "https://attacker.example", "//attacker.example", "/\\attacker.example", "/yonetim?next=https://attacker.example", ["/yonetim"], "/akademi/giris"]) {
    assert.equal(authDestination(unsafe), "/akademi/hesabim");
  }
  assert.equal(authDestination("/yonetim"), "/yonetim");
  assert.equal(authDestination("/yonetim/guvenlik"), "/yonetim/guvenlik");
});

test("auth failures use Turkish messages instead of exposing provider details", () => {
  assert.match(authErrorMessage({ status: 429 }), /bir dakika/i);
  assert.match(authErrorMessage({ code: "INVALID_TOKEN" }), /süresi dolmuş/);
  assert.match(authErrorMessage({ code: "EMAIL_NOT_VERIFIED" }), /doğrulayın/);
  assert.equal(authErrorMessage({ code: "private database error" }), "İşlem tamamlanamadı. Bilgilerinizi kontrol edip yeniden deneyin.");
});
