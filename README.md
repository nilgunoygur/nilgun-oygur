# Nilgün Oygur

A local Next.js recreation of [nilgunoygur.com](https://nilgunoygur.com/), including the homepage, biography, book, contact, training catalog, four training pages, and eight articles.

## Run

```bash
pnpm install
pnpm run dev
```

The development server uses port 3000, or the next available port. For production:

```bash
pnpm run build
pnpm start
```

## Implementation

- Next.js 16 App Router with statically generated content pages and route metadata.
- Tailwind CSS 4 and shadcn/ui Base UI components.
- Motion for reveal and gallery transitions, with reduced-motion support.
- Zod validates imported content and the contact form.
- Original images and fonts are served locally; images use Next.js optimization.
- Shared navigation, footer, booking actions, galleries, and article cards.

`lib/reference.json` contains the reference content. `lib/content.ts` derives typed page data. `scripts/import-reference.py` refreshes the reference using Python 3, Beautiful Soup 4, and curl.

## Contact and external services

Booking buttons open the owner's Calendly page. Book purchase buttons retain their original retailer destinations. The contact form validates input and prepares an email for the visitor to review and send in their email application; it does not claim delivery or store messages. Newsletter requests also use an email handoff. Live email remains unconfigured; Akademi has a separate development/preview Neon database.

Set `NEXT_PUBLIC_SITE_URL` to the deployed origin before a production build to generate the correct sitemap and Open Graph URLs.

## Checks

```bash
pnpm run lint
pnpm test
pnpm run build
node tests/check-routes.mjs
```

## Akademi development

The database/access-policy foundation, migrated development/preview Neon database, Better Auth/email backend, Turkish authentication forms, and protected account/MFA entry pages are implemented. Resend/DNS are deferred and registration stays disabled. Scheduled retries, payment fulfillment, course learning pages, and the full owner panel remain pending. See [development plan](AKADEMI_DEVELOPMENT_PLAN.md) and [implementation status and database setup](docs/akademi/IMPLEMENTATION.md).

The owner dashboard at `/yonetim` reports registered accounts and recorded Shopier purchases for week, month, year, or a custom date range. Revenue is grouped by currency. `/yonetim/yazilar` lets owners edit the imported articles, create new articles, and save drafts or publish them. Published changes appear on the public blog and homepage; draft overrides hide an imported article. Article covers can be chosen from the existing local images. `/yonetim/banner` manages the public announcement strip, including its messages, colors, animation, speed, looping, and draft/publication state. Apply the latest Drizzle migration before using these management pages in another environment.

Copy `.env.example` to `.env.local` and supply a development database URL before running `pnpm run db:migrate`. `pnpm run db:generate` generates reviewed migrations from `lib/db/schema.ts`; `pnpm run db:check` checks migration history. Existing public pages build without database credentials. `pnpm test` includes isolated PostgreSQL migration/constraint tests and access-policy tests, real Better Auth flows, and email queue retry tests.
