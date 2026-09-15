# Akademi implementation status

15 September 2026 — database foundation, development Neon, authentication screens, and protected account/MFA pages.

## Implemented

- Drizzle PostgreSQL schema and versioned SQL migration for the 17 initial tables, including Better Auth core/two-factor storage and a separate owner table.
- Lazy server-only database connection using Postgres.js. Existing public builds do not require a database connection.
- Database constraints for course/module ownership, course-scoped lesson slugs, purchase buyer/course matching, grant source/reasons, unique payment identifiers, event deduplication, TRY prices, durations, and required legal versions.
- Pure access predicates covering student/course identity, expiry, revocation, ten-minute playback expiry, and the live join window. These are internal rules, not authenticated endpoints. Future callers must load the session and records on the server, enforce publication status, and never accept a grant supplied by the browser.
- Migration integration tests using PGlite (embedded PostgreSQL), plus time-boundary tests. These do not require provider credentials or modify a remote database.

## Authentication backend added

- Better Auth is pinned to 1.7.5, mounted at `/api/auth/[...all]`, with verified email/password login, neutral registration/reset responses, one-hour verification/reset links, no automatic sign-in, and database-backed rate limits.
- The installed two-factor plugin schema was inspected and its `verified`, `failedVerificationCount`, and `lockedUntil` fields added in migration `0001`. Real Better Auth adapter flows run against the migrated PostgreSQL schema in tests.
- Owner authorization requires a verified student session, a protected `academy_owners` row, enabled MFA, and a server-written `owner_mfa_sessions` proof for that exact session. Only a successful TOTP/backup-code endpoint writes the proof. A trusted-device password login alone does not qualify for owner access.
- Enabling MFA revokes earlier sessions. As a conservative policy, profile updates on MFA-enabled accounts also revoke sessions. Better Auth's MFA enrollment then issues the replacement session.
- Auth emails are encrypted in `email_deliveries` with a separate stable `EMAIL_ENCRYPTION_KEY`. Successful/expired messages have their payload erased. Failures retain a generic error for the future attention UI. Claims use expiring leases; retries use a stable Resend idempotency key, exponential backoff, and a five-attempt limit.
- Relevant auth POST requests run a delivery batch through Next.js `after`. `GET /api/internal/email-delivery` and `POST /api/internal/email-delivery` accepts only `Authorization: Bearer <CRON_SECRET>` for retries. No scheduler is configured yet: configure a periodic caller before opening registration. The GET entry point supports Vercel Cron, but the current Hobby team only permits daily schedules. Frequent retries need an appropriate scheduler or a separately approved plan change; no paid upgrade or schedule was configured.
- Authentication returns an uncached 503 until database, auth, encryption, and Resend environment variables are supplied. No fake success or console-printed verification links are used. Existing public pages continue to build without them.

## Screens and development infrastructure

- Public `/akademi` promotion page lists the four existing training programs, explains participation, and links to `/akademi/giris`. Desktop/mobile navigation, footer, auth return links, and sitemap include the public landing route. Course cards link to existing program details; online sales remain explicitly unavailable until checkout is implemented. Desktop/mobile layout and login navigation were checked.

- Turkish login, registration, forgotten-password, reset, and verification screens are implemented under `/akademi`. Unconfigured authentication displays an unavailable state and disables submission.
- `/akademi/hesabim` requires a verified session and lists actual active access grants. Lesson navigation and the full learning experience remain pending.
- `/yonetim/guvenlik` provides owner-only TOTP enrollment and backup codes; `/yonetim` requires MFA proof for the current session. The content/order management panel remains pending.
- Auth destinations are allowlisted, sensitive pages are noindex, and reset pages use a no-referrer policy.
- Vercel-managed Neon resource `nilgun-akademi-development` uses the Free plan in Frankfurt, connected only to development and preview. Both migrations were applied: 20 public tables and two migration records verified. A disposable real-Neon registration/verification smoke test passed and its user was removed; no email was sent.
- `vercel.json` selects pnpm builds and Frankfurt functions. Production database setup remains pending.
- Resend access and DNS verification were explicitly deferred by the owner. Registration remains disabled until email/auth configuration and retry scheduling are ready. The full browser/email journey has not been verified.

Email verification replay is an idempotent success in Better Auth once the address is verified; it does not issue a session or repeat verification side effects. Password reset tokens are consumed once, and expired tokens are rejected. This refines the plan's blanket “tokens cannot be reused” wording without adding custom token authentication.

## Review decisions and implementation requirements

1. **Renewal:** the partial unique index includes expired, unrevoked grants. In the future fulfillment transaction, lock the student's user row (also for owner grants), check existing access, retire an expired grant with reason `expired_replaced`, then insert the new grant. Concurrent callbacks must also lock the order and verify its state. Never replace an active grant. The integration tests exercise the index and replacement sequence; the fulfillment service is not implemented yet.
2. **Owner grants:** an audited owner grant is a valid access source, alongside a verified purchase. The source is enforced in storage. Playback authorization must accept both, while owner preview needs its own authenticated MFA-protected path.
3. **Lesson ownership:** lessons store `course_id` explicitly and use a composite foreign key to modules. This makes course-scoped slug uniqueness enforceable without trusting application input.
4. **Publication:** the schema rejects published recorded lessons with no asset, but cross-table readiness checks belong in the publication transaction and playback handler. A ready asset must have a signed playback identifier. Draft lessons/modules remain inaccessible to students. The preview flag does not authorize anonymous media; launch playback remains authenticated until preview behavior is explicitly defined.
5. **Legal snapshots:** required version identifiers are present in order storage. The checkout service must select current server-owned versions and make order/item snapshots immutable after creation. Keep the actual versioned legal documents permanently retrievable; never rely only on a mutable legal page.
6. **Provider callbacks:** only verified events belong in `provider_events`. Avoid retaining unrestricted raw payment payloads/PII. Confirm Shopier's signature and trusted amount lookup before implementing fulfillment. A callback without authenticated amount verification goes to review and grants no access. Provider event identity and payload hash conflicts must be handled explicitly.
7. **Emails:** the auth outbox is implemented; extend it transactionally before fulfillment. The plan's send-after-commit sequence alone loses confirmation messages if the process stops after commit. Deduplicate each message, retain failures for the attention list, and key live reminders by session/calendar revision. Email failure must never reverse a payment.
8. **Calendar:** increment `calendar_sequence` on rescheduling/cancellation and retain a stable event UID derived from session ID. Calendar files and emails must contain the lesson URL, never Zoom credentials.
9. **Authentication:** the adapter and two-factor storage now match the installed Better Auth 1.7.5 plugin fields, with real registration, verification, reset, rate-limit, and MFA integration tests. Recheck schema compatibility when updating the pinned version. Production/provider behavior still needs verification.
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

Use a separate development database. The migration command changes the database named in the environment; take the planned snapshot and review the generated SQL before migrating production. The development/preview resource described above is migrated. Production has not been migrated.

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

- `pnpm test`: 25 tests passed, including PostgreSQL migration constraints, real Better Auth flows, expiry, MFA, concurrent email claims, and retry recovery.
- `pnpm run lint`, `pnpm exec tsc --noEmit`, and `pnpm run db:check`: passed.
- `pnpm run build`: passed without academy credentials.
- `TEST_ORIGIN=http://localhost:3107 pnpm run test:routes`: all 18 existing content routes returned 200 with headings; unknown route returned 404. Five auth screens returned noindex pages; three protected routes redirected anonymous users; GET/POST email workers rejected unauthorized requests. Desktop and mobile registration layouts were inspected.
- `git diff --check`: passed.

Next.js reported an unrelated lockfile outside this repository (`/Users/harman/pnpm-lock.yaml`). No files outside this project were changed. Neon connectivity and a disposable auth flow passed. Production concurrency and real provider delivery remain unverified. Better Auth 1.7.5 compatibility was tested with the actual adapter and plugin.

## Next execution slices

1. When owner access becomes available, configure Resend and verified DNS, configure a frequent retry scheduler, and validate the full browser/email journey. Development Neon and the authentication screens are implemented.
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
