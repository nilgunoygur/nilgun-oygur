# Akademi implementation status

15 September 2026 — first execution slice, database and access rules.

## Implemented

- Drizzle PostgreSQL schema and versioned SQL migration for the 17 initial tables, including Better Auth core/two-factor storage and a separate owner table.
- Lazy server-only database connection using Postgres.js. Existing public builds do not require a database connection.
- Database constraints for course/module ownership, course-scoped lesson slugs, purchase buyer/course matching, grant source/reasons, unique payment identifiers, event deduplication, TRY prices, durations, and required legal versions.
- Pure access predicates covering student/course identity, expiry, revocation, ten-minute playback expiry, and the live join window. These are internal rules, not authenticated endpoints. Future callers must load the session and records on the server, enforce publication status, and never accept a grant supplied by the browser.
- Migration integration tests using PGlite (embedded PostgreSQL), plus time-boundary tests. These do not require provider credentials or modify a remote database.

## Review decisions and implementation requirements

1. **Renewal:** the partial unique index includes expired, unrevoked grants. In the future fulfillment transaction, lock the student's user row (also for owner grants), check existing access, retire an expired grant with reason `expired_replaced`, then insert the new grant. Concurrent callbacks must also lock the order and verify its state. Never replace an active grant. The integration tests exercise the index and replacement sequence; the fulfillment service is not implemented yet.
2. **Owner grants:** an audited owner grant is a valid access source, alongside a verified purchase. The source is enforced in storage. Playback authorization must accept both, while owner preview needs its own authenticated MFA-protected path.
3. **Lesson ownership:** lessons store `course_id` explicitly and use a composite foreign key to modules. This makes course-scoped slug uniqueness enforceable without trusting application input.
4. **Publication:** the schema rejects published recorded lessons with no asset, but cross-table readiness checks belong in the publication transaction and playback handler. A ready asset must have a signed playback identifier. Draft lessons/modules remain inaccessible to students. The preview flag does not authorize anonymous media; launch playback remains authenticated until preview behavior is explicitly defined.
5. **Legal snapshots:** required version identifiers are present in order storage. The checkout service must select current server-owned versions and make order/item snapshots immutable after creation. Keep the actual versioned legal documents permanently retrievable; never rely only on a mutable legal page.
6. **Provider callbacks:** only verified events belong in `provider_events`. Avoid retaining unrestricted raw payment payloads/PII. Confirm Shopier's signature and trusted amount lookup before implementing fulfillment. A callback without authenticated amount verification goes to review and grants no access. Provider event identity and payload hash conflicts must be handled explicitly.
7. **Emails:** add a durable transactional outbox before fulfillment. The plan's send-after-commit sequence alone loses confirmation messages if the process stops after commit. Deduplicate each message, retain failures for the attention list, and key live reminders by session/calendar revision. Email failure must never reverse a payment.
8. **Calendar:** increment `calendar_sequence` on rescheduling/cancellation and retain a stable event UID derived from session ID. Calendar files and emails must contain the lesson URL, never Zoom credentials.
9. **Authentication:** the initial storage follows Better Auth's documented core fields. When installing Better Auth, compare its generated schema for the pinned version and configured plugins before wiring the adapter. Validate actual registration, verification, reset, rate limits, and MFA flows; having the tables does not establish authentication.
10. **Scope and estimates:** provider pricing/free limits, Google course listing eligibility, and Turkish legal wording are planning assumptions requiring confirmation before launch. No provider accounts, prices, legal texts, or production behavior were approved by this implementation.

## Local database workflow

```bash
pnpm install
cp .env.example .env.local
# Set DATABASE_URL to the development Neon pooled URL.
# Optionally set DATABASE_MIGRATION_URL to the direct development URL.
pnpm run db:check
pnpm run db:migrate
```

Use a separate development database. The migration command changes the database named in the environment; take the planned snapshot and review the generated SQL before migrating production. No database has been provisioned or remotely migrated in this slice.

For a schema change:

```bash
pnpm run db:generate
pnpm run db:check
pnpm test
pnpm run lint
pnpm run build
```

Commit the schema, generated SQL, Drizzle metadata, and `pnpm-lock.yaml` together. Avoid `drizzle-kit push` for managed environments. `updated_at` defaults on insert and is updated by Drizzle application updates; raw SQL maintenance must update it explicitly.

The runtime database module must only be used behind an authenticated data access layer. It is not a generic CRUD API. Audit entries and financial snapshots must not have public update/delete operations.

## Verification completed

- `pnpm test`: 13 tests passed, including migration application/idempotency and PostgreSQL constraints.
- `pnpm run lint`, `pnpm exec tsc --noEmit`, and `pnpm run db:check`: passed.
- `pnpm run build`: passed without academy credentials.
- `TEST_ORIGIN=http://localhost:3107 pnpm run test:routes`: all 18 existing content routes returned 200 with headings; unknown route returned 404.
- `git diff --check`: passed.

Next.js reported an unrelated lockfile outside this repository (`/Users/harman/pnpm-lock.yaml`). No files outside this project were changed. Neon connectivity, concurrent production transactions, Better Auth compatibility with an installed version, and real provider flows remain unverified.

## Next execution slices

1. Install/configure Better Auth and Resend, verify generated schema, implement verified email/password flows and owner MFA gates with integration tests. Add durable email delivery storage.
2. Prove Shopier form signing, callback authenticity, amount verification, reconciliation and refund capabilities against Nilgün's merchant account; record observed fields and a test result. Until proven, leave checkout unavailable.
3. Prove one signed Mux upload/playback lifecycle using Nilgün's development environment.
4. Build database-backed public catalog, authenticated student routes, and the owner content panel. Add route checks and UI QA as each route is implemented.
5. Implement transactional payment fulfillment, owner grants, refunds, protected media, live links, calendar files, and email jobs using the acceptance criteria in the development plan.

Provider account ownership, content, legal documents, and production acceptance remain the owner's inputs listed in the development plan. Secrets belong in local ignored environment files or Vercel, never in this document or chat.

## References checked for the foundation

- [Next.js local data security guide](../../node_modules/next/dist/docs/01-app/02-guides/data-security.md)
- [Drizzle constraints](https://orm.drizzle.team/docs/indexes-constraints)
- [Drizzle migrations](https://orm.drizzle.team/docs/migrations)
- [Better Auth database model](https://better-auth.com/docs/concepts/database)
- [Better Auth two-factor storage](https://better-auth.com/docs/plugins/2fa)
