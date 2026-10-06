import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../lib/db/schema.ts";
import { subscribeSchema } from "../lib/contact-schema.ts";
import { listSubscribers, removeSubscriber, subscribe, subscribersCsv } from "../lib/newsletter.ts";

const client = new PGlite();
const db = drizzle(client, { schema });

before(async () => { await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname }); });
after(async () => { await client.close(); });

test("an address is stored once, lowercased, however often it subscribes", async () => {
  await subscribe(db, "  Ayse@Example.com ");
  await subscribe(db, "ayse@example.com");
  const list = await listSubscribers(db, {});
  assert.deepEqual([list.total, list.subscribers.map(item => item.email)], [1, ["ayse@example.com"]]);
  await assert.rejects(db.insert(schema.newsletterSubscribers).values({ email: "Raw@Example.com" }), "the database refuses addresses that are not normalized");
});

test("the form refuses addresses the database would refuse", () => {
  assert.equal(subscribeSchema.safeParse({ email: " ayse@example.com " }).data?.email, "ayse@example.com");
  assert.equal(subscribeSchema.safeParse({ email: `${"a".repeat(250)}@example.com` }).success, false);
});

test("the owner list is newest first, searchable and paged", async () => {
  const at = (minutes) => new Date(Date.UTC(2026, 9, 1, 12, minutes));
  await db.insert(schema.newsletterSubscribers).values(Array.from({ length: 26 }, (_, i) => ({ email: `reader_${i}@example.com`, createdAt: at(i) })));
  const first = await listSubscribers(db, {});
  assert.deepEqual([first.total, first.pages, first.subscribers.length, first.subscribers[0].email], [27, 2, 25, "ayse@example.com"]);
  const beyond = await listSubscribers(db, { page: 99 });
  assert.deepEqual([beyond.page, beyond.subscribers.length], [2, 2], "a page past the end shows the last page");
  const found = await listSubscribers(db, { q: "READER_25" });
  assert.deepEqual([found.total, found.subscribers.map(item => item.email)], [27, ["reader_25@example.com"]]);
  assert.equal((await listSubscribers(db, { q: "%" })).subscribers.length, 0, "search treats % as plain text");
});

test("the owner chooses the page size and the order; an unknown page size falls back", async () => {
  const sorted = await listSubscribers(db, { perPage: 10, sort: [{ id: "email", desc: true }] });
  assert.deepEqual([sorted.pages, sorted.subscribers.length, sorted.subscribers[0].email], [3, 10, "reader_9@example.com"]);
  assert.equal((await listSubscribers(db, { sort: [{ id: "createdAt", desc: false }] })).subscribers[0].email, "reader_0@example.com");
  const fallback = await listSubscribers(db, { perPage: 7, page: NaN });
  assert.deepEqual([fallback.subscribers.length, fallback.subscribers[0].email], [25, "ayse@example.com"]);
});

test("the summary counts sign-ups from the last 30 days", async () => {
  const list = await listSubscribers(db, {}, new Date(Date.UTC(2026, 9, 31, 12, 10)));
  assert.equal(list.recent, 17, "reader_10 onwards, and the address subscribed during this run");
  assert.ok(list.latest > new Date(Date.UTC(2026, 9, 1, 12, 25)));
});

test("the export lists every subscriber and cannot be run as a formula", async () => {
  await db.insert(schema.newsletterSubscribers).values({ email: "=cmd@example.com", createdAt: new Date(Date.UTC(2020, 0, 1)) });
  const lines = (await subscribersCsv(db)).trimEnd().split("\r\n");
  assert.equal(lines.length, 29);
  assert.equal(lines[0], '\uFEFF"E-posta","Kayıt tarihi"');
  assert.equal(lines[1].split(",")[0], '"ayse@example.com"');
  assert.equal(lines.at(-1), `"'=cmd@example.com","2020-01-01T00:00:00.000Z"`);
});

test("the owner removes a subscriber; the audit entry does not keep the address", async () => {
  await db.insert(schema.user).values({ id: "owner", name: "Nilgün", email: "owner@example.com" });
  const [{ id }] = (await listSubscribers(db, { q: "ayse@" })).subscribers;
  assert.equal(await removeSubscriber(db, "owner", id), true);
  assert.equal(await removeSubscriber(db, "owner", id), false, "nothing left to remove");
  const audit = await db.select().from(schema.adminAuditLog);
  assert.deepEqual(audit.map(entry => [entry.action, entry.resourceId]), [["newsletter.subscriber_removed", id]]);
  assert.doesNotMatch(JSON.stringify(audit), /ayse/);
});
