# Lessons and the private course area

## Student journey

After purchase, open **Hesabım → Eğitime devam et**. The private route is `/akademi/hesabim/<course-id>`; the public course description and Shopier purchase page remain separate.

Each published lesson is a card with a watched checkbox. Finishing a recorded video or an audio recording marks it complete (90% counts as finished). Students may also check or uncheck it manually. Progress and the last playback position are saved per student in `lesson_progress`. Failed saves display an error and do not change the checkmark.

Audio lessons play in the academy's own player: play/pause, a waveform to move through the recording (drag, tap or arrow keys), 15-second skips and playback speed. The position is saved like a video's.

Homework PDFs appear under a lesson's content as "Ödev ve materyaller" cards and open in a new tab. Any lesson kind can have them.

Live lessons show their date, time (Europe/Istanbul), duration, and cancellation/completion status. The join action checks access and only returns the meeting link and passcode from 30 minutes before the start until 30 minutes after the scheduled finish.

No lessons are fabricated for a purchased course. Until the owner publishes lessons, students see an active-access empty state.

## Owner workflow

The designated owner account is **butunselsifaakademi@gmail.com**. Owner access requires a verified signed-in account and a row in the protected owners table; authenticator enrollment is optional.

1. Sign in and choose **Yönetim** from the account menu. The old `/yonetim/guvenlik` URL redirects to `/yonetim`.
2. Open `/yonetim/egitimler` and choose **Ders içeriklerini düzenle** beneath a course title.
3. Start an empty course with **Örnek program ekle**, or add video, audio and live lessons individually. All additions start as drafts.
4. Open a lesson card and edit its title, notes, and position. Set the visibility to **Yayında** when ready.
5. For a video lesson, choose **Mux kütüphanesinden seç** or **Bilgisayardan yükle**. An upload goes straight from the browser to Mux and attaches itself when Mux has prepared it; until then the lesson keeps its current video, so a published lesson can be replaced without unpublishing. Publication requires a ready asset with a signed playback ID.
6. For an audio lesson, choose **Ses dosyası seç** (MP3, M4A or WAV, up to 250 MB). Publication requires a recording. **Değiştir** swaps it in place; a published lesson's recording cannot be removed, only replaced.
7. Under **Ödev ve materyaller**, add PDFs (up to 25 MB each, 20 per lesson) to any lesson. They are visible to students as soon as the lesson is published.
8. For a live lesson, set the date/time in Istanbul time, duration, HTTPS meeting link, and optional passcode. The date and link are required to publish.
9. Save a lesson as **Taslak** to hide it. Deleting a lesson also deletes its recording and PDFs.

Lesson content, live dates, and publishing are managed here. A course's title, description, cover, price, discount, store visibility and stock live in Shopier and are edited from `/yonetim/egitimler` (**Yeni eğitim**, or **Shopier ürününü düzenle** in a course's menu); see [IMPLEMENTATION.md](IMPLEMENTATION.md).

## Video (Mux)

The editor uploads directly to Mux in chunks, and the student page plays signed assets with Mux Player. Set these server-only environment values:

- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `MUX_SIGNING_KEY_ID`
- `MUX_SIGNING_PRIVATE_KEY` (base64-encoded PEM)

Restart the development server after adding credentials. Uploaded assets use the `signed` playback policy. Browser upload URLs are issued only after owner authorization. No provider keys are sent to the browser.

Background Mux webhooks are not configured: while the owner's page is open it asks Mux every five seconds whether an upload is ready, for up to ten minutes. If the page is closed first, the video is in the Mux library and can be attached from there. When Mux refuses an upload (for example the free plan's 10-asset limit), the reason is shown on the lesson. The private player renews ten-minute tokens after rechecking course access, preserving the current playback position. Token expiry is capped by the access grant.

Provider references: [direct uploads](https://www.mux.com/docs/guides/upload-files-directly), [secured video playback](https://www.mux.com/docs/guides/secure-video-playback), [React player](https://www.mux.com/docs/guides/player-api-reference/react).

## Audio recordings and homework PDFs (Vercel Blob)

Recordings and PDFs live in a **private** Vercel Blob store and are listed in `lesson_files`. Set the server-only `BLOB_READ_WRITE_TOKEN` (Vercel adds it when the store is connected to the project); without it the upload controls are disabled and everything else works.

- **Upload:** an owner-only server action issues a token for one new pathname (`lessons/<lesson id>/<random>/<file name>`), limited to the allowed types and size. The browser uploads directly to the store, then a second action checks what actually arrived and records it. Nothing is public at any point.
- **Waveform:** the owner's browser measures the recording at upload (length and 240 loudness bars) and the numbers are stored with the file, so students never download or decode a recording just to draw it. A recording too large to decode gets a neutral waveform.
- **Reading:** `GET /api/lesson-files/<id>` checks the session and, for students, the published lesson and active grant, then redirects to a link signed for that one file: ten minutes for a PDF, six hours for a recording, never past the end of the student's access. Seeking uses Range requests against the store's CDN. If a link expires mid-lesson the player asks for a new one and continues from the same position.
- **Cleanup:** replacing or deleting a file, or deleting its lesson, deletes the stored object. An upload abandoned before it is recorded leaves an unreachable object behind.

## Authorization and verification

Private page reads, progress writes, token issuance, file links, and live joins check the verified student and active grant. Published lesson and module status are checked independently of public catalog status, so removing a product from sale does not remove an existing buyer's course access. Owner pages/actions require the protected owner row. Owner content changes and upload preparation are audited.

`tests/academy-learning.test.mjs` covers template creation, draft visibility, publication rules, unpaid/expired access, progress, live join windows, unpublishing, audio lessons and lesson files.

## Account menu

The header account menu contains courses, profile settings, Shopier order claiming, and sign-out. Profile and claim forms open in shadcn dialogs. Profile settings save a name and a resized raster avatar in the existing user image field. Password changes require the current password and revoke other sessions. Password reset uses the existing email flow; local console-email mode writes the link to the development terminal.
