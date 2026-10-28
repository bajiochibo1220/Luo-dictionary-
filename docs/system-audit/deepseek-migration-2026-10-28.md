# DeepSeek migration — 28 October 2026

This installation uses DeepSeek for chatbot answers, source-grounded answers, tutor conversation, translation, grammar and writing feedback, story drafts, summaries, entity extraction, OCR and image descriptions. Text and vision share the fixed official server-side Chat Completions endpoint. The default model is `deepseek-flash`; the administrator can select an available model.

Legacy Gemini provider selections cannot reactivate Google. Automatic embedding jobs are disabled; explicit legacy indexing access also fails without contacting Google. Existing stored credentials and vectors are retained. Public retrieval uses bounded database text lookup over eligible records, dictionary entries and transcripts, followed by current-record eligibility checks. This is keyword retrieval, with different matching behavior from the former vector search.

DeepSeek's documented API supports text and image understanding. It does not expose the audio transcription or image generation endpoints required by the former tools. These capabilities are disabled in media-tool choices, and direct unsupported requests fail before any file is fetched or sent to a provider. Personal recording, playback, downloads, manual transcripts and browser dictation remain available. Browser dictation is a separate browser service and requires its existing consent.

Both the web System screen and shared mobile management settings offer DeepSeek credentials. The batch-summary command uses DeepSeek; the retired embedding command returns an informational message. Service diagnostics use the new router.

Setup: Super Admin > System > API Credentials > DeepSeek API Key > Save API Keys > Test AI connection. `DEEPSEEK_API_KEY` and `DEEPSEEK_MODEL` override saved values. Never put the key in client configuration. Saved secrets remain masked; setting audits record names rather than values. The connectivity test requires administrator authorization and a same-origin JSON request, applies quotas, and returns provider/model only. Provider error bodies and reasoning content are not returned to users.

Validation:
- TypeScript check passed after the media capability change.
- Final complete regression: 334 tests passed, 0 failed.
- After the secondary mobile settings and CLI update, 34 related tests passed.
- Focused DeepSeek tests: 12 passed, including text/vision payloads, missing credentials, safe errors, completion validation, public retrieval, role checks, masked saves, connection-test protection and zero requests for unsupported capabilities.
- Chrome at 390 px: actual chat UI, HTTP handler and database displayed the missing DeepSeek key instructions; no overflow or browser exceptions; X closed the chat. The quota transaction was rolled back. This was an error-path check, not a live generation test.
- Live read-only public lookup: 10 results for fishing equipment; no Gemini request.
- Mobile client production build passed, with the existing bundle-size warning.
- Final web production build passed, including the secondary settings changes, type validation and all 57 static pages. Lint passed with 0 errors and 12 warnings. The existing Tailwind module-type warning remains.

No DeepSeek key is configured in the available environment or saved settings. Live DeepSeek text/vision generation has therefore not been tested. Enter a valid funded API key and use the connection test before deployment. Cultural records and accounts were not modified by migration verification.

Official references:
- https://api-docs.deepseek.com/api/create-chat-completion/
- https://api-docs.deepseek.com/guides/vision/
- https://api-docs.deepseek.com/quick_start/error_codes/
