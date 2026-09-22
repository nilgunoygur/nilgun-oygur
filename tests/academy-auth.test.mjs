import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { createAcademyAuth } from "../lib/auth/create-auth.ts";
import { markMfaSession, ownerStatus, revokeUserSessions } from "../lib/auth/owner-access.ts";
import * as schema from "../lib/db/schema.ts";

const client = new PGlite();
const db = drizzle(client, { schema });
const messages = [];
const claims = [];
const origin = "http://localhost:3000";
let ip = 0;
const dependencies = {
  database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
  baseURL: origin,
  secret: "integration-test-only-secret-abcdef0123456789",
  enqueueEmail: async message => { messages.push(message); },
  markMfaSession: sessionId => markMfaSession(db, sessionId),
  revokeUserSessions: userId => revokeUserSessions(db, userId),
  claimPurchases: async (userId, email) => { claims.push([userId, email]); },
};
const auth = createAcademyAuth(dependencies);
async function request(path, body, cookie = "", address = `192.0.2.${++ip}`) {
  return auth.handler(new Request(`${origin}/api/auth${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", origin, cookie, "x-vercel-forwarded-for": address },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
}
const cookies = response => response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
const account = { name: "Student", email: "student@example.com", password: "test-password-123" };
function messageUrl(message) { return message.text.match(/http[^\s]+/)[0]; }
before(async () => { await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname }); });
after(async () => { await client.close(); });

test("registration is neutral and cannot set ownership or MFA fields", async () => {
  const response = await request("/sign-up/email", { ...account, role: "owner", twoFactorEnabled: true });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).token, null);
  assert.equal(messages.length, 1);
  const [user] = await db.select().from(schema.user).where(eq(schema.user.email, account.email));
  assert.equal(user.twoFactorEnabled, false);
  assert.equal((await db.select().from(schema.owners)).length, 0);
  const duplicate = await request("/sign-up/email", account);
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).token, null);
  assert.equal((await request("/sign-in/email", account)).status, 403);
  assert.equal(messages.length, 1, "normal sign-in must not send email");
});

test("verification enables login; replay never creates a session", async () => {
  const response = await auth.handler(new Request(messageUrl(messages[0])));
  assert.equal(response.status, 302);
  const [user] = await db.select().from(schema.user).where(eq(schema.user.email, account.email));
  assert.deepEqual(claims, [[user.id, account.email]], "waiting Shopier purchases are claimed once the email is verified");
  const replay = await auth.handler(new Request(messageUrl(messages[0])));
  assert.equal(replay.headers.get("set-cookie"), null);
  const login = await request("/sign-in/email", account);
  assert.equal(login.status, 200);
  assert.ok(cookies(login).includes("session_token="));
  assert.equal(claims.length, 2, "and again on each verified sign-in");
  const session = await request("/get-session", undefined, cookies(login));
  assert.equal((await session.json()).user.emailVerified, true);
});

test("password reset is neutral, one-use, and revokes existing sessions", async () => {
  const login = await request("/sign-in/email", account);
  const known = await request("/request-password-reset", { email: account.email, redirectTo: `${origin}/akademi/sifre-yenile` });
  const unknown = await request("/request-password-reset", { email: "unknown@example.com", redirectTo: `${origin}/akademi/sifre-yenile` });
  assert.equal(known.status, unknown.status);
  assert.deepEqual(await known.json(), await unknown.json());
  const resetUrl = new URL(messageUrl(messages.at(-1)));
  const token = resetUrl.pathname.split("/").at(-1);
  const reset = { token, newPassword: "new-password-456" };
  assert.equal((await request("/reset-password", reset)).status, 200);
  assert.equal((await request("/reset-password", reset)).status, 400);
  assert.equal(await (await request("/get-session", undefined, cookies(login))).json(), null);
  assert.equal((await request("/sign-in/email", account)).status, 401);
  account.password = reset.newPassword;
  assert.equal((await request("/sign-in/email", account)).status, 200);
});

test("rate limits persist across auth instances", async () => {
  for (let i = 0; i < 5; i++) await request("/sign-in/email", { email: "missing@example.com", password: "wrong-password" }, "", "198.51.100.1");
  const otherInstance = createAcademyAuth(dependencies);
  const response = await otherInstance.handler(new Request(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "application/json", "x-vercel-forwarded-for": "198.51.100.1" }, body: JSON.stringify(account) }));
  assert.equal(response.status, 429);
});

// RFC 6238 SHA-1 TOTP, matching an authenticator app; no library secret is inspected.
function totp(base32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...base32.toUpperCase()].map(c => alphabet.indexOf(c).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g).map(byte => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest.at(-1) & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}

test("MFA requires a valid code and a session-specific proof; old sessions are revoked", async () => {
  const login = await request("/sign-in/email", account);
  const oldLogin = await request("/sign-in/email", account);
  const enable = await request("/two-factor/enable", { password: account.password }, cookies(login));
  assert.equal(enable.status, 200);
  const { totpURI } = await enable.json();
  const secret = new URL(totpURI).searchParams.get("secret");
  const verified = await request("/two-factor/verify-totp", { code: totp(secret) }, cookies(login));
  assert.equal(verified.status, 200);
  const proofs = await db.select().from(schema.ownerMfaSessions);
  assert.equal(proofs.length, 1);
  assert.equal(await (await request("/get-session", undefined, cookies(oldLogin))).json(), null);
  const challenge = await request("/sign-in/email", account);
  assert.equal((await challenge.json()).twoFactorRedirect, true);
  assert.equal(await (await request("/get-session", undefined, cookies(challenge))).json(), null);
  const badCode = await request("/two-factor/verify-totp", { code: "invalid" }, cookies(challenge));
  assert.ok(badCode.status >= 400);
  assert.equal((await db.select().from(schema.ownerMfaSessions)).length, 1);
  const complete = await request("/two-factor/verify-totp", { code: totp(secret) }, cookies(challenge));
  assert.equal(complete.status, 200);
  const session = await (await request("/get-session", undefined, cookies(complete))).json();
  assert.ok(session.session.id);
  assert.equal((await db.select().from(schema.ownerMfaSessions).where(eq(schema.ownerMfaSessions.sessionId, session.session.id))).length, 1);
  const [user] = await db.select().from(schema.user).where(eq(schema.user.email, account.email));
  assert.deepEqual(await ownerStatus(db, user.id, session.session.id), { isOwner: false, sessionMfaVerified: true }, "an MFA proof alone is not ownership");
  await db.insert(schema.owners).values({ userId: user.id });
  assert.deepEqual(await ownerStatus(db, user.id, session.session.id), { isOwner: true, sessionMfaVerified: true });
  assert.equal((await ownerStatus(db, user.id, "another-session")).sessionMfaVerified, false, "the proof belongs to one session");
});

test("untrusted redirect origins and short passwords are rejected", async () => {
  assert.equal((await request("/sign-up/email", { ...account, email: "new@example.com", password: "short" })).status, 400);
  assert.equal((await request("/request-password-reset", { email: account.email, redirectTo: "https://attacker.example/reset" })).status, 403);
});

test("expired verification and password-reset tokens cannot authenticate", async () => {
  const { signJWT } = await import("better-auth/crypto");
  const token = await signJWT({ email: account.email }, dependencies.secret, -1);
  const verify = await request(`/verify-email?token=${token}`);
  assert.equal(verify.status, 401);
  const reset = await request("/request-password-reset", { email: account.email, redirectTo: `${origin}/akademi/sifre-yenile` });
  assert.equal(reset.status, 200);
  const resetToken = new URL(messageUrl(messages.at(-1))).pathname.split("/").at(-1);
  await db.update(schema.verification).set({ expiresAt: new Date(0) });
  assert.equal((await request("/reset-password", { token: resetToken, newPassword: "expired-token-password" })).status, 400);
});
