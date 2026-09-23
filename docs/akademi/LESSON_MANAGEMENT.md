# Lessons and the private course area

## Student journey

After purchase, open **Hesabım → Eğitime devam et**. The private route is `/akademi/hesabim/<course-id>`; the public course description and Shopier purchase page remain separate.

Each published lesson is a card with a watched checkbox. Completing a recorded video marks it complete. Students may also check or uncheck it manually. Progress and the last playback position are saved per student in `lesson_progress`. Failed saves display an error and do not change the checkmark.

Live lessons show their date, time (Europe/Istanbul), duration, and cancellation/completion status. The join action checks access and only returns the meeting link and passcode from 30 minutes before the start until 30 minutes after the scheduled finish.

No lessons are fabricated for a purchased course. Until the owner publishes lessons, students see an active-access empty state.

## Owner workflow

The designated owner account is **butunselsifaakademi@gmail.com**. Owner access requires a verified signed-in account and a row in the protected owners table; authenticator enrollment is optional.

1. Sign in and choose **Yönetim** from the account menu. The old `/yonetim/guvenlik` URL redirects to `/yonetim`.
2. Open `/yonetim/egitimler` and choose **Ders içeriklerini düzenle** beneath a course title.
3. Start an empty course with **4 video + 1 canlı ders ekle**, or add lessons individually. All additions start as drafts.
4. Open a lesson card and edit its title, notes, and position. Set the visibility to **Yayında** when ready.
5. For a recorded lesson, upload its video, then use **Video durumunu kontrol et** until it is ready. Publication requires a ready asset with a signed playback ID.
6. For a live lesson, set the date/time in Istanbul time, duration, HTTPS meeting link, and optional passcode. The date and link are required to publish.
7. Save a lesson as **Taslak** to hide it. To replace a published video, first save that lesson as a draft.

Course titles, marketing descriptions, images, and prices remain managed in Shopier. Lesson content, live dates, and publishing are managed here.

## Video (Mux)

The editor uploads directly to Mux in chunks, and the student page plays signed assets with Mux Player. Set these server-only environment values:

- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `MUX_SIGNING_KEY_ID`
- `MUX_SIGNING_PRIVATE_KEY` (base64-encoded PEM)

Restart the development server after adding credentials. Uploaded assets use the `signed` playback policy. Browser upload URLs are issued only after owner authorization. No provider keys are sent to the browser.

The owner explicitly checks processing status; background Mux webhooks are not configured in this slice. The private player renews ten-minute tokens after rechecking course access, preserving the current playback position. Token expiry is capped by the access grant.

Provider references: [direct uploads](https://www.mux.com/docs/guides/upload-files-directly), [secured video playback](https://www.mux.com/docs/guides/secure-video-playback), [React player](https://www.mux.com/docs/guides/player-api-reference/react).

## Authorization and verification

Private page reads, progress writes, token issuance, and live joins check the verified student and active grant. Published lesson and module status are checked independently of public catalog status, so removing a product from sale does not remove an existing buyer's course access. Owner pages/actions require the protected owner row. Owner content changes and upload preparation are audited.

`tests/academy-learning.test.mjs` covers template creation, draft visibility, publication rules, unpaid/expired access, progress, live join windows and unpublishing.

## Account menu

The header account menu contains courses, profile settings, Shopier order claiming, and sign-out. Profile and claim forms open in shadcn dialogs. Profile settings save a name and a resized raster avatar in the existing user image field. Password changes require the current password and revoke other sessions. Password reset uses the existing email flow; local console-email mode writes the link to the development terminal.
