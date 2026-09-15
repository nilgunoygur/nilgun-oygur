# Nilgün Oygur Akademi — Development Plan

Last reviewed: 15 September 2026

## 1. Product decisions

Build the Akademi inside the existing Next.js website. Students buy individual courses through Shopier and can watch only the courses they purchased for a configurable period, defaulting to 365 days from confirmed payment.

Confirmed launch decisions:

- Purchases and access are per course, not an all-access membership.
- Access begins when Shopier confirms payment.
- Students use verified email and password authentication.
- Nilgün receives an owner administration panel.
- Videos use signed private streaming without DRM for the first version.
- Existing public pages and visual language remain intact.

Each purchase snapshots the course price, currency, and access duration. Later course changes cannot shorten an existing student's access. Students may watch without limits until expiry. New lessons published within a purchased course are included. Active access blocks duplicate purchases; expired access can be renewed with a new purchase. Archiving stops new sales without removing existing access.

The first version excludes subscriptions, bundles, live classes, quizzes, certificates, offline downloads, DRM, and device limits.

## 2. Recommended low-cost stack

Use the following coherent stack:

| Component | Responsibility | Initial cost |
| --- | --- | ---: |
| Next.js on Vercel Pro | Website, server rendering, server actions, webhooks | $20/month plus excess usage |
| Better Auth | Email/password login, sessions, verification, password reset, admin MFA | No separate subscription |
| Neon PostgreSQL | Authentication and academy database | $0 within Free limits |
| Drizzle ORM | Typed schema, queries, and migrations | Free |
| Resend | Verification, reset, purchase, and access emails | $0 within Free limits |
| Mux | Upload processing, adaptive playback, signed video delivery | Usage based; approximately $3.60/month before credits at launch estimate |
| Shopier | Hosted checkout and payment records | Account-specific transaction fees |

Expected starting infrastructure cost is approximately **$20–25/month**, excluding taxes, domain renewal, Shopier fees, and usage beyond free allowances. Mux credits may reduce the video charge.

### Why this stack

Better Auth runs inside the existing application and stores its records in the same PostgreSQL database as courses and purchases. Neon integrates directly with Vercel and can start on its free tier. Drizzle keeps the database model explicit and version controlled.

Resend is preferred over Cloudflare Email Service for launch. Resend currently provides 3,000 messages per month with a 100-message daily limit. Cloudflare's unrestricted outbound email requires Workers Paid and is currently beta. Free Cloudflare Email Routing handles inbound forwarding and does not replace transactional delivery to students.

Mux is preferred over UploadThing and a custom AWS pipeline. UploadThing is useful for generic file uploads but does not supply the complete adaptive streaming workflow needed here. AWS requires combining S3, MediaConvert, CloudFront, signing, and monitoring. Mux supplies upload processing, adaptive streaming, a player, and signed playback in one service.

## 3. Neon and database design

Use one Neon project for authentication and academy records. Store videos in Mux and only keep Mux identifiers and metadata in PostgreSQL.

Neon Free currently includes 0.5 GB storage, 100 compute-unit hours per project/month, 5 GB public network transfer, and scale-to-zero after five minutes. Connect through Neon pooled connections, locate Neon and Vercel in compatible regions, and upgrade to the usage-based Launch plan when measured usage or recovery requirements justify it.

Database entities:

- Better Auth users, accounts, sessions, verification tokens, MFA records, and persistent rate limits.
- `courses`: slug, title, description, cover, price, currency, duration in days, Shopier product mapping, status, and timestamps.
- `modules`: course, title, position, and publication status.
- `lessons`: module, title, description, position, preview flag, publication status, and video asset.
- `video_assets`: Mux asset/playback identifiers, upload state, duration, aspect ratio, and processing failure details.
- `orders`: student, provider, internal reference, Shopier order reference, monetary snapshot, status, and timestamps.
- `order_items`: order-to-course snapshot, price, currency, and access duration.
- `course_access`: student, course, source order, start, expiry, revocation, and reason.
- `lesson_progress`: student, lesson, last position, completion, and last activity.
- `provider_events`: provider event identity, verified payload hash, processing status, attempt count, and error details.
- `admin_audit_log`: actor, action, affected resource, reason, and timestamp.

Enforce unique provider order/event identifiers and one active grant per student/course. Use database transactions to mark an order paid and create its access grant exactly once.

Do not expose direct database credentials or generic CRUD endpoints to browser code. Every server-side operation validates the current session, resource ownership, and administrator role.

## 4. Authentication and email

Integrate Better Auth through the Next.js App Router route handler and Drizzle PostgreSQL adapter.

Student authentication includes:

- Email/password registration with an eight-character minimum password.
- Email verification required before checkout.
- Login, logout, remember-me sessions, password reset, and session revocation.
- Neutral responses for registration and password recovery to avoid exposing whether an account exists.
- Persistent database-backed rate limits for login, registration, resend, and reset endpoints.

Administrator authentication includes authenticator-app MFA and recovery codes. Store the administrator role in protected database data rather than editable user profile metadata. Validate authorization within every owner page, server action, route handler, and signed playback request.

Use Resend with a verified sending subdomain such as `mail.nilgunoygur.com`. Configure SPF, DKIM, and DMARC. Use the existing support address as Reply-To; a separate paid mailbox is unnecessary.

Send only essential messages at launch:

- Email verification.
- Password reset.
- Purchase and course-access confirmation.
- Important account or access changes.

Normal email/password login sends no email. Add resend cooldowns and per-account/IP limits to protect the free allowance. Email delivery failure must never reverse a confirmed payment or access grant; the user sees a retry path and administrators see the delivery failure.

## 5. Routes and user experience

Public routes:

- `/akademi`: published course catalog.
- `/akademi/[slug]`: course description, curriculum, price, duration, and purchase action.
- `/giris`, `/kayit`, `/sifremi-unuttum`, and `/sifre-yenile`: authentication flows.

Student routes:

- `/hesabim/egitimlerim`: purchased courses, completion, and expiry dates.
- `/hesabim/egitimlerim/[courseSlug]`: course overview and module navigation.
- `/hesabim/egitimlerim/[courseSlug]/[lessonSlug]`: protected lesson player and curriculum navigation.

Owner routes:

- `/yonetim`: operational overview.
- Course/module/lesson creation, ordering, publication, and archival.
- Mux upload initiation and processing status.
- Shopier product mapping, duration, price, and sale status.
- Student, order, and access search.
- Manual grant, extension, or revocation with a required reason and audit entry.
- Failed payment match, refund, video processing, and email-delivery review queues.

Use existing shadcn components, Tailwind tokens, Motion behavior, fonts, and responsive conventions. Keep Server Components as the default and isolate interactive forms and players into focused Client Components.

## 6. Shopier payment flow

Shopier integration proof is the first implementation milestone because account-specific API capabilities must be confirmed before accepting live sales.

Payment sequence:

1. Require a verified logged-in student.
2. The server creates a pending internal order with a random immutable reference and purchase snapshot.
3. Redirect the student to the mapped Shopier hosted checkout.
4. Receive Shopier's server-to-server notification and verify its signature or authenticity according to current official documentation.
5. Re-read the Shopier order through its API and verify payment state, amount, currency, product, and order reference.
6. In one database transaction, mark the internal order paid, create the course access grant, and record the processed event.
7. Send the confirmation email after the transaction succeeds.
8. The return page reads only the internal order status and shows paid, verifying, failed, or manual-review state.

Never grant access from the browser redirect, a client-supplied status, a screenshot, or an unverified webhook body.

Prefer an immutable Shopier field that carries the internal order reference through checkout. If the active Shopier account cannot preserve one, require an exact verified product and purchaser-email match. Ambiguous transactions enter manual review and do not grant access automatically.

Persist incoming events before acknowledging them, process events idempotently, retry temporary failures, and periodically reconcile unresolved orders through the Shopier API. Repeated, delayed, or out-of-order events cannot create duplicate access. Confirmed full refunds revoke the related access; partial refunds require owner review.

## 7. Private Mux playback

Administrators upload directly to Mux using temporary upload URLs created by an authorized server action. Mux processing webhooks update each asset's state. Lessons cannot be published until their video is ready.

Use signed-only playback identifiers. When a player requests access, the server checks:

- A valid, current Better Auth session.
- The requested lesson and its course.
- A paid, unrevoked course-access grant.
- `starts_at <= now < expires_at` using server time.

Issue a signed Mux token valid for at most ten minutes or until course expiry, whichever comes first. Refresh during playback only after repeating the authorization check. Do not expose signing keys, public playback IDs, downloadable renditions, or publicly cache protected responses.

Signed streaming prevents public links and casual sharing but cannot guarantee that an authorized viewer never records their screen. Already-issued tokens and buffered media can remain usable briefly after revocation, bounded by the token lifetime.

## 8. Cost controls and operations

Launch estimate: 20 hours stored and 100 active students watching five hours each per month.

- Cache public catalog data and keep account/payment/playback data uncached.
- Save progress at most once per minute, plus pause and completion.
- Use payment webhooks instead of continuous browser or database polling.
- Reconcile unresolved payments hourly rather than continuously.
- Do not send login codes or routine marketing email.
- Set Mux, Vercel, Neon, and Resend usage alerts before launch.
- Keep original video masters outside the playback provider for disaster recovery.
- Use separate development and production provider credentials and data.
- Back up database schema and establish a tested Neon restore procedure before public sales.

## 9. Delivery milestones

1. **Integration proof:** verify Better Auth–Neon connectivity, Resend delivery, Shopier payment matching, and one Mux signed video.
2. **Foundation:** add migrations, authentication flows, permissions, rate limits, and administrator MFA.
3. **Content management:** implement courses, modules, lessons, owner tools, uploads, and publishing.
4. **Commerce and learning:** connect checkout, verified payment fulfillment, expiring access, protected playback, and progress.
5. **Launch readiness:** add refund handling, reconciliation, operational queues, email monitoring, recovery documentation, and end-to-end QA.
6. **Controlled launch:** publish one course to invited students, observe one full payment/access/expiry lifecycle, then open the public catalog.

Use pnpm for every dependency and project command. Commit the pnpm lockfile as the only package lockfile.

## 10. Acceptance criteria

The release must prove:

- Purchasing course A grants A and never course B, including through direct endpoint requests.
- Anonymous, unpaid, expired, and revoked users cannot receive or refresh playback tokens.
- Access expiry and playback-token renewal work during a long session.
- Forged, duplicate, delayed, and out-of-order payment events do not grant incorrect or duplicate access.
- Payment fulfillment succeeds when the buyer closes the browser before returning to the site.
- Full refunds revoke access; partial refunds and uncertain payment matches enter owner review.
- Students cannot read or modify another student's purchases, access, or progress.
- Students cannot assign themselves administrator privileges or alter monetary/access snapshots.
- Failed or incomplete uploads cannot appear as playable lessons.
- Verification and password reset tokens expire and cannot be reused.
- Email quota exhaustion and delivery failures show recoverable states without corrupting payment/access data.
- The academy works in mobile Safari and current desktop browsers.
- Existing public pages and URLs continue to work.
- `pnpm lint`, meaningful automated tests, route checks, and `pnpm build` pass.

## 11. Provider references

- [Better Auth](https://better-auth.com/)
- [Better Auth email and password](https://better-auth.com/docs/authentication/email-password)
- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
- [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)
- [Better Auth rate limits](https://better-auth.com/docs/concepts/rate-limit)
- [Neon plans](https://neon.com/docs/introduction/plans)
- [Neon Vercel integration](https://neon.com/docs/guides/vercel-managed-integration)
- [Resend pricing](https://resend.com/pricing)
- [Mux private playback](https://www.mux.com/docs/guides/secure-video-playback)
- [Mux pricing](https://www.mux.com/pricing)
- [Shopier API overview](https://help.shopier.com/help/shopier-api-nedir)
- [Vercel Pro](https://vercel.com/docs/plans/pro-plan)
- [Cloudflare Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/)

