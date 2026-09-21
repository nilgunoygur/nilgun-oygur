# Nilgün Oygur Akademi — Development Plan

Last reviewed: 15 September 2026

Commercial terms (agreed proposal): ₺55.000 + KDV, 50% at start and 50% at launch. Testable environment by the end of week 2, launch target end of week 4. All code, the domain, and every provider account are handed over to Nilgün at launch.

## Execution status — 15 September 2026

Week 1 now includes the database foundation, a migrated development Neon database, authentication screens, and protected account/MFA pages. See [implementation notes and next slices](docs/akademi/IMPLEMENTATION.md) for review findings and operational instructions.

- [x] Initial Drizzle schema, generated migration, server-only connection, and environment template.
- [x] Automated migration/constraint tests and access, expiry, playback lifetime, and live join-window rules.
- [x] Development Neon provisioning and remote migration (development and preview only; 20 tables, two migrations).
- [x] Better Auth backend, owner MFA authorization, encrypted Resend delivery queue, and local integration tests.
- [x] Turkish authentication/MFA forms and protected account/owner entry pages.
- [ ] Scheduled email retries and real provider/email verification. Resend/DNS connection deferred by the owner; registration remains disabled. Frequent retry scheduling needs a suitable scheduler; the current Vercel Hobby project has no schedule configured.
- [x] Shopier capability check (21 September): REST API and webhook flow implemented and tested locally with signed webhooks; the legacy payment form is not used.
- [ ] Real ₺1 Shopier test purchase on a deployed environment; Mux signed playback proof.
- [x] Public Akademi promotion page, course previews, header/footer navigation, and student-login routing.
- [ ] Database-backed sales catalog, full student and owner UI, payment fulfillment, and remaining launch scope.

Review clarifications: renewal must retire an expired unrevoked grant in the same transaction; playback accepts audited owner grants as well as purchase grants; email delivery needs a durable outbox; draft/preview behavior must not bypass authenticated playback. Details are recorded in the implementation notes. This is an initial foundation, not completion of week 1.

## 1. Product decisions

Build the Akademi inside the existing Next.js website under `/akademi`. Students buy individual courses through Shopier and can use only the courses they purchased for a configurable period, defaulting to 365 days from confirmed payment.

Confirmed launch decisions:

- Purchases and access are per course, not an all-access membership.
- A course is a flexible, ordered mix of lessons. A lesson is either a **recorded video** or a **scheduled live Zoom session**. After a live session, its recording is attached to the same lesson and becomes watchable.
- Access begins when payment is verified and lasts for the course's access duration.
- Students use verified email and password authentication.
- Nilgün receives an owner administration panel with authenticator-app two-factor login.
- Videos use signed private streaming without DRM for the first version.
- Existing public pages, URLs, and visual language remain intact. The existing `/egitimlerim` pages continue to describe in-person and online trainings and link to the matching `/akademi` course where one exists.
- Provider ownership is handed over to Nilgün at launch. Development may use Hasan's Vercel project and transferable infrastructure integrations, as authorized on 15 September 2026; see section 4.

Each purchase snapshots the course price, currency, access duration, and the accepted legal text versions. Later course changes cannot shorten an existing student's access. Students may watch without limits until expiry. New lessons, including newly scheduled live sessions, published within a purchased course are included for students whose access is still active. Active access blocks duplicate purchases; expired access can be renewed with a new purchase. Archiving stops new sales without removing existing access.

## 2. Launch scope

In scope for launch:

- Public course catalog and course pages under `/akademi`, including upcoming live session dates.
- Student registration, login, email verification, and password reset.
- Shopier checkout on Shopier product pages, signed-webhook fulfillment, and expiring access. Refund handling awaits the owner's policy decision.
- Recorded video lessons with signed playback and progress.
- Live Zoom lessons with a calendar, protected join link, reminder email, and recording publication.
- Owner panel for courses, lessons, uploads, live sessions, students, orders, and access.
- Legal consent at checkout, cookie consent, Google Analytics, Search Console, Merchant Center feed, and Google Ads conversion linking.
- Handover of code, domain, and all accounts.

Deferred to a later version:

- Subscriptions, bundles, quizzes, certificates, offline downloads, DRM, and device limits.
- Seat limits and waitlists for live sessions.
- Automatic Zoom meeting creation and automatic cloud-recording import through the Zoom API.
- Separate review queues for email delivery and video processing failures (launch uses one "needs attention" list).
- Student session management and account-change notification emails.
- Recovery codes and session revocation screens for administrator MFA beyond Better Auth defaults.
- Google Ads campaign creation and management (Nilgün may work with an ads specialist).

## 3. Recommended low-cost stack

| Component | Responsibility | Initial cost |
| --- | --- | ---: |
| Next.js on Vercel Pro | Website, server rendering, server actions, callbacks, cron jobs | $20/month plus excess usage |
| Better Auth | Email/password login, sessions, verification, password reset, owner two-factor | No separate subscription |
| Neon PostgreSQL | Authentication and academy database | $0 within Free limits |
| Drizzle ORM | Typed schema, queries, and migrations | Free |
| Resend | Transactional email | $0 within Free limits (3,000/month, 100/day) |
| Mux | Upload processing, adaptive playback, signed delivery for videos and live recordings | Usage based; approximately $4/month at launch estimate |
| Zoom | Live sessions, using Nilgün's own Zoom account | Nilgün's existing subscription |
| Shopier | Product pages, payment, order API and webhooks | 2.99–5.99% + ₺0.49 per transaction, plus VAT |
| Google Analytics, Search Console, Merchant Center | Measurement, search visibility, shopping listings | Free |

Expected starting infrastructure cost is approximately **$24/month**, excluding taxes, domain renewal, Shopier fees, Zoom, and usage beyond free allowances. Vercel Pro is required because Hobby is limited to non-commercial use.

Cost notes:

- Zoom's free plan limits group meetings to 40 minutes and has no cloud recording. Longer sessions need a paid plan. Local recording can be uploaded manually.
- Each live recording adds its full runtime to Mux storage and delivery. A two-hour session watched by 50 students adds 100 viewing hours.
- Resend's 100 emails/day limit is the first limit a live course will hit: a reminder to more than ~90 buyers on one day needs Resend Pro ($20/month). Upgrade before a live session whose buyer count approaches the limit.

### Why this stack

Better Auth runs inside the existing application and stores its records in the same PostgreSQL database as courses and purchases. Neon integrates directly with Vercel and can start on its free tier. Drizzle keeps the database model explicit and version controlled.

Resend is preferred over Cloudflare Email Service for launch because Cloudflare's unrestricted outbound email requires Workers Paid and is currently beta.

Mux is preferred over UploadThing and a custom AWS pipeline because it supplies upload processing, adaptive streaming, a player, and signed playback in one service. Zoom stays in Nilgün's own account because students and Nilgün already know it and live video infrastructure is outside this budget.

## 4. Accounts and ownership

Development exception authorized on 15 September 2026: use `hasanharmans-projects/nilgun-oygur` on Vercel and add required transferable infrastructure integrations there, then transfer them to Nilgün at handover. This supersedes the original day-one ownership requirement for that development infrastructure. Vercel project transfer and Neon Marketplace resource transfer are separate operations; the destination team needs the Neon integration installed, and the database must be disconnected and reconnected during transfer. Track ownership and billing for each resource. Other provider accounts should still use Nilgün-owned identities.

References: [Vercel project transfer](https://vercel.com/docs/projects/transferring-projects), [Marketplace resource transfer](https://vercel.com/docs/integrations/install-an-integration/product-integration#transfer-a-resource-to-another-team).

Target ownership at launch:

- GitHub repository (transferred to Nilgün's account or organization at launch).
- Domain registrar and DNS for `nilgunoygur.com`.
- Vercel team and project.
- Neon project.
- Mux environment.
- Resend team and verified sending domain.
- Shopier merchant account, personal access token, and webhook subscription.
- Zoom account.
- Google Analytics property, Search Console property, Merchant Center account, and Google Ads account.

Nilgün enters payment methods for paid providers herself. Secrets live only in Vercel environment variables and are never committed.

Handover checklist at launch:

- Owner role confirmed on every account above.
- Repository transferred, with README instructions for running, deploying, and restoring.
- Latest database snapshot and a `pg_dump` file delivered to Nilgün.
- Developer access removed or retained according to Nilgün's written decision.

## 5. Course model and live sessions

A course contains ordered modules; each module contains ordered lessons. Courses may be video-only, live-only, or mixed, for example three recorded videos followed by one live Zoom session.

### Recorded video lessons

The owner uploads a video; the lesson can be published only after Mux processing completes.

### Live lessons

A live lesson stores its start time, planned duration, Zoom join URL, and Zoom passcode. All times are stored in UTC and displayed in `Europe/Istanbul`.

Student experience:

- **Before the session:** students with active access see the date, time, and duration; they can add the session to their calendar with a downloadable `.ics` file. The public course page lists session dates.
- **Join window:** the Zoom link and passcode are rendered server-side only for students with active access, from 30 minutes before start until 30 minutes after the planned end. They never appear in emails, public pages, API responses for other users, or cached HTML.
- **Reminder:** one email 24 hours before the session links to the lesson page, not to Zoom, so forwarded emails do not reveal the meeting.
- **After the session:** the lesson shows "Kayıt hazırlanıyor" until the owner uploads the recording. When the recording is published, the lesson becomes a normal protected video and students with active access receive one email.
- **Late buyers:** students who buy after the session see the recording, or "Kayıt hazırlanıyor" if it is not yet published.
- **Changes:** rescheduling or cancelling a session updates the calendar data and emails students with active access.

Owner experience:

- Create a live lesson with date, time, duration, Zoom link, and passcode copied from Zoom.
- See a calendar list of upcoming sessions with the number of students who have access.
- After the session, upload the recording (downloaded from Zoom cloud or a local recording) to the same lesson and publish it.
- Optionally set a course sales end date, for example to stop sales once a live cohort starts.

Zoom security guidance for Nilgün: use a passcode and waiting room for every session, and do not publish the link elsewhere. Signed-in join-link delivery reduces casual sharing but cannot prevent a buyer from sharing the link; per-attendee Zoom registration is a later option.

## 6. Database design

Use one Neon project for authentication and academy records. Store videos in Mux and keep only Mux identifiers and metadata in PostgreSQL.

Neon Free currently includes 0.5 GB storage, 100 compute-unit hours per project/month, 5 GB public network transfer, scale-to-zero after five minutes, 6 hours of point-in-time restore, and one manual snapshot. Use pooled connections, locate Neon and Vercel in compatible regions, and move to the usage-based Launch plan when measured usage or recovery needs justify it.

Entities:

- Better Auth users, accounts, sessions, verification tokens, and two-factor records.
- `courses`: slug, title, description, cover, price in kuruş (integer), currency fixed to `TRY`, access duration in days, optional sales end date, optional related `/egitimlerim` slug, Shopier product ID and link (required to publish), status, and timestamps.
- `modules`: course, title, position, and publication status.
- `lessons`: module, slug (unique within course), title, description, position, kind (`video` or `live`), preview flag, publication status, and optional video asset.
- `live_sessions`: lesson, start time (UTC), planned duration, Zoom join URL, Zoom passcode, status (`scheduled`, `rescheduled`, `cancelled`, `completed`), reminder sent time, and recording published time.
- `video_assets`: Mux asset and signed playback identifiers, upload state, duration, aspect ratio, and failure details.
- `shopier_purchases`: Shopier order ID and course (unique together), normalized buyer email, amount, currency, payment time, access duration snapshot, and the claiming student and time.
- `course_access`: student, course, source purchase or owner grant, start, expiry, revocation time, and reason.
- `lesson_progress`: student, lesson, last position, completion, and last activity.
- `provider_events`: provider, event identity, verified payload hash, processing status, attempt count, and error details.
- `admin_audit_log`: actor, action, affected resource, reason, and timestamp.

Constraints:

- Unique `(shopier_order_id, course_id)`; a purchase is claimed by at most one student, and its grant must match that student and course.
- One unrevoked grant per student and course, enforced with a partial unique index on `course_access (user_id, course_id) WHERE revoked_at IS NULL`. The fulfillment transaction serializes grants per student, checks expiry, and retires an expired prior grant with reason `expired_replaced` before renewal. An active grant is never replaced.
- Unique `(course_id, lesson slug)`.
- Claim a purchase and create its access grant in one transaction, exactly once.

Do not expose database credentials or generic CRUD endpoints to browser code. Every server operation validates the session, resource ownership, and owner role.

## 7. Authentication and email

Integrate Better Auth through the App Router route handler and the Drizzle PostgreSQL adapter.

Students:

- Email/password registration with an eight-character minimum password.
- Email verification required before checkout.
- Login, logout, remember-me sessions, and password reset.
- Neutral responses for registration and password recovery.
- Better Auth's built-in rate limiting on login, registration, resend, and reset.

Owner:

- Better Auth two-factor plugin with an authenticator app.
- Owner role stored in protected database data, never in editable profile metadata, and checked in every owner page, server action, route handler, and playback or join-link request.

Use Resend with a verified sending subdomain such as `mail.nilgunoygur.com`, with SPF, DKIM, and DMARC. Use `butunselsifaakademi@gmail.com` or Nilgün's chosen support address as Reply-To.

Launch emails:

- Email verification.
- Password reset.
- Purchase confirmation, including upcoming live session dates.
- Live session reminder 24 hours before start.
- Live session rescheduled or cancelled.
- Recording published.

Normal login sends no email. Email failure never reverses a verified payment or access grant; failures appear in the owner's "needs attention" list.

## 8. Routes and user experience

Public:

- `/akademi`: published course catalog.
- `/akademi/[slug]`: description, curriculum, live session dates, price, access duration, and purchase action. Includes schema.org `Course` structured data.
- `/akademi/giris`, `/akademi/kayit`, `/akademi/sifremi-unuttum`, `/akademi/sifre-yenile`: authentication.
- `/akademi/odeme/[orderId]`: payment result page showing paid, verifying, failed, or review state from the internal order only.
- Legal pages: mesafeli satış sözleşmesi, ön bilgilendirme formu, KVKK aydınlatma metni, çerez politikası.

Student:

- `/akademi/hesabim`: purchased courses, completion, and expiry dates.
- `/akademi/hesabim/takvim`: upcoming live sessions across purchased courses.
- `/akademi/hesabim/[courseSlug]`: course overview and module navigation.
- `/akademi/hesabim/[courseSlug]/[lessonSlug]`: protected video player, live session details and join window, or recording.

Owner:

- `/yonetim`: overview with upcoming live sessions, recent sales, and the "needs attention" list (unverified payments, failed uploads, failed emails).
- Course, module, and lesson creation, ordering, publication, and archiving.
- Live session scheduling, rescheduling, cancellation, and recording upload.
- Mux upload and processing status.
- Price, access duration, sales end date, and status.
- Student, order, and access search.
- Manual grant, extension, revocation, payment approval, and refund marking, each with a required reason and audit entry.

Existing site integration:

- Add "Akademi" to the header navigation.
- Link each `/egitimlerim/[slug]` page to its related `/akademi` course when one is published.
- Serve the catalog from the database; cache public catalog pages and revalidate on owner changes.
- Add academy routes to `app/sitemap.ts` and `tests/check-routes.mjs`. Keep student, owner, payment, and auth routes out of the sitemap and mark them `noindex`.
- Add the shadcn components the forms, tables, dialogs, and calendar lists need, using existing Tailwind tokens, Recoleta and General Sans, Motion behavior, and responsive conventions.

Keep Server Components as the default; isolate forms, the player, and consent controls in focused Client Components.

## 9. Shopier payment flow

Revised 21 September 2026 after checking the Shopier Developer Portal against Nilgün's account. The legacy signed payment form ("API V1") is no longer offered; Shopier's supported integration is its REST API plus signed webhooks. Payment therefore happens entirely on Shopier product pages, and the site learns about purchases from Shopier.

Observed on this account with a personal access token (all scopes): creating products, reading orders, and managing webhooks work. Reading, listing, and updating products return 403. The course list therefore lives in our database; each course stores its Shopier product ID and link.

Purchase sequence:

1. `/akademi` lists published courses from the database. "Satın al" opens `/akademi/[slug]/satin-al`, which asks the student to sign in and to use their account email at Shopier, then links to the Shopier product page. Buying without an account is allowed.
2. Shopier sends `order.created` to `/api/shopier/webhook`. The `Shopier-Signature` header (hex HMAC-SHA256 of the raw body with the webhook token) is verified in constant time; unsigned requests get 401.
3. Each line of a paid order whose product belongs to a course is stored once in `shopier_purchases` with the buyer email, amount, payment time, and the course's access duration at that moment. Webhook IDs are deduplicated in `provider_events`, which keeps only the payload hash.
4. If a verified account has the buyer email, access is granted in the same step. Otherwise the purchase waits and is granted when a student with that verified email opens `/akademi/hesabim`.
5. A student who paid with a different email enters the Shopier order number and the email used at Shopier in "Siparişimi ekle". The server fetches the order from Shopier, checks the email and payment, and grants it once. Five attempts per student per hour.
6. Access starts at the payment time and lasts the stored duration. Buying again while access is active extends it.
7. A daily Vercel Cron call to `/api/internal/shopier-sync` re-reads the last seven days of orders, in case a webhook was missed.

Refunds: not automated until the owner decides the policy. Shopier's `refund.updated` webhook and refund API are available when needed.

Never grant access from an unsigned request, a client-supplied status or amount, a screenshot, or an unverified payload.

## 10. Private Mux playback

The owner uploads directly to Mux using temporary upload URLs created by an authorized server action. Mux webhooks update asset state. Video lessons and live recordings cannot be published until ready.

Use signed-only playback identifiers. Before issuing a playback token, the server checks:

- A valid Better Auth session.
- The requested lesson belongs to the course.
- An unrevoked course-access grant from a verified purchase or an audited owner grant.
- `starts_at <= now < expires_at` using server time.

Issue a signed token valid for at most ten minutes or until access expiry, whichever comes first, and refresh during playback only after repeating the check. Do not expose signing keys, public playback IDs, or downloadable renditions, and do not publicly cache protected responses.

Signed streaming prevents public links and casual sharing but cannot prevent screen recording. Issued tokens and buffered media can remain usable briefly after revocation, bounded by the token lifetime.

Nilgün keeps original video files and Zoom recordings in her own storage (for example Google Drive) for recovery; the academy does not store masters.

## 11. Legal and invoicing (Turkey)

Required before public sales:

- Mesafeli Satış Sözleşmesi and Ön Bilgilendirme Formu shown and accepted before payment.
- Explicit consent that digital content is delivered immediately and the effect this has on the right of withdrawal, including how scheduled live sessions are treated.
- KVKK aydınlatma metni.
- Cookie consent that blocks analytics and advertising cookies until accepted.

Nilgün provides the legal texts, prepared by her advisor or from a vetted template; the developer publishes them and records accepted versions with each order.

Shopier does not issue invoices on Nilgün's behalf. Issuing e-Arşiv invoices for each sale is Nilgün's and her accountant's responsibility; the owner panel exports orders (date, buyer, course, amount, payment identifier) as CSV to support this.

## 12. Google visibility and measurement

- **Google Analytics 4:** installed with Consent Mode v2 behind the cookie banner. Track course page views, checkout starts, and purchases. Fire the purchase event once per paid order from the result page, deduplicated by order ID.
- **Google Search Console:** verify the domain through DNS and submit the sitemap. Course pages carry `Course` structured data.
- **Google Merchant Center:** publish a product feed of active courses from the database (`/akademi/feed.xml`). Listing depends on Google's policies for online courses; if the feed is disapproved, the site continues without it.
- **Google Ads:** link Ads with Analytics and import the purchase event as a conversion. Campaign setup and management are out of scope.

## 13. Operations and cost controls

- Cache public catalog pages; keep account, payment, join-link, and playback responses uncached.
- Save progress at most once per minute, plus on pause and completion.
- Vercel Cron jobs: hourly for live session reminders; daily for payment reconciliation (when the Shopier API allows it).
- Set Mux, Vercel, Neon, and Resend usage alerts before launch, and check Resend's daily limit before each live session.
- Use separate development and production credentials and data; test payments use Shopier's test mode or a low-priced hidden course.
- Take a Neon snapshot before launch and before each migration. Deliver a monthly `pg_dump` file to Nilgün's storage.
- Do not send login codes or marketing email.

## 14. Delivery schedule

| Week | Deliverables |
| --- | --- |
| 1 | Accounts created in Nilgün's name. Shopier form, callback signature, and API capabilities proven with a test payment. One signed Mux video and one Resend email working. Drizzle schema and migrations. Better Auth registration, verification, login, reset, and owner two-factor. |
| 2 | **Testable environment.** `/akademi` catalog and course pages. Owner panel for courses, modules, video and live lessons, uploads, and publishing. Test checkout with verified fulfillment and expiring access. Protected playback, progress, join window, student calendar, and `.ics` download. |
| 3 | Nilgün's feedback applied. Refund handling, reconciliation or manual approval list, reminder, reschedule, and recording-published emails. Legal pages and checkout consent. Cookie consent, Google Analytics, Search Console, Merchant Center feed, and Ads conversion linking. Header navigation, `/egitimlerim` links, sitemap, and route checks. |
| 4 | Real low-value payment and refund on production. One rehearsal live session with invited students, including recording upload. Acceptance criteria verified. `pnpm lint`, `pnpm test`, and `pnpm build` pass. Launch and handover checklist completed. |

Access expiry is verified in the test environment with a short-duration course, since a full 365-day lifecycle cannot be observed before launch.

The schedule assumes Shopier integration approval, the first course's content, legal texts, and a Google account are available by the end of week 1.

## 15. Acceptance criteria

The release must prove:

- Purchasing course A grants A and never course B, including through direct requests.
- Anonymous, unpaid, expired, and revoked users cannot receive or refresh playback tokens.
- Access expiry and token renewal work during a long playback session.
- Forged, repeated, and out-of-order callbacks do not grant incorrect or duplicate access.
- A payment whose buyer closed the browser is fulfilled by reconciliation or appears in the owner's approval list.
- Full refunds revoke access; partial refunds never revoke automatically.
- Students cannot read or modify another student's purchases, access, or progress.
- Students cannot grant themselves the owner role or alter price, access, or consent snapshots.
- Failed or incomplete uploads cannot appear as playable lessons.
- The Zoom link and passcode never appear for non-buyers, outside the join window, in emails, or in cached responses.
- Students who buy after a live session see its recording once published, and "Kayıt hazırlanıyor" before that.
- Rescheduling a session updates dates shown to students and in `.ics` downloads, and notifies students with active access.
- Session times display correctly in `Europe/Istanbul`.
- Each paid order records the accepted legal text versions.
- Analytics and advertising scripts do not load before cookie consent.
- Verification and password reset tokens expire and cannot be reused.
- Email quota exhaustion and delivery failures show recoverable states without corrupting payment or access data.
- The academy works in mobile Safari and current desktop browsers.
- Existing public pages and URLs continue to work.
- `pnpm lint`, meaningful automated tests, route checks, and `pnpm build` pass.

## 16. Owner inputs

Needed by the end of week 1:

- Shopier account with two-factor authentication enabled and integration/API access approved.
- First course: title, description, cover image, price, access duration, module and lesson list, videos, and live session dates with Zoom links.
- Zoom account suitable for sessions longer than 40 minutes.
- Legal texts: distance sales contract, preliminary information form, KVKK notice, cookie policy.
- Access to the domain registrar and a Google account for Analytics, Search Console, Merchant Center, and Ads.
- Payment methods entered on Vercel and Mux.

Use pnpm for every dependency and project command. Commit `pnpm-lock.yaml` as the only lockfile.

## 17. Provider references

- [Better Auth](https://better-auth.com/)
- [Better Auth email and password](https://better-auth.com/docs/authentication/email-password)
- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
- [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)
- [Better Auth two-factor plugin](https://better-auth.com/docs/plugins/2fa)
- [Better Auth rate limits](https://better-auth.com/docs/concepts/rate-limit)
- [Neon plans](https://neon.com/docs/introduction/plans)
- [Neon Vercel integration](https://neon.com/docs/guides/vercel-managed-integration)
- [Resend pricing](https://resend.com/pricing)
- [Mux private playback](https://www.mux.com/docs/guides/secure-video-playback)
- [Mux direct uploads](https://www.mux.com/docs/guides/upload-files-directly)
- [Mux pricing](https://www.mux.com/pricing)
- [Shopier API overview](https://help.shopier.com/help/shopier-api-nedir)
- [Shopier API SDK documentation](https://shopier.github.io/)
- [Shopier personal access token](https://help.shopier.com/help/kisisel-erisim-anahtari-nedir)
- [Vercel Pro](https://vercel.com/docs/plans/pro-plan)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Zoom developer documentation](https://developers.zoom.us/docs/api/)
- [Cloudflare Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/)
