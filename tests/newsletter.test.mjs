import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../lib/db/schema.ts";
import { subscribeSchema } from "../lib/contact-schema.ts";
import { listSubscribers, subscribe } from "../lib/newsletter.ts";

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

test("the form accepts only email addresses", () => {
  assert.equal(subscribeSchema.safeParse({ email: " ayse@example.com " }).data?.email, "ayse@example.com");
  for (const email of ["", "ayse", "ayse@", `${"a".repeat(250)}@example.com`]) assert.equal(subscribeSchema.safeParse({ email }).success, false, email);
});

test("the owner list is newest first, searchable and paged", async () => {
  const at = (minutes) => new Date(Date.UTC(2026, 9, 1, 12, minutes));
  await db.insert(schema.newsletterSubscribers).values(Array.from({ length: 26 }, (_, i) => ({ email: `reader_${i}@example.com`, createdAt: at(i) })));
  const first = await listSubscribers(db, {});
  assert.deepEqual([first.total, first.pages, first.subscribers.length, first.subscribers[0].email], [27, 2, 25, "ayse@example.com"]);
  const beyond = await listSubscribers(db, { page: "99" });
  assert.deepEqual([beyond.filter.page, beyond.subscribers.length], [2, 2], "a page past the end shows the last page");
  const found = await listSubscribers(db, { q: "READER_25" });
  assert.deepEqual([found.matching, found.total, found.subscribers.map(item => item.email)], [1, 27, ["reader_25@example.com"]]);
  assert.equal((await listSubscribers(db, { q: "%" })).matching, 0, "search treats % as plain text");
});
