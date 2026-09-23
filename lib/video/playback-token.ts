import { createPrivateKey, sign } from "node:crypto";

/** Mux uses the key ID in the claims. The caller caps expiry at the student's grant. */
export function signPlaybackTokens(playbackId: string, expiresAt: number, keyId: string, privateKey: string) {
  const key = createPrivateKey(Buffer.from(privateKey, "base64").toString("utf8"));
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = (aud: string) => {
    const body = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ sub: playbackId, aud, exp: expiresAt, kid: keyId })}`;
    return `${body}.${sign("RSA-SHA256", Buffer.from(body), key).toString("base64url")}`;
  };
  return { playback: token("v"), thumbnail: token("t"), storyboard: token("s") };
}
