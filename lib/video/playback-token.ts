import { createPrivateKey, sign, type KeyObject } from "node:crypto";

const keys = new Map<string, KeyObject>();
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** One Mux JWT for a playback ID: `v` playback, `t` thumbnail, `s` storyboard. */
export function signPlaybackToken(playbackId: string, aud: "v" | "t" | "s", expiresAt: number, keyId: string, privateKey: string) {
  let key = keys.get(privateKey);
  if (!key) keys.set(privateKey, key = createPrivateKey(Buffer.from(privateKey, "base64").toString("utf8")));
  const body = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ sub: playbackId, aud, exp: expiresAt, kid: keyId })}`;
  return `${body}.${sign("RSA-SHA256", Buffer.from(body), key).toString("base64url")}`;
}

/** Mux uses the key ID in the claims. The caller caps expiry at the student's grant. */
export function signPlaybackTokens(playbackId: string, expiresAt: number, keyId: string, privateKey: string) {
  const token = (aud: "v" | "t" | "s") => signPlaybackToken(playbackId, aud, expiresAt, keyId, privateKey);
  return { playback: token("v"), thumbnail: token("t"), storyboard: token("s") };
}
