> Current implementation direction (12 October 2026): shared React/TypeScript with Capacitor, separate Android/iOS project folders and one existing cloud database/account system. Earlier framework/schedule suggestions below are historical planning; use [the current delivery plan](PHASE_TWO_DELIVERY_PLAN.md), [completion checklist](PHASE_STATUS_AND_COMPLETION_CHECKLIST.md) and [shared architecture](SHARED_APP_ARCHITECTURE.md) for current decisions and status.

> Latest shared-chat increment: shared web/mobile chat, own saved-message/actions APIs, 88 passing tests and successful web/mobile builds. Android debug build automation has since run successfully; the iOS simulator/CI workflow has not run. Full-scope work remains in the linked completion checklist; store credentials alone do not complete it.

> Latest Android result: the updated development APK compiled, passed lint with zero errors/27 warnings, and installed on the USB phone. Visible layout/branding, public library, sidebar, language/view controls, lost-connection retry and signed-out chat/account boundaries passed. The small-screen app name was fixed. Cloud database stability/loading speed, HTTPS native login, iOS compilation, signed releases and full-scope acceptance remain pending; see the latest delivery-plan entry.

> Later login correction: the explicit USB Android debug app now opens the existing login and registration forms; creating an account retains the return link to the app. All 92 regression tests and web/mobile/Android builds passed, and Sign in opened the real form on the phone. The user's manual authenticated return/history check is pending. The USB exception was verified disabled in compiled release code; distributed HTTPS login, persistent sessions, iPhone testing and full-scope work remain pending.

# LuoLinguaAI Phase Two Development Plan

**Prepared:** 9 October 2026  
**Purpose:** A plain-language scope, delivery plan, acceptance checklist, data assessment, and cost estimate for Phase Two, followed by a Phase One completion review.

## 1. Executive summary

Phase One has produced a substantial, deployed web platform and a useful starting point for Phase Two. The source code includes the main content areas, admin and review workflows, role controls, a phone-installable web app, Gemini-based chat/search code, and an NRF-style data model. That is meaningful progress, but the Phase One progress report itself says the data is not all live, selected content is small, and main user tasks still need checking. The funding request describes Phase One as a six-week project; the message to the project manager describes a one-week early demo. These are different milestones and should not be treated as the same acceptance standard.

Phase Two should turn the current web MVP into a dependable Android and iOS learning app, add offline access and safe synchronization, finish the high-value learning and notification functions, and prepare the system for transfer to the University server. It should not begin with a new model-training project: the current corpus is useful for search and small experiments but is not enough for a reliable Dholuo translation, speech, or general-purpose model.

**Recommended Phase Two duration:** 12 weeks of development, followed by a 2-week monitored launch period. This assumes one developer working about 8 hours per working day, five days each week, and timely access to the University server, store accounts, content reviewers, and approved test data. Delays in those dependencies extend the calendar.

## 2. Documents and evidence reviewed

This plan uses the Phase One funding approval, the Phase One progress report, the project-manager message (including its Word copy), the JOOUST LuoLinguaAI PRD, the Activity 3.1.1 NRF Technical Specifications Annex, the application source, the database schema and migrations, the NLP Ready Package, and the files in `LUO DATA/Data/Data`.

The Activity 3.1.1 annex is an NRF repository specification. Its access rules, metadata, audit, ingest, checksum, export and preservation requirements apply where the application connects to or presents NRF repository data. It is not evidence that every one of those repository functions is already finished in the current application.

## 3. Phase Two goal and limits

### Phase Two goal

Deliver one supported Android app and one supported iOS app connected to the existing LuoLinguaAI service, with useful low-bandwidth/offline learning, push notifications, secure account flows, and a documented deployment path to the University’s physical server.

### Included in the proposed scope

- Native Android and iOS client applications that reuse the current web API and database.
- A cross-platform app approach such as React Native/Expo, subject to a short technical proof that it can meet offline, accessibility and store requirements; keep the current web portal and API.
- Core learning content: dictionary, proverbs, riddles, selected stories, songs, heritage/artifact records, and approved oral-history excerpts.
- Search and the existing AI assistant, with source references and clear limits on answers.
- Offline reading for downloaded, explicitly permitted content; queued user progress and later synchronization.
- Push alerts for learning reminders and relevant workflow events, with user controls.
- Email verification/reset messages and optional phone-number OTP for users who need it.
- A focused learning path, quizzes, saved items, and basic progress tracking.
- Migration preparation and a controlled migration rehearsal to the University server, subject to University ICT provisioning.
- Store listings, privacy materials, release builds, support/backup documentation, and acceptance handover.

### Keep for a later funded release

The PRD also describes speech recognition and pronunciation scoring, Dholuo text-to-speech, OCR, machine translation, image recognition, a full knowledge graph, multiplayer games, 3D artifacts, animated stories, virtual tours, a full research portal, and expansion to several languages. These are not small add-ons. Keep them out of the 12-week launch scope unless the project manager replaces an equivalent amount of work and approves the needed data and operating costs. Run a separate Dholuo speech-service pilot before promising speech features.

## 4. Requirements and acceptance checks

| Area | Phase Two requirement | Acceptance check |
|---|---|---|
| Android and iOS | Release apps with the same core features, accessible layouts, supported OS versions, and crash reporting. | Install release candidates on representative low- and mid-range Android phones and supported iPhones; complete the agreed user journeys on both. |
| Content and search | Browse and search approved content by type, word, theme, county/site, and language. Display attribution and access status where appropriate. | A curator checks a sample from every launch module; restricted/internal content never appears in public results. |
| AI chat | Retrieve only content the signed-in user is allowed to see; show sources; allow users to flag incorrect answers; set request and spend limits. | Review a fixed set of Luo and English questions with cultural reviewers; verify citations and access controls; verify graceful responses when the AI provider is unavailable. |
| Offline mode | Users can choose to download a defined content pack and use it without a network. User progress is queued safely and synchronized later. | Airplane-mode checks confirm downloaded items open; queued progress synchronizes once, without duplicates or overwriting newer server data. Restricted or sacred material cannot be downloaded without authorization. |
| Accounts | Keep existing email/password and Google sign-in where usable; add email verification/reset and phone OTP only if there is a clear need. Add account deletion and consent controls. | Verify, expire, retry, and rate-limit OTPs; verify email flows; confirm account deletion removes eligible personal data and records required for audit are retained appropriately. |
| Notifications | Use push for app alerts; keep in-app notifications; email for account/service messages; SMS only for OTP or a user-requested critical message. | Users can opt out of non-essential alerts; invalid tokens and failed sends are handled; no sensitive transcript or cultural information is included in lock-screen text. |
| Learning | Add a short beginner pathway, quizzes, saved words, and simple progress. Use reviewer-approved learning content. | A new learner completes a sample lesson, quiz, saves a word, and sees progress retained online and offline. |
| Admin and content | Curators can correct, review, publish and withdraw content; retain provenance, consent, restriction, version history and audit trails. | Test submit → review → publish/return flow and verify each role can only do its authorized actions. |
| University server readiness | Package app services and dependencies for reproducible deployment; document database restore, media backup, secrets, TLS, monitoring and rollback. | Perform a staging migration and restore drill with the ICT team; reconcile record counts/checksums; keep a rollback plan before cutover. |
| Performance and resilience | Target the annex baseline: metadata search in 2 seconds for typical load, semantic search in 5 seconds, and a 20-user baseline. Set a backup and restore objective with ICT. | Run a measured acceptance check in the staging environment; record response times, backup completion and restore outcome. |
| Privacy and governance | Keep research-only/internal data out of public AI and public app results. Separate consent evidence from ordinary public records. | Review permissions using test accounts for guest, learner, curator, researcher and administrator roles; document data flows and provider retention settings. |

### Simple content launch rule

Every item selected for public learning must have a named source, a checked Luo text/translation where relevant, a permission/consent decision, an access level, and curator approval. A transcript sitting in a project folder is not automatically approved for publication, external AI processing, or offline download.

## 5. Proposed integrations and APIs

Keep the current Next.js REST API and PostgreSQL data model as the source of truth. Add only integrations required by the agreed release.

| Integration | What it does | Needed? | Cost type / decision |
|---|---|---:|---|
| Existing LuoLinguaAI REST API | App login, content, search, progress, admin and sync. | Yes | Existing project; developer time is excluded from this cost plan. Add versioned mobile endpoints and API documentation. |
| Firebase Cloud Messaging (FCM) + Apple Push Notification service (APNs) | Sends push notifications to Android/iOS. | Yes | FCM is currently listed as no-cost by Firebase. Apple push is part of Apple platform services. Hosting/usage limits of supporting services should still be monitored. |
| Africa’s Talking SMS API | Send OTP or critical SMS to Kenyan numbers. | Conditional | Pay per message and possibly sender ID/short-code setup. Get a written quote for transactional SMS and any sender ID before committing. Use an authenticator/email option if SMS is not required. |
| Transactional email API (for example Resend) | Verification, password reset, security notices. | Yes if email verification/reset is enabled | Resend currently offers a free tier of 3,000 emails/month with a 100/day limit; paid tier shown at USD 20/month. Verify sender domain and deliverability before launch. |
| Gemini API | Current chat, embeddings and AI summaries. | Yes for existing AI functionality | Metered token usage after free limits; a free tier is not a production privacy or availability commitment. Set monthly caps. Do not send consent-restricted data. |
| Cloudinary | Current code uses Cloudinary for uploaded media. | Current system dependency | Current free allocation is measured in credits shared among storage, transformations and delivery. Confirm actual usage. For long-term research media, prefer the University-controlled object store/NAS after ICT provisions it. |
| Google Play Console | Android distribution and app management. | Yes for public Play Store release | USD 25 one-time registration (about KES 3,250 using a planning rate of KES 130/USD). New personal accounts have extra testing/device checks; use an institution-owned organization account if available. |
| Apple Developer Program / App Store Connect | iOS signing, TestFlight and public distribution. | Yes for public App Store release | USD 99/year (about KES 12,870 at the same planning rate). Eligible accredited educational institutions/nonprofits may request a fee waiver subject to Apple approval. |
| macOS build/signing access | Build and sign the iOS app and upload it to App Store Connect. | Yes | Use an existing JOOUST Mac or an approved hosted Mac build service. Cost is zero if institutional equipment is available; otherwise request a quote before choosing a service. |
| Google OAuth | Existing Google sign-in. | Keep if used | No direct per-login fee expected; must configure mobile redirect and verify the publisher account. |
| Maps | Existing map components use Leaflet. | No new paid API required for the scoped release | Use OpenStreetMap-compatible tiles only after checking their usage terms and capacity. Avoid adding Google Maps billing unless a feature requires it. |
| Mobile crash reporting | Crash reports for release quality. | Recommended | Firebase Crashlytics is listed as no-cost; confirm privacy disclosures and consent requirements. |
| Speech/OCR/translation APIs | Adds speech input/output, OCR or translation. | Not in launch scope | No provider should be selected or budgeted until a Dholuo quality pilot proves support, consent rules are settled, and per-minute/per-character pricing is quoted. |
| Payment API (M-Pesa) | Collects payments for paid content/services. | No, unless the product will charge users in Phase Two | Not required for a free learning app. Add Daraja only after pricing/collection requirements and reconciliation ownership are approved. |

### OTP design

OTP is application logic plus a delivery channel. Generate short-lived, single-use codes on the server; store only a protected representation; expire and invalidate after use; limit attempts and sends; prevent account enumeration; and log delivery status without logging the code itself. Africa’s Talking delivers SMS, it does not replace these security rules. Email verification can be the default, with SMS OTP optional to avoid SMS charges for every user.

### Notification design

Use push for routine reminders. Use email for account recovery and important service events. Use paid SMS only when a phone check is necessary or a user explicitly requests a critical alert. Keep the existing database notification table as an in-app inbox; do not treat it as proof that a push, email or SMS was delivered.

## 6. Hosting, database and media plan

### During development and pilot

- Continue using the current PostgreSQL-compatible schema and migration history.
- Keep a low-cost cloud staging environment for external mobile testing and store review.
- Keep the production website on its existing host until the University has provisioned and tested its server.
- Use a separate development/staging database. Never test destructive migrations against production data.
- Set usage alerts and AI spending caps. A free plan can pause, impose quotas, or change limits and should not be treated as a service-level guarantee.

### University server migration

The annex recommends an on-premises JOOUST host, PostgreSQL/PostGIS, and local MinIO or secure NAS for media. Before migration, ICT must confirm server capacity, operating system, public DNS/static IP or approved reverse proxy, HTTPS certificate handling, firewall rules, backup destination, UPS/power, physical access, and who responds to outages. The project should migrate the application and database using documented containers/configuration, move media only after checksum and rights checks, run a restore rehearsal, and cut over only after record-count and access checks pass.

**Important:** moving PostgreSQL to a physical server does not make the mobile app publicly reachable by itself. The University must provide secure internet access to the API and storage, or approve a hosted API gateway/cloud edge. Do not expose the database directly to the public internet.

### Media

The checked project folder contains 208 image files but no files in the expected audio/video subfolders (the folder names were not present in the inspected tree). Raw field recordings may exist elsewhere; confirm with the data custodian. The inspected dataset is approximately 326 MB in total, but the university annex expects media eventually to grow to 2–10 TB. A free image-hosting allowance is not a suitable long-term archive for that growth.

## 7. Cost estimate (excluding labor)

All prices below are planning figures as of 9 October 2026, not vendor quotations. KES conversions use a deliberately simple **KES 130 per USD** budgeting assumption; bank exchange rates, card fees, taxes and VAT can change the final amount. Usage APIs are variable and depend on actual volumes.

| Item | Planning cost | When paid | Notes |
|---|---:|---|---|
| Google Play Console | ~KES 3,250 | One time | USD 25; not a recurring app hosting fee. |
| Apple Developer Program | ~KES 12,870/year | Yearly | USD 99; ask if the institution qualifies for a fee waiver. |
| Vercel Pro (if needed for production during pilot) | ~KES 2,600/month starting price | Monthly | USD 20/month with included usage credit; extra usage can be billed. Since this is a public product, do not rely on Hobby for commercial/organizational production use. Stop this cost after a verified server migration if Vercel is no longer needed. |
| Domain name | Budget KES 2,000–5,000/year | Yearly | Depends on chosen domain and registrar. The app can use the existing domain if ownership/renewal are confirmed. |
| Transactional email | KES 0 at low volume; ~KES 2,600/month for Resend Pro | Monthly/usage | Free: 3,000/month and 100/day; paid: USD 20/month for 50,000/month, subject to current provider plan. |
| Africa’s Talking SMS OTP | Quote required; set an initial wallet limit of KES 1,000–3,000 | Usage-based | Price varies by message category, route, sender ID and volume. Do not approve a short code until the project actually needs two-way messaging. |
| Gemini API | Start with a KES 1,000–3,000 monthly cap for pilot | Usage-based | Actual API cost depends on prompt/output tokens, embeddings and traffic. Set a hard budget alert and measure one month of actual usage before asking for a larger ceiling. |
| FCM/APNs push | KES 0 at current basic service pricing | Usage-based/terms may change | Supporting hosting and analytics may have separate limits; review the Firebase project billing settings. |
| Cloudinary media | KES 0 while within current free credits; paid quote/plan if exceeded | Usage-based | Monitor storage plus delivery/transformation credit usage; do not assume the free tier covers large audio/video archives. |
| University database and object storage | KES 0 provider bill if existing capacity is provided in-kind | University-provisioned | Electricity, backup drives, connectivity and support are institutional costs and must be confirmed with ICT; this estimate does not invent a server purchase cost. |
| Google Maps / M-Pesa / SMS short code / speech AI | KES 0 in this scope | Not required | Add only after an approved feature and written cost estimate. |

**Known minimum account fees:** approximately **KES 16,120 in year one** for Play plus Apple, before domain, taxes and service usage. If an organization already owns Play Console, or Apple waives its annual fee, reduce this. A lean cloud pilot could add around KES 2,600/month for Vercel Pro and zero-cost email/push at low volume, plus metered SMS and AI. This is not the total cost of running the University server; that amount cannot be calculated until ICT confirms what is already available.

## 8. Proposed 12-week delivery timeline

| Weeks | Work | Completion evidence |
|---|---|---|
| 1–2: Scope and readiness | Confirm launch modules and target users; choose Android/iOS approach; agree permitted content and data flows; inventory server, domain, store accounts, keys, quotas and current app issues. | Signed scope checklist, app screen map, content list and dependency register. |
| 3–4: App foundation | Set up mobile clients, shared API authentication, navigation, accessibility, app configuration, development/staging builds and basic logging. | Android/iOS test builds can sign in and load approved content from staging. |
| 5–6: Core learning | Build dictionary, proverb, riddle and selected story/songs browse/search; saved items; approved-source display; basic quiz and progress. | Curator and learner walkthrough passes for the agreed content sample. |
| 7–8: Offline and synchronization | Downloadable permitted content packs, local storage, offline search/reading, queued progress, conflict rules, retry and sync status. | Offline and reconnection scenarios pass without duplicate or lost progress. |
| 9: Accounts and communications | Email verification/reset, optional Africa’s Talking OTP, push tokens, FCM/APNs and notification preferences. | OTP/email/push delivery, expiry, opt-out, failure and rate-limit checks pass. |
| 10: AI and governance | Connect the existing RAG/chat via the mobile API; citations, restricted-data filters, content reporting, AI quota controls and privacy wording. | Reviewer-approved question set passes; no restricted sample is exposed. |
| 11: Server and release preparation | University staging deployment and migration rehearsal; backups and restore; Play/App Store listing materials; privacy declarations, screenshots, signing and release notes. | Successful staging restore and release candidates submitted to internal testing/TestFlight. |
| 12: Acceptance and store submission | User acceptance, accessibility/device checks, resolve release blockers, handover documents and submit store builds. | Acceptance checklist signed; builds accepted for store review or store-review actions recorded. |
| Weeks 13–14: Monitored launch | Address store review feedback, monitor crashes, usage, AI/SMS spend and sync failures; hand over operations. | Stable release, first-week incident/cost report and named operational owners. |

Store review timing is outside the development schedule. If approval is delayed, keep the completed build in test distribution and do not promise a public launch date until each store approves it.

## 9. Store and release requirements

### Google Play

- Create or use a JOOUST/project-controlled Play Console organization account and complete developer identity verification.
- Pay the current USD 25 registration fee if no account exists.
- Prepare a signed Android App Bundle, app icon, screenshots, description, age/content rating, support contact, privacy policy URL, data-safety declarations and test credentials for reviewers.
- Complete required internal/closed testing and device verification for any applicable new personal account. Organization accounts avoid the personal-account testing rule described in Play Console guidance, but still require verification and policy compliance.
- At the date of this plan, new apps and updates submitted from 31 August 2026 must target Android 16 / API 36 or higher; re-check Play Console immediately before submission because these requirements change.
- Complete account deletion flow and disclose account/data collection accurately.

### Apple App Store

- Enroll as an organization if the institution owns the app; prepare legal entity details and authority verification.
- Pay USD 99 per year unless a qualifying institution requests and receives an Apple fee waiver.
- Prepare App Store Connect metadata, screenshots, privacy policy, age rating, app privacy disclosures, support URL, demo account/reviewer notes, signing certificates and TestFlight testing.
- If users can create accounts, provide an in-app way to initiate account deletion.
- Ensure the app is more than a thin wrapper around the website: include useful mobile-specific behavior such as offline reading, downloadable content, device push, and a polished mobile experience.
- Because the PRD includes children and the current registration flow records age, decide the intended minimum age and whether the app is directed to children. Complete the relevant child-safety, parental-consent, age-rating and privacy review before publishing; do not submit a children’s category listing by default.

## 10. Is the current Luo data enough to train the model?

**Short answer: not for training a dependable Dholuo model. It is a valuable starting corpus, but it is better suited today to governed retrieval (RAG), embeddings/search, and small classification experiments.**

The prepared NLP package describes 26 source transcripts and 2,708 non-empty text segments. Its validation report passes required-field, uniqueness, source-file, label-row, session-split and checksum checks. It records 16 domains and 6 genres, 88 exact duplicate text segments, and a session split of 17 train / 6 validation / 3 test sessions. This is useful structure, but only three held-out sessions make a weak basis for claiming broad model quality. The sessions are uneven in size (from 2 to 491 segments), and domains are imbalanced (for example, 491 marriage/material-culture segments versus only 2 childhood/belief/social-custom segments).

The parallel Dholuo-English TSV has 2,708 rows, but its README says English cells are blank unless verified; inspection shows the sample translation cell is blank. Therefore it is not a verified parallel translation corpus. Interview text also contains context labels and English/code-switching, so it should not be assumed to be clean conversational Dholuo suitable for speech or translation training. The package marks records `research_only` and `internal`; those restrictions must remain in place unless the relevant custodian approves a specific change.

**What it can support now:**

- RAG answers grounded in approved, permission-checked content, for authorized audiences.
- Semantic search and transcript discovery, provided restricted records are filtered before retrieval.
- A small, carefully evaluated domain/genre classification proof of concept.
- A reviewed test suite of questions and expected answers for chatbot evaluation.

**What it cannot responsibly support yet:**

- Training a strong general Dholuo model from scratch.
- Reliable Dholuo↔English machine translation or grammar correction.
- Dholuo speech recognition, pronunciation scoring or text-to-speech claims.
- Broad cultural conclusions from the corpus without balancing and community review.

**Data needed before model-training claims:** more consent-cleared, speaker-diverse and dialect-aware examples; expert-checked Dholuo orthography; verified line-aligned Dholuo-English translations; explicit splits by interview/session/speaker (never random segments from the same interview across splits); balanced labels; audio paired with verified transcripts for speech; written license/consent scope for each intended use; and evaluation sets reviewed by Dholuo speakers and cultural custodians. Collect a data-quality plan before collecting more data; do not solve quality by merely adding more unreviewed pages.

## 11. Phase One completion review and improvements

### What is demonstrably present in the inspected source

- A Next.js/TypeScript web application with a PostgreSQL/Prisma schema and migrations.
- Public routes and API code for dictionary, proverbs, riddles, oral histories, folktales, songs, artifacts, heritage sites and media.
- Admin/review tools, user roles, audit/provenance/versioning and consent/restriction fields.
- A PWA install prompt; this is browser installation, not a Play Store or App Store app.
- Gemini-based embedding/RAG chat code and AI monitoring routes.
- An NRF-shaped transcript import/export path. The importer deliberately retains the corpus as research-only/internal.
- A chatbot manual in the repository; it is a manual guide, not proof of a successful live acceptance test.

### What the source documents say is still incomplete

The Phase One progress report says some content is only a small sample, selected pages need more reviewed content, the full Luo virtual museum is incomplete, there were no audio/video files in the inspected source at report time, AI answers need cultural review, not all prepared data is in the live database, main journeys need testing, and handover/backups need documentation. It explicitly says a phone “installed app” is currently an installable website rather than a separate native app.

### Phase One acceptance status

**Phase One should be described as “MVP built; acceptance and content completion still required,” rather than fully complete, until the items below are checked on the live deployment.** This is an evidence-based status assessment, not a claim that the system is broken. The source code shows implementation; it cannot prove production configuration, live content quality, security behavior or successful user journeys. No production credentials were inspected and no live-system tests were run for this review.

### Known gaps and simplifications to address before Phase Two

1. **Complete a focused Phase One sign-off.** Select the specific Phase One minimum: Luo-English dictionary, proverbs, riddles, oral histories, basic admin, hosted portal, and NRF-compatible metadata/API shape. Record pass/fail with screenshots and responsible reviewer for each.
2. **Populate a small but trustworthy launch collection.** Prefer a complete set of approved entries in the priority modules over adding every transcript. Check Luo spelling, English meaning, source and media rights.
3. **Keep research transcripts private.** The prepared corpus defaults to research-only/internal. Its importer does not make those items public, and the public RAG path applies public-record filters. Keep that separation; if staff need private AI search, add a separately authenticated route instead of loosening public access.
4. **Resolve configuration/documentation drift.** `README.md` describes Cloudflare R2, while the project package includes Cloudinary and the media-upload code targets Cloudinary; `.env.example` documents R2 variables. Choose the actual provider for each environment, update setup/deployment steps, and remove unused settings.
5. **Finish real email/phone verification requirements.** The current dependencies and inspected API routes show no dedicated email or SMS provider integration. Decide whether email verification/password reset and phone OTP are required for Phase One or explicitly defer them to Phase Two; do not imply that in-app notifications reach phones or email.
6. **Replace placeholder legal/contact configuration.** The privacy/terms source contains bracketed contact/provider placeholders. Before wider public launch, fill the actual operator, contacts, provider names, data locations/retention and AI-data handling. Have the institution review the text.
7. **Prove backups can be restored.** There is a backup script and admin backup area in the source. Produce a dated restore record for database plus sample media, and a short owner/runbook.
8. **Make the AI test manual accurate and repeatable.** Correct any garbled display text, use reviewed question/answer pairs, check source relevance, test no-result behavior, and record whether a failed answer is data/configuration/model related. Make clear it is a manual test, not a training claim.
9. **Simplify the public product.** Promote a few complete learning paths first. Hide or label unfinished/stub areas so users are not sent into empty or placeholder modules. Do not build 3D, advanced AI, or every PRD module before core content and synchronization work.
10. **Unify the scope and timeline story.** The project-manager chat calls its plan a one-week sprint, while the funding request and progress report describe six weeks. Present the week as the early demo and six weeks as the full Phase One plan, if that accurately reflects the agreed history.

### Phase One go/no-go checklist before Phase Two build

- Public learner can browse/search the agreed core modules on phone and desktop.
- Admin can create, review, approve, publish, revise and withdraw a record using separate roles.
- Media upload and display work in the actual production environment.
- Restricted and research-only samples are not visible to guests or public AI.
- Sample chatbot responses cite relevant approved records; culturally sensitive answers have reviewer sign-off.
- Terms/privacy have real institutional contacts and current provider disclosures.
- Database and media backups have a recorded restore rehearsal.
- A named ICT owner has confirmed the server migration prerequisites and public API access design.

## 12. Decisions and dependencies to confirm

1. Which existing JOOUST/organization accounts will own Play Console, Apple Developer, domain, Vercel, Gemini and messaging credentials?
2. Is the mobile app free to use? If yes, no payment collection API is needed in Phase Two.
3. Is SMS OTP required, or will verified email plus Google sign-in meet the user need?
4. Which exact content records are cleared for public app use, external AI processing, and offline download?
5. Will Phase Two launch on University infrastructure, on temporary cloud hosting, or use a hybrid until server readiness?
6. What are the University server’s capacity, network, backup and operating support commitments?
7. Who reviews Luo language, cultural accuracy, privacy wording and app-store submissions?

## 13. Current-price references

Prices and policies can change. Check the vendor pages again before purchasing or submitting a release.

- Google Play Console: [developer registration and account requirements](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- Apple Developer Program: [membership price and enrollment](https://developer.apple.com/help/account/membership/program-enrollment/) and [fee waiver eligibility](https://developer.apple.com/help/account/membership/fee-waivers)
- Google Play target SDK: [current target API-level requirements](https://developer.android.com/google/play/requirements/target-sdk)
- Apple review: [App Store Review](https://developer.apple.com/app-store/review/) and [account deletion requirement](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- Email: [Resend plans](https://resend.com/pricing)
- SMS: [Africa’s Talking Kenya SMS information](https://help.africastalking.com/en/articles/12381163-bulk-sms-kenya) and [short-code notes](https://help.africastalking.com/en/articles/4095180-how-do-i-setup-a-shortcode)
- Push: [Firebase pricing](https://firebase.google.com/pricing)
- AI: [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing?hl=en)
- Hosting: [Vercel Pro plan](https://vercel.com/docs/plans/pro-plan)
- Media: [Cloudinary plan comparison](https://cloudinary.com/pricing/compare-plans) and [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- Database: [Neon plan updates](https://neon.com/blog/neon-free-plan-1-gb-per-project)

