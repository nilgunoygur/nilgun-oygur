# Nilgün Oygur Akademi — domain terms

**Course**: a Shopier product linked to the site (`courses` row: slug, access duration, owner status). Title, description, image and price live in Shopier.

**Sellable course**: a published course whose product is visible (or hidden where `SHOPIER_SHOW_HIDDEN_PRODUCTS=true`), in stock, digital and priced in TRY above zero. Decided only by the Catalog module.

**Purchase**: one paid Shopier order line for a course, keyed by order and course, matched to a student by the buyer email.

**Grant** (course access): a student's right to one course from `startsAt` until `expiresAt`, from a purchase or an audited owner grant. At most one unrevoked grant per student and course; a repeat purchase extends it.

**Active access**: an unrevoked grant with `startsAt <= now < expiresAt`. Decided only by the Course Access module.

**Claim**: attaching a purchase to a student: automatically by verified email, or by order number plus the Shopier email ("Siparişimi ekle").

**Viewer**: the verified student behind a request, with owner status and whether this session passed MFA.

**Owner**: the explicitly designated, verified account authorized to manage the academy’s courses, lessons, and sales. Authenticator enrollment is optional.

**Owner command**: an owner change applied together with its audit entry.

**Provider event**: a verified webhook delivery (Shopier today, Mux later), applied once and stored only as a payload hash.

**Reconciliation**: the daily replay of recent Shopier orders and catalog sync that recovers anything a webhook missed.
