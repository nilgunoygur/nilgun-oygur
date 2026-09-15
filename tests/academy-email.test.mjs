import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { createEmailOutbox } from "../lib/email/outbox.ts";
import * as schema from "../lib/db/schema.ts";
const client = new PGlite();
const db = drizzle(client, { schema });
const outbox = createEmailOutbox(db, "test-only-encryption-key-0123456789abcdef");
const makeMessage = text => ({ to: "student@example.com", subject: "Akademi", text, expiresAt: new Date(Date.now() + 3600000) });
before(async () => { await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname }); });
after(async () => { await client.close(); });

test("queued email is encrypted, deduplicated, and claimed once across concurrent workers", async () => {
  const message = makeMessage("https://example.com/reset?token=secret");
  await outbox.enqueue(message);
  await outbox.enqueue(message);
  const rows = await db.select().from(schema.emailDeliveries);
  assert.equal(rows.length, 1);
  assert.ok(!rows[0].encryptedMessage.includes("secret"));
  assert.ok(!rows[0].encryptedMessage.includes(message.to));
  const sends = [];
  const send = async (value, key) => { sends.push({ value, key }); return "resend-1"; };
  await Promise.all([outbox.deliverBatch(send), outbox.deliverBatch(send)]);
  assert.equal(sends.length, 1);
  assert.equal(sends[0].value.text, message.text);
  assert.equal(sends[0].key, rows[0].id);
  const [sent] = await db.select().from(schema.emailDeliveries);
  assert.equal(sent.status, "sent");
  assert.equal(sent.encryptedMessage, null);
});

test("delivery failure is recoverable without leaking message details", async () => {
  await outbox.enqueue(makeMessage("retry-message"));
  const keys = [];
  await outbox.deliverBatch(async (_, key) => { keys.push(key); throw new Error("provider message includes private token"); });
  const [failed] = await db.select().from(schema.emailDeliveries).where(eq(schema.emailDeliveries.status, "failed"));
  assert.equal(failed.lastError, "delivery_failed");
  assert.ok(failed.encryptedMessage);
  assert.equal(failed.attemptCount, 1);
  await outbox.deliverBatch(async () => assert.fail("retry backoff must apply"));
  await db.update(schema.emailDeliveries).set({ availableAt: new Date(0) }).where(eq(schema.emailDeliveries.id, failed.id));
  await outbox.deliverBatch(async (_, key) => { keys.push(key); return "resend-2"; });
  assert.equal(keys[0], keys[1], "retry reuses provider idempotency key");
});

test("expired messages are erased and crashed workers can be recovered", async () => {
  await outbox.enqueue({ ...makeMessage("expired-message"), expiresAt: new Date(0) });
  await outbox.deliverBatch(async () => assert.fail("expired email must not send"));
  const [expired] = await db.select().from(schema.emailDeliveries).where(eq(schema.emailDeliveries.status, "expired"));
  assert.equal(expired.encryptedMessage, null);
  await outbox.enqueue(makeMessage("crashed-worker-message"));
  await db.update(schema.emailDeliveries).set({ status: "sending", leaseExpiresAt: new Date(0), attemptCount: 1 }).where(eq(schema.emailDeliveries.status, "pending"));
  assert.equal((await outbox.deliverBatch(async () => "resend-3")).sent, 1);
});
