# Nilgün Oygur Akademi — domain terms

**Course**: a Shopier product linked to the site (`courses` row: slug, access duration, owner status). Title, description, image and price live in Shopier; the owner can edit them from the site, which writes to Shopier.

**Sellable course**: a published course whose product is in stock, digital and priced in TRY above zero. Changing a course's status from the app sets its Shopier store visibility first (published is listed, anything else hidden), and the product editor cannot hide a published course. Repeating the status command repairs drift from edits made in Shopier. Decided only by the Catalog module.

**Purchase**: one paid Shopier order line for a course, keyed by order and course, matched to a student by the buyer email.

**Refund request**: a student's request to refund the purchase behind their current access to a course. The owner approves it (the site asks Shopier to refund an amount) or declines it with a note. A pending request suspends all course content. Rejection restores access; approval removes the course from the student, including partial payment refunds.

**Grant** (course access): a student's right to one course from `startsAt` until `expiresAt`, from a purchase or an audited owner grant. At most one unrevoked grant per student and course; a repeat purchase extends it.

**Active access**: an unrevoked grant with `startsAt <= now < expiresAt`. Pending or approved refund requests prevent use of the purchased course.

**Claim**: attaching a purchase to a student: automatically by verified email, or by order number plus the Shopier email ("Siparişimi ekle").

**Lesson**: one step of a course: a video, an audio recording (both Mux assets, played with signed tokens), or a live session. Students see all published lessons; recorded lessons require completion of earlier recorded lessons. Live sessions are exempt from this sequence.

**Homework PDF** (lesson file): a private PDF attached to a lesson of any kind, several per lesson. Readable only through a short-lived signed link issued after an access check.

**Viewer**: the verified student behind a request, with owner status.

**Student contact**: a student's mobile phone (any country, Türkiye by default; stored E.164) and address (il, ilçe, açık adres, optional posta kodu), named after Shopier's buyer fields. Required at registration, editable in profile settings; a Shopier order of the same student fills only fields that are still empty.

**Owner**: the explicitly designated, verified account authorized to manage the academy’s courses, lessons, and sales. Authenticator enrollment is optional.

**Newsletter subscriber**: an email address left in the footer form to receive announcements. Independent of accounts, stored once in lowercase, and listed for the owner under "Bülten aboneleri", who can export the list or delete an address. No email is sent to subscribers yet.

**Owner command**: an owner change applied together with its audit entry.

**Provider event**: a verified webhook delivery (Shopier today, Mux later), applied once and stored only as a payload hash.

**Reconciliation**: the daily replay of recent Shopier orders and catalog sync that recovers anything a webhook missed.
