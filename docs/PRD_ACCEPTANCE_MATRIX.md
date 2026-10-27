# PRD acceptance and audience coverage

Source: the actual Word document, extracted again on 27 October 2026 into [verified source text](system-audit/prd-source-verified.txt). The document supplies requirements; the user's request authorizes implementation. Software implementation, authentic content, and observed outcomes are tracked separately. See the [section 1–15 tracker](../PRD_IMPLEMENTATION_TRACKER.md) for all modules and dataset-dependent limits.

## Audiences

Every audience is selectable from Start here, without registration or a privilege change. The module directory and subject browser remain available to everyone.

| PRD audience | Working entry paths | Access boundary |
| --- | --- | --- |
| Children | Children's stories, riddles, lessons and games | Adult-supported public exploration; reviewed suitable content must be supplied. |
| Youth | Games, tutor, folktales | Sign-in and consent for personal AI practice and saved progress. |
| Adults | Lessons, dictionary, calendar | Public discovery; optional account for personal progress. |
| Schools | Courses/classrooms, lessons, children's stories | Classroom management requires assigned teaching permission. |
| Universities | Research, courses, oral histories | Private material depends on assigned access and source consent. |
| Researchers | Research portal, connections, oral histories | Private exports require research/curation permission. |
| Cultural institutions | Subjects, contributions, calendar | Contributions pass independent review/publication. |
| Museums | Artifacts, heritage sites, artifact contribution | Rights, museum metadata and eligible models must be provided. |
| Tourists | Places map, heritage sites, dictionary | Only separately approved public locations; visitor information depends on sources. |
| Diaspora communities | Songs, tutor, saved items | Permitted downloads/offline packs; AI requires connectivity. |
| Linguists | Dictionary, research, connections | Linguistic and source accuracy needs expert review. |
| AI researchers | Research datasets/models, media tools, connections | Source rights and permitted export/use apply. |
| Government cultural agencies | Reports, heritage map, contributions | Institutional affiliation does not grant administrative authority. |

## Roles in section 6

Guests browse public material. Registered users have personal history/saves and voluntary student profiles/progress. Teachers and researchers receive explicit community assignments. Administrators manage assigned scopes; `language_admin` supplies moderation, `content_editor` supplies cultural review/editing, and `publisher` performs final publication. Super/Master administrators have distinct management duties. Self-selected interests and audience choices never grant any of these permissions. This maps the PRD's Moderator capability to the existing moderation role rather than introducing an additional conflicting permission system.

## Section 15 success indicators

The PRD specifies outcomes without numeric acceptance thresholds. The measures below do not invent completion percentages or adoption results.

| Success indicator | Implemented support and evidence | Acceptance still required |
| --- | --- | --- |
| Authentic knowledge in a secure repository | Reviewed publication, consent, protected assets, copyright fields, audit and backup tooling; permission regression tests. | Curator confirmation of authentic holdings, operational backup restoration and deployment security review. |
| Engaging, accessible learning across ages | Thirteen audience paths, three lesson levels, four practice skills, distinct games, responsive navigation and logo checks at 320/390/768/1440 px. | Representative children/adult/older-user and assistive-technology testing; reviewed age-appropriate content and learning-outcome evaluation. |
| AI language processing and cultural retrieval | Tutor/chat, semantic retrieval, entity/knowledge links, OCR/transcription/image tools, browser speech integration; governed-source and failure tests. | Live configured-provider evaluation; recorded provider quota failure remains unresolved. Dholuo calibrated pronunciation/voice and custom recognition need approved training data. |
| Curated datasets for educators/researchers | Public research and role-scoped teaching/research reads, transcripts, datasets, reports, model metadata and authorized export paths. | Consented curated holdings and educator/researcher acceptance of data quality and reuse terms. |
| Adoption and sustained local/diaspora engagement | Activity, search, AI, downloads, learning and engagement instrumentation; diaspora discovery and offline features. | Actual users and longitudinal measurements. No adoption result is inferred from automated tests. |
| Expansion to other indigenous languages | Active-community selection, shared feature routes and paired English content/interface catalog. | Reviewed content/wording and operational acceptance in each added community; representative scale tests. |

## Delivery boundary

Android/iOS source projects and the shared packaged UI are present. Web/packaged UI builds can be checked here; signing, physical-device acceptance, iOS compilation on macOS, store publication and physical-server deployment remain external work, as the user requested. Reviewed translations/content, live AI quota/configuration and user adoption are separate prerequisites, not large-dataset exceptions. Existing documentation covers user, training, technical/model, deployment and maintenance workflows.

Current discovery verification uses the real shared application with isolated fixture transport and no production account/content writes. It proves route/layout interactions and public query construction; it does not certify institutional acceptance or full accessibility.
