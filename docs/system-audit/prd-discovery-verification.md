# PRD discovery verification — 27 October 2026

The Word PRD was read directly; its extracted text is [preserved here](prd-source-verified.txt). Existing module implementations were reviewed alongside the section 1–15 tracker. This follow-up closes public discovery gaps; it does not certify all PRD outcomes or stakeholder acceptance. See the [audience and success matrix](../PRD_ACCEPTANCE_MATRIX.md).

| Check | Result | Evidence |
| --- | --- | --- |
| Complete regression | 245 passed, 0 failed; runner exit 0 | [Log](prd-discovery-regression.log) |
| Final web production build | Passed, exit 0; compilation, type validation, 53 static pages and packaging completed | [Log](prd-discovery-production-build.log) |
| ESLint | 0 errors, 39 warnings | Included in production build log; image/hook warnings remain. |
| Final packaged UI | TypeScript and Vite passed, exit 0 | [Log](prd-discovery-packaged-build.log); runtime configuration loader used. |
| Browser interactions | Passed at 320, 390, 768 and 1440 px | [Results](prd-discovery-browser.json), [phone](prd-discovery-320.png), [desktop](prd-discovery-1440.png) |
| Real database | Public subject classification, permission/embargo exclusions, redaction and withdrawal passed; all five fixtures rolled back and confirmed absent | [Rollback-only harness](verify-prd-discovery-database.cjs) |
| Built-server HTTP | Public application, exact discovery redirect targets, invalid subject 400, real public subject response 200 and anonymous account 401 passed | [Results](prd-discovery-http.json), [harness](verify-prd-discovery-http.cjs) |
| Whitespace | `git diff --check` passed | Ordinary CRLF normalization warnings remain. |

Browser checks render the actual shared application with fixture transport and no production account/content writes. They exercise all thirteen audience options, fifteen module links, twenty-seven subject destinations, scoped search, compact navigation, page scroll restoration and loaded 48/56 px app artwork. The built-server HTTP check uses real public reads; its temporary local server is stopped afterward. Next.js may deliver an async page redirect as an HTML refresh after streaming begins; the harness verifies the exact destination for both streamed and HTTP-location redirects.

New subject queries retain publication, consent, restriction, embargo and eligible-media filters. Disabled collection IDs are excluded, and the structured dictionary cannot bypass its disabled module through subject discovery. Personal identities, private metadata and operational credentials are not added to the public projection. No migrations or existing cultural-content edits were needed.

The test environment blocks some compiler/browser subprocesses under its default sandbox; verification used approved subprocess access. The test runner uses `--test-isolation=none` to avoid the environment's child-process restriction. Build logs also retain module-format and packaged-bundle warnings. No warning is counted as a security or performance certification.

Remaining acceptance work includes authentic reviewed holdings, fluent interface translations (63 new strings are editable), live provider quota/output-quality validation, custom Dholuo pronunciation/voice and cultural reconstruction/classification training data, representative accessibility/security/load evaluation, operational restore rehearsal, native device/signing/store work, physical deployment and real adoption/learning outcomes. Physical/store work remains outside this implementation as requested. No new live-provider success or 100% PRD completion is claimed.
