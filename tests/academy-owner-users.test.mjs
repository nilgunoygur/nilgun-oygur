import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../lib/db/schema.ts";
import { ownerUsers, userListFilter, USERS_PER_PAGE } from "../lib/akademi/owner-users.ts";

const client = new PGlite();
const db = drizzle(client, { schema });
const now = new Date("2026-09-27T12:00:00Z");
const DAY = 86_400_000;

before(async () => {
  await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  await db.insert(schema.user).values([
    { id: "owner", name: "Nilgün", email: "owner@example.com", emailVerified: true, twoFactorEnabled: true, createdAt: new Date(now.getTime() - 30 * DAY) },
    { id: "student", name: "Ayşe", email: "ayse@example.com", emailVerified: true, createdAt: new Date(now.getTime() - 2 * DAY) },
    { id: "pending", name: "Pending_Name", email: "late%user@example.com", createdAt: new Date(now.getTime() - DAY) },
  ]);
  await db.insert(schema.owners).values({ userId: "owner" });
  const [active, expired] = await db.insert(schema.courses).values([
    { slug: "aktif", shopierProductId: "3001" },
    { slug: "bitmis", shopierProductId: "3002" },
  ]).returning();
  const grant = (courseId, startsAt, expiresAt) => ({ userId: "student", courseId, grantedBy: "owner", grantReason: "Test", startsAt, expiresAt });
  await db.insert(schema.courseAccess).values([
    grant(active.id, new Date(now.getTime() - DAY), new Date(now.getTime() + DAY)),
    grant(expired.id, new Date(now.getTime() - 10 * DAY), new Date(now.getTime() - DAY)),
  ]);
  const session = (id, userId, updatedAt) => ({ id, userId, token: id, expiresAt: new Date(now.getTime() + DAY), updatedAt });
  await db.insert(schema.session).values([
    session("s1", "student", new Date(now.getTime() - 3 * 3_600_000)),
    session("s2", "student", new Date(now.getTime() - 3_600_000)),
  ]);
});
after(async () => { await client.close(); });

test("the owner sees every account, newest first, with role, active courses and latest session", async () => {
  const list = await ownerUsers(db, {}, now);
  assert.deepEqual(list.counts, { all: 3, owner: 1, student: 2 });
  assert.deepEqual(list.users.map(u => [u.id, u.owner]), [["pending", false], ["student", false], ["owner", true]]);
  const student = list.users.find(u => u.id === "student");
  assert.equal(student.activeCourses, 1, "expired grants do not count as active");
  assert.equal(student.lastSeenAt.getTime(), now.getTime() - 3_600_000);
  assert.equal(list.users.find(u => u.id === "pending").lastSeenAt, null);
});

test("role and search filters narrow the list; search treats % and _ as plain text", async () => {
  assert.deepEqual((await ownerUsers(db, { role: "owner" }, now)).users.map(u => u.id), ["owner"]);
  assert.deepEqual((await ownerUsers(db, { role: "student" }, now)).users.map(u => u.id), ["pending", "student"]);
  assert.deepEqual((await ownerUsers(db, { q: "AYŞE" }, now)).users.map(u => u.id), ["student"]);
  assert.deepEqual((await ownerUsers(db, { q: "%" }, now)).users.map(u => u.id), ["pending"]);
  assert.deepEqual((await ownerUsers(db, { q: "_" }, now)).users.map(u => u.id), ["pending"]);
  const none = await ownerUsers(db, { role: "owner", q: "ayse" }, now);
  assert.deepEqual([none.matching, none.users.length, none.counts.all], [0, 0, 3], "counts stay unfiltered");
});

test("unknown parameters fall back to the full first page", async () => {
  assert.deepEqual(userListFilter({ role: "admin", page: "-4", q: "  x  " }), { role: null, q: "x", page: 1 });
  const beyond = await ownerUsers(db, { page: "99" }, now);
  assert.deepEqual([beyond.filter.page, beyond.pages, beyond.users.length], [1, 1, 3], "a page past the end shows the last page");
  assert.equal(USERS_PER_PAGE, 25);
});
