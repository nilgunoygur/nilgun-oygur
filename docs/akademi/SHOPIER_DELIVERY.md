# Shopier purchase delivery and refunds

Buyers pay on a Shopier product page and return to the academy. The website does not use the legacy OSB form.

## Buyer routes

- `/akademi/satin-alim-sonrasi`: public return page with login, registration, courses and manual claim links. The page itself never confirms payment or grants access.
- `/akademi/egitim-ekleme`: public step-by-step course-add guide, with help for missing orders, email verification, different purchase/account emails and refunded orders.
- `/akademi/siparis-ekle`: authenticated claim form. Login, registration, verification resend and password reset preserve its destination through an allowlist. Successful claims link directly to `/akademi/hesabim`.

Checkout opens Shopier in a new tab so buyers can return to the website. The academy and account pages include persistent claim/help links. Same-email purchases still attach automatically on verified sign-in or email verification. A claim checks Shopier's paid order and succeeded refunds before granting; Shopier outages show a retry message and grant no new claim access.

## Deployment

1. Apply migration `0016_shopier_refunds_and_delivery` before deploying the application. It adds the refund ledger, order IDs on verified delivery receipts and extension ancestry. Existing extension links are backfilled only when their dates prove a relationship. It changes no existing access dates.
2. Keep the current three subscriptions. Add `refund.updated` using the existing webhook URL, currently `https://nilgun-oygur.vercel.app/api/shopier/webhook`. Both that URL and `https://www.nilgunoygur.com/api/shopier/webhook` were reachable in the initial review. There is no need to move the existing subscriptions.
3. `pnpm run --silent shopier:webhook <https-base-url>` now skips existing subscriptions, adds missing ones and prints the existing-plus-new signing tokens. Run with the target environment's `SHOPIER_API_TOKEN` and existing `SHOPIER_WEBHOOK_TOKEN` securely loaded. Capture stdout directly into the secret store; do not paste tokens into chat or logs. Update `SHOPIER_WEBHOOK_TOKEN` in Vercel and redeploy. This PR does not change live subscriptions or secrets.
4. In Shopier's **Dükkan Yönetimi → Dükkan Seçenekleri → Sipariş onay mesajı**, include a link to `https://www.nilgunoygur.com/akademi/satin-alim-sonrasi`. Suggested text: “Eğitiminize ulaşmak için https://www.nilgunoygur.com/akademi/satin-alim-sonrasi adresine dönün. Shopier’de kullandığınız e-posta ile giriş yapın veya hesap oluşturun. Eğitiminiz görünmüyorsa sipariş numaranız ve satın alma e-postanızla siparişinizi ekleyin.” This is a return link, not an assumed automatic Shopier redirect. Review the message for other products sold in the same store.

### Browser review — 4 October 2026

The merchant's Chrome session confirmed **Dükkan Yönetimi → Dükkan Seçenekleri → Sipariş Onay Mesajı** has a rich-text editor with a **Link** control. The current message only thanks buyers and promises a response. No automatic-return URL field was present on this settings screen. Shopier's [official guidance](https://help.shopier.com/help/siparis-olusturulduktan-sonra-musterilerime-ozel-bir-mesaj-verebilir-miyim) confirms external links are supported in this message.

After the PR's pages are deployed, use the prepared [confirmation message](SHOPIER_CONFIRMATION_MESSAGE.html). It provides **EĞİTİMİME ULAŞ**, direct order claiming, visual help and contact links. Its wording applies to online course purchases without promising course access for other products. The live message has not been changed during PR development because the new return/help pages are not yet on the production site.

The help page now contains four labeled visual examples with fictional order/email details, anchored step navigation and common-problem guidance. The live claim form prefills the signed-in account email (editable for another Shopier address) and accepts a copied leading `#` on an order number. Signed-in buyers returning from Shopier get course/claim actions immediately.

## Verify a real delivery

Shopier does not offer a payment sandbox. Automated tests use an isolated PGlite database and signed fixture events. They do not prove a real production payment.

After deploying and installing the new subscription:

1. Make a real purchase of the existing low-price test course using a verified student account email.
2. Return to the site, open **Hesabım**, and confirm **Eğitime devam et** opens the course.
3. With the target environment's database and API credentials loaded, run `pnpm shopier:verify <real-order-number>`.
4. Require `webhookProcessed`, `purchaseRecorded`, `accessRecorded` and `verified` to be true. The command is read-only, prints no email addresses, payloads or secrets, and exits nonzero if verification is incomplete. An order recorded only by sync or claim cannot pass the webhook check. Old receipts created before this migration have no order ID and cannot prove delivery with this command.
5. Test a purchase made before registration. Register and verify that same email; the waiting course must appear. For a different account email or a delayed notification, use **Shopier siparişimi ekle** with the Shopier order email and number.
6. Fully refund the test purchase in Shopier. After `refund.updated` is processed, the course must no longer open, new playback tokens must be denied, and manual claiming must report the refund. The daily sync provides recovery if that notification is missed.

A real payment/refund was not executed during PR development. Record its order number and the verifier's redacted boolean output in the PR when this sign-off is performed.

## Refund requests from the site

Apply migration `0017_refund_requests` before deploying.

- **Student:** "İade talep et" at the bottom of a course page (`/akademi/hesabim/{courseId}`) asks for a reason. One request can be open per purchase, three attempts per day. The page then shows whether the request is being reviewed, was approved, or was declined with the owner's note.
- **Owner:** open requests appear above the course list in `/yonetim/egitimler`. "İade et" sends `POST /refunds` to Shopier with the order, an amount (prefilled with what was paid for the course) and an optional note to the buyer. "Reddet" stores a note the student sees. Both are written to the audit log.
- **Amount:** it cannot exceed what the order's course purchases cost minus refunds already recorded. An amount below the order total is a partial refund in Shopier and does not close the course.
- **Access:** approval alone changes nothing. Access is removed by the refund rules below once Shopier reports the refund as succeeded and full, at once if Shopier answers so, otherwise through `refund.updated` or the daily sync.
- **Sent once:** the request is marked approved before Shopier is called. If Shopier refuses (4xx) the request reopens. If the call times out or fails unclearly, the request stays approved without a refund ID and the owner is told to check the Shopier panel, because the money may have been sent.
- **Not built:** no email is sent to the owner or the student; and a real refund through the API has not been run against the live account.

## Refund rules

- Only `status: succeeded`, `type: full` automatically removes the refunded order's contribution to course access.
- Pending/failed refunds leave access intact. Partial refunds remain visible above the owner course list for manual review because Shopier's refund model identifies an order, not individual courses. They do not automatically remove an arbitrary course, including when several partial refunds accumulate.
- A completed refund is retained even if its order notification has not arrived. Replays, claims and later email verification cannot activate that fully refunded order.
- Claiming and refund processing serialize on the order and student, preventing a concurrent claim from leaving refunded access active.
- Extension ancestry lets a refund remove only the refunded purchase's days. Other paid purchases and owner grants in that chain remain; independent owner grants and manually revoked access are preserved.
- Daily sync reads all succeeded refund pages, including refunds of orders older than the seven-day purchase window. Failed reads and the pagination cap fail visibly rather than silently accepting incomplete refund data.
- Existing Mux playback tokens remain valid until their previously issued expiry (video up to ten minutes; recordings up to six hours). Revocation blocks new tokens and subsequent lesson access; it cannot retroactively cancel a signed token already issued by Mux.

Primary references: [Shopier OSB guidance](https://help.shopier.com/help/otomatik-siparis-bildirimi-osb-nedir), [webhook events](https://developer.shopier.com/reference/events-headers-payloads), [refund model](https://developer.shopier.com/reference/the-refund-model), [order confirmation messages](https://help.shopier.com/help/siparis-olusturulduktan-sonra-musterilerime-ozel-bir-mesaj-verebilir-miyim).
