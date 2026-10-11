# LuoLinguaAI Phase Two — Project Summary

**Purpose:** A short summary of what Phase Two will deliver, what services it needs, the likely payments, and how long the work may take. All prices are estimates and exclude labour.

## What Phase Two will deliver

- An Android app and an iPhone app connected to the current LuoLinguaAI system.
- Lessons and approved content for the dictionary, proverbs, riddles, selected stories, songs and cultural items.
- Search, quizzes, saved words and simple learning progress.
- Downloaded lessons that can be read without internet. Progress made offline should upload when the phone reconnects.
- AI chat that uses approved project information and shows which sources it used.
- Phone notifications, email account messages, and optional SMS phone verification.
- A Dholuo speech-to-text trial that the Luo developer (me) can check personally.
- Real service checks: send SMS login codes and ordinary test texts, receive real account emails, and receive push notifications on Android and iPhone. Keep a record of which tests passed and what paid usage they consumed.
- A tested plan for moving the website, database and media to the JOOUST server.
- Testing on Android and iPhone, store submissions, backup instructions and handover notes.

## Services and payments needed

The cost estimates below use **KES 130 per US dollar** for simple budgeting. The final amount may change with exchange rates, tax and the provider’s current prices.

| Service | What it is for | Estimated payment |
|---|---|---:|
| **Google Play Console** | The account used to test and publish the Android app. | Assumed to be available through JOOUST. If a new account is needed, registration is **USD 25 once, about KES 3,250**. |
| **Apple Developer account** | The account used to test and publish the iPhone app. | Assumed to be available through JOOUST. Apple membership is **USD 99 each year, about KES 12,870**, if a new membership or renewal is due. An eligible university can ask Apple to waive the fee; Apple decides whether to approve it. |
| **Mac computer for iPhone release** | Apple’s computer tools are used to prepare and sign the iPhone app. | Assumed to be available through JOOUST. If not, JOOUST will arrange access to a Mac or an online Mac service. |
| **Africa’s Talking account and SMS service** | Sends real text messages, including one-time phone sign-in codes and agreed urgent alerts. The code is created and checked by LuoLinguaAI; Africa’s Talking delivers the text. | JOOUST creates and owns the account and gives the developer (me) testing keys. The 2025 Kenya price sheet lists **KES 0.80 per SMS** on the entry plan, before 16% VAT, or about **KES 0.93 including VAT**. 100 test messages would cost about **KES 93**, before any sender-name fee. JOOUST must add SMS credit for live tests and confirm the current rate. |
| **Africa's Talking sender name** | Registers the name shown on real SMS messages. Africa's Talking says a sender name is needed to send messages; a short code is for two-way texting and is not needed for this app. | Budget **KES 14,100** for Safaricom and Airtel together, before VAT (about **KES 16,356** with VAT). One network only is listed at KES 8,700 before VAT. JOOUST must apply and get approval. Confirm current charges and timing with Africa's Talking. |
| **Africa's Talking short code (not planned)** | A short number that people can text to use a two-way SMS service. | Not needed for login codes or one-way alerts. Request a separate quote only if users will need to text the system. |
| **Google Cloud Speech-to-Text** | Changes spoken Dholuo into written words. Google lists Luo (Kenya) as supported. | For testing, use the developer’s (my) Google account and API key. Standard use is listed at **USD 0.016 per minute, about KES 2.08 per audio minute**. A batch option is listed at about **KES 0.39 per minute** but may take longer. Before public launch, JOOUST should create its own account and replace the test key. |
| **Dholuo spoken audio / text-to-speech** | Reads Dholuo words aloud. | A ready-made Dholuo computer voice was not confirmed. Use recordings made or approved by the Luo developer (me) for the first release. Get a separate quote only if a computer-generated Dholuo voice is required. |
| **Email service (example: Resend)** | Sends verification links, password reset messages and account notices. This is separate from Africa’s Talking SMS. | JOOUST creates and owns the email account and gives the developer (me) testing access/keys. Resend currently allows **3,000 emails/month and 100/day free**; its listed paid plan is **USD 20/month, about KES 2,600**, if needed. JOOUST can instead provide its approved email service. |
| **Firebase and Apple push notifications** | Sends reminders and updates to phones. | **KES 0** for the basic notification services at current published prices. |
| **Gemini** | Runs the current AI chat, search and summaries. | Charged according to use. Start with a small monthly spending limit and check actual usage before increasing it. |
| **Vercel and Render for development/testing** | Free temporary places to run and check the website and app connections during development. The JOOUST server is already working and is the planned live host. | **KES 0** while using their free testing plans within limits. Vercel’s free Hobby plan is for personal/non-commercial use, so it is not the planned public production host. Render free services can sleep after inactivity and lose files saved on the service; use Neon/Cloudinary for test data and files. |
| **Neon database for development and testing** | A free online copy of the database for building and testing before moving to the JOOUST server. | **KES 0** within Neon’s free limits. The current free plan allows up to 1 GB of database storage per project. It is for development/testing; move live users to JOOUST’s server or an approved paid production plan. |
| **Cloudinary pictures and videos for development/testing** | Holds and displays pictures and videos while the app is being built and tested. | **KES 0** on the current free plan, which includes 25 monthly credits shared between storage, image/video processing and delivery. If the project launches publicly or exceeds the free allowance, pay for a suitable plan or move files to JOOUST storage. |
| **JOOUST server, internet address and file storage** | Hosts the public system after testing is complete. | JOOUST already has a working server and domain. **No new hosting or domain fee is included**, assuming the existing server has enough space and internet access. |

### Payment summary

- JOOUST is assumed to already have a working Google Play account. If it does not, JOOUST will arrange the **USD 25 (about KES 3,250)** one-time registration. iPhone publishing needs an active Apple Developer membership at **USD 99/year (about KES 12,870)** unless JOOUST qualifies for a fee waiver.
- Use the existing JOOUST domain; no new domain purchase is included.
- Use Neon, Cloudinary, Vercel and Render free plans for development/testing within their limits. The working JOOUST server is the planned live host; no paid Vercel or Render production hosting is included.
- JOOUST creates and owns the Africa's Talking account, adds SMS credit for real tests and gives the developer (me) testing keys. SMS is about **KES 0.93 each including VAT** at the 2025 entry price. Budget separately for the sender-name registration needed for real SMS delivery.
- Africa's Talking sends SMS; email needs a separate approved email service. JOOUST will provide access/keys for live email tests. Gemini and speech-to-text costs depend on use.
- **There is no payment collection service in this plan** because the app is expected to be free. If users will pay for anything, approve that separately and add M-Pesa or the relevant store payment service.
- Publishing on Google Play and Apple’s App Store makes the apps available for download; those stores do **not** host the website, database or media files.

## Current data and AI readiness

### What is already available

- The inspected `LUO DATA/Data/Data` folder has **354 files, about 326 MB in total**: 119 Word documents, 208 pictures, 8 JSON files, 5 PDFs, 5 CSV files, 2 ZIP files, 2 Excel files, 2 Markdown files, and one each of TSV, JSONL and Python files.
- The prepared language package was made from **26 transcripts** and contains **2,708 text sections**. It has **16 subject labels**, **6 content-type labels**, and **88 exact repeat text sections**. The test split is by interview/session: 17 training, 6 checking and 3 final test sessions.
- The package includes interview text, source-file names, source checksums, county/site fields, subject labels and content-type labels. It is marked **research-only/internal**.
- The Dholuo-English table has 2,708 rows, but the package notes that English text is blank unless checked. Most English translation cells are blank or unverified.
- The inspected folder has pictures but no audio or video files. The pictures are not a labelled image-training collection.
- The 354 files include research reports, analyses, repeated/working documents and transcripts. They are not 354 separate, clean AI training datasets.

### What each AI feature needs from the data

| AI feature | What the available data supports | What is still needed |
|---|---|---|
| Chatbot and question answers | The current system already has Gemini chat and search code. Approved records can help it find source material and answer questions from that material. | Choose which records are approved for public answers. Test real questions, check that answers cite the right source and keep internal transcripts out of public answers. This uses the existing AI service; it is not a newly trained Luo model. |
| Search for words and cultural information | The 2,708 text sections and their labels are a useful starting point for searching and finding related records. | Import the permitted records, build their search entries, check searches with real questions and confirm restricted records stay private. |
| Speech-to-text (spoken Dholuo to written words) | Google lists Luo (Kenya) for its speech service. The Luo developer (me) can make recordings and check the written results. | The folder has no audio. Make permission-cleared test recordings and correct written versions; test different words, speakers and recording conditions. More paired audio and checked writing is needed before claiming broad accuracy or training a speech model. |
| Text-to-speech (written Dholuo read aloud) | The text can be used to make a list of words and sentences to record. | No ready-made Dholuo computer voice was confirmed. Record Dholuo audio and check it, or get a separate price for a custom computer voice. |
| Dholuo-English translation | The package identifies Dholuo text and has a place for English translations. | Most translations are blank or unverified. Add sentence-by-sentence English translations checked by the Luo developer (me) before attempting to train or promise automatic translation. |
| Grammar and writing help | The transcripts provide examples of how people speak and discuss Luo topics. | Add clean written examples, spelling choices, corrected versions and explanations checked by the Luo developer (me). Interview transcripts alone are not enough to teach reliable grammar. |
| Lessons and quizzes | Existing dictionary, proverb, riddle and cultural material can support simple lessons and quizzes where entries are complete and approved. | Arrange the content into lessons by level, with clear answers, explanations and learning goals. |
| Subject and content-type labelling | The package already has 16 subject labels and 6 content-type labels, so it can support a small test. | Some labels have very few examples and some subjects dominate. Review labels and add balanced examples before relying on automated classifications. |
| Names, places and cultural links | Transcripts and site/county fields can help identify possible people, places, objects and practices. | Check names and relationships manually, add consistent labels and have the Luo developer (me) verify them before publication. |
| Image recognition and OCR | There are 208 pictures and many document files to inspect. | No checked picture labels or OCR answer set was identified. To test image recognition, label pictures with correct names and permissions. To test OCR, provide clear sample pages and manually checked text. |

**Overall:** The data is useful for source-based chat, search, simple lessons and small experiments. It is **not ready to train a dependable Luo translation, grammar, speech or image model**. The main missing pieces are checked translations, audio paired with corrected text, balanced examples, checked image labels and approval for the intended use. The Luo developer (me) can perform the Dholuo checks during development; no additional Luo speaker is assumed for routine tests.

## Timeline

**Estimated development time: about 15 weeks**, working about **7 hours per working day, 5 days a week**. This is about **525 working hours**. Phase One took about 10 days, or roughly 70 working hours, and delivered the first web version. Phase Two covers more work: two phone apps, offline use, safe syncing, text messages, speech testing, store checks and deployment/testing on the existing JOOUST server. The schedule also allows time to test, fix problems and deal with interruptions. Google and Apple review the store submissions separately, so a store decision can take longer than the development schedule.

| Weeks | Main work |
|---|---|
| 1–2 | Confirm the features, approved content, store accounts and SMS needs; prepare access to the working JOOUST server. |
| 3–5 | Build the Android and iPhone app foundations and connect them to the existing system. |
| 6–8 | Add the learning content, search, lessons, quizzes, saved words and progress. |
| 9–10 | Add downloads, offline reading and progress syncing when internet returns. |
| 11 | Add email, optional SMS codes, phone notifications, AI chat and the Dholuo speech-to-text trial. |
| 12 | Connect the tested system to the working JOOUST server, move the approved database/media, check backups and prepare store submissions. |
| 13–14 | Test on real phones and with users, fix problems, and complete store submissions. |
| 15 | Allow time for final fixes, interruptions, handover and store follow-up. |

### Why Phase Two needs about 15 weeks

- **Two separate phone systems:** Android and iPhone use different tools and store rules. Each needs its own build, account setup and checks.
- **Offline use is complex:** Lessons must download, stay available without internet, and sync later without losing or duplicating a learner’s progress.
- **More services must work together:** Email, SMS codes, phone notifications, AI chat, speech-to-text and the existing website all need to work together. Each one needs setup and failure checks.
- **The server is already available, but connecting and checking it takes time:** Configure the system on the JOOUST server, move the database and media from test services, confirm access rules, and check that backups can be restored before public use.
- **Testing takes real time:** The app needs checks on different phones, with slow or missing internet, and with users completing normal tasks. Problems found during testing need time to fix and check again.
- **Internet or power interruptions can stop progress:** Building and testing depend on a working computer, internet access, and sometimes cloud services. A network or power outage can delay work, downloads, builds and remote checks.
- **Accounts and approvals may take time:** Store account verification, SMS sender-name approval, access to keys, and decisions about which cultural material can be used may take days or weeks outside the development work.
- **Store review is outside the developer’s control:** Google or Apple may request changes or take additional time to review a submission. The 15 weeks includes preparation and follow-up, but a delayed store decision can extend the public launch date.
- **Phase One was an early web version:** The 10-day work created the current web starting point. Phase Two adds the above mobile, offline, communication, migration and release work, so the same calendar duration is not a realistic estimate for the larger set of deliverables.

These are planning reasons, not a promise that every delay will happen. The schedule can stay near 15 weeks if store accounts, approved content, service keys, network/power access and JOOUST ICT support are available when needed. If those are delayed, the release date should move rather than skipping security, testing or backup checks.

## Assumptions and arrangements

- **Google Play:** JOOUST already has an account for publishing Android apps.
- **Apple/iPhone:** JOOUST will arrange an Apple Developer account and pay its annual fee if no active account or approved fee waiver is available. JOOUST will also provide access to a Mac or approved online Mac service for preparing the iPhone app.
- **JOOUST server:** The University already has a working server and domain. The app will be tested with free cloud services during development, then connected to the JOOUST server for launch. Server storage, internet access and backup arrangements are provided by JOOUST.
- **Free development/testing services:** Neon, Cloudinary, Vercel and Render will be used on free plans within their limits. Vercel and Render are for testing; the JOOUST server is the planned public host. Free Render services can sleep when idle and are not a place for permanent files.
- **Africa's Talking:** JOOUST creates and owns the account for SMS. LuoLinguaAI creates and checks the one-time login code; Africa's Talking delivers it by text. JOOUST adds credit, applies for the sender name needed for real SMS, and gives the developer (me) test keys/secrets. A short code is not required for login codes.
- **Email:** Email is separate from Africa's Talking SMS. JOOUST creates/provides access to its approved email service or an email provider such as Resend, and gives the developer (me) test keys/secrets. Email delivery will be tested by sending real messages.
- **Gemini and speech testing:** The developer (me) will use my own Google account/key for Gemini and speech-to-text development tests and manage the test usage. Before launch, JOOUST creates its own account/project, adds payment details if needed, and provides production keys/secrets; the app is changed to use JOOUST's account.
- **Push notifications:** Firebase and Apple push services will be set up and tested by sending real notifications to Android and iPhone devices. They have no basic per-message charge, but require the correct app and account setup.
- **Language checks:** The Luo developer (me) will check Dholuo wording and the speech-to-text results using recordings I make or have permission to use. No additional Luo speaker is budgeted for routine development testing.
- **Payment collection:** The app is assumed to be free to users, so M-Pesa or in-app purchase services are not included.
- If an account, access key/secret, SMS/email credit, sender-name approval, device, or other service access is missing, JOOUST will arrange it. Waiting for those arrangements may move the schedule.

## Price references

Prices can change. Confirm them before purchasing.

- [Google Play developer account](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- [Apple Developer annual fee](https://developer.apple.com/help/account/membership/program-enrollment/) and [university fee waiver](https://developer.apple.com/help/account/membership/fee-waivers)
- [Africa’s Talking Kenya SMS price sheet](https://help.africastalking.com/en/articles/12381163-bulk-sms-kenya) and [sender name/short code information](https://help.africastalking.com/en/articles/4095180-how-do-i-setup-a-shortcode)
- [Google Speech-to-Text languages](https://docs.cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages) and [prices](https://cloud.google.com/speech-to-text/pricing)
- [Resend email prices](https://resend.com/pricing)
- [Firebase prices](https://firebase.google.com/pricing)
- [Gemini API prices](https://ai.google.dev/gemini-api/docs/pricing?hl=en)
- [Vercel hosting prices](https://vercel.com/docs/plans/pro-plan)
- [Neon free database plan](https://neon.com/blog/neon-free-plan-1-gb-per-project)
- [Cloudinary free plan and monthly credits](https://cloudinary.com/pricing)
- [Render free service limits](https://render.com/docs/free)
- [Vercel free-plan terms](https://vercel.com/legal/terms)

