# General-knowledge chatbot — 29 October 2026

The chatbot now answers across topics using the configured model's general knowledge and reasoning. Its knowledge is not restricted to the cultural database. The shared web/mobile chat screen is labelled **AI assistant**, invites questions across topics, and offers both a general science question and a cultural question as examples.

The previous instructions restricted cultural claims to repository evidence and could turn questions such as “What are proverbs?” into a catalog listing. The new instructions allow cultural and language explanations from general knowledge too, with appropriate uncertainty. Retrieved public references supplement answers; they do not define the scope of the assistant. Ordinary answers do not need a missing-database disclaimer. Conversation history still supports follow-up questions.

Explicit collection requests still use verified public records. The assistant must not invent collection entries, media availability, quotations or citations. Generic definitions, creative examples and programming questions are no longer treated as collection browsing just because they contain words such as “dictionary,” “stories,” “images” or “proverbs.” Explanatory questions about video technology are also kept separate from requests to find videos.

No API credentials or provider configuration were changed. Authentication, consent, quotas, conversation ownership and public-source governance remain in place. General knowledge does not add live web search or guarantee current facts; the prompt explicitly prevents claiming to have browsed without supporting tools or evidence.

Verification:

- Full automated regression suite: **386 passed**, recorded in `general-chat-tests-2026-10-29.log`.
- Final targeted tests: **55 passed**, covering general questions without database matches, cultural knowledge beyond repository evidence, relevant sources, conversation context, truthful catalog availability, media explanations and DeepSeek/public-source privacy behavior. Results: `general-chat-targeted-2026-10-29.log`.
- Actual configured DeepSeek checks answered an ice-and-water question, a proverb definition with an original example, and a JavaScript coding request. All three returned substantive answers with zero database citations. The script used a read-only database guard and did not save chats. Results and sample answers: `general-chat-live-2026-10-29.json`.
- Web production compilation/type validation: **passed**, `general-chat-build-2026-10-29.log`.
- Mobile production build: **passed**, `general-chat-mobile-build-2026-10-29.log`.
- Lint: **0 errors**, with 8 existing image-optimization warnings, `general-chat-lint-2026-10-29.log`.

These are local changes; they have not been deployed. Model-generated answers can still contain errors, and the existing review guidance remains relevant.
