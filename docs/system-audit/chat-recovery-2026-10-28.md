# Chatbot recovery

Live diagnosis reproduced a Google HTTP 429 from the configured `gemini-3.6-flash` model. Its response identified a per-project, per-model free-tier limit of 20 requests per day. Greetings and general questions initially worked, but the public catalog request failed after this allowance was exhausted. The previous retry code explicitly stopped on quota errors and its default fallback named the same model.

Text generation now uses the standard stateless API directly, switches to a distinct configured fallback on quota errors and briefly skips a recently exhausted primary model. The tested default fallback is `gemini-3.5-flash-lite`. Saved settings and environment overrides remain authoritative. Authentication/key rejection is never retried as another model. Incomplete output is rejected; no answer is fabricated when all candidates fail.

The single generation budget is 40 seconds, the two chat routes allow a 90-second server window, and quota/history transactions allow 15 seconds instead of Prisma's five-second default. Safe provider configuration errors reach the chat UI; internal exception details remain concealed. Ownership, processing consent and publication access rules remain enforced.

Validation: all 322 regression tests passed. The production build passed, including type checking and all 56 static pages; lint had zero errors and 12 existing nonfatal warnings. Actual Chrome on a 390px screen sent a greeting through the shared chat UI, HTTP handler, real database and live provider and received a fallback answer. A second run sent the previously failing catalog request and received a generated answer with 47 public source entries using `gemini-3.5-flash-lite`. A third used an existing active administrator account sample and verified real conversation/answer inserts inside a rollback-only transaction. The harness supplied that identity directly and returned an empty history fixture; it did not read existing saved chats or test the login screen. All three runs verified the X close action. Their database transactions were deliberately rolled back: no test conversations, AI responses or quota-counter writes were retained. Component translation wrappers and icons were simplified in the browser harness; this was not a complete deployed-site test.

Primary quota remains exhausted until the provider resets or adjusts it. The fallback also has its own provider limits. No billing settings, API keys or existing account data were changed. Image generation was outside this repair.

Logs are stored beside this report. Reproduce controlled live browser checks with `node scripts/smoke-chat-live.cjs` or `node scripts/smoke-chat-live.cjs --catalog`; these consume real provider requests even though database writes roll back.

Provider references: [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [Gemini thinking configuration](https://ai.google.dev/gemini-api/docs/generate-content/thinking).
