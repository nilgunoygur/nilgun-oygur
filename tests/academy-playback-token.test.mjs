import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { signPlaybackTokens } from "../lib/video/playback-token.ts";

test("playback tokens carry Mux claims and verifiable RSA signatures for each resource", () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const key = Buffer.from(privateKey.export({ type: "pkcs8", format: "pem" })).toString("base64");
  const tokens = signPlaybackTokens("signed-playback", 1900000000, "key-123", key);
  for (const [resource, audience] of [["playback", "v"], ["thumbnail", "t"], ["storyboard", "s"]]) {
    const [header, payload, signature] = tokens[resource].split(".");
    assert.deepEqual(JSON.parse(Buffer.from(header, "base64url")), { alg: "RS256", typ: "JWT" });
    assert.deepEqual(JSON.parse(Buffer.from(payload, "base64url")), { sub: "signed-playback", aud: audience, exp: 1900000000, kid: "key-123" });
    assert.equal(verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, "base64url")), true);
  }
});
