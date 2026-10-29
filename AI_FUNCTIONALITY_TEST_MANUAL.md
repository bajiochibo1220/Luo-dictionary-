# AI Chatbot Test Manual


## Current interface and policy update - 30 October 2026

The current public assistant is **CULTURAL HERITAGE**, scoped to Luo cultural knowledge, history, songs, traditions and Dholuo. It may combine general model knowledge with retrieved public sources. Test English/Dholuo question handling and the expandable translation into the other language, source accuracy, processing consent, provider errors and saved-history permissions. Older examples implying an unrestricted general-purpose assistant are superseded.

Language preference is selected during registration. Approved public Dholuo interface text shows read-only English below; public sidebar/masthead language selectors are removed. Admin target-language controls remain for assigned editing work. Login opens first; public browsing is an explicit option. Forgotten password contains only the reset sequence, and email delivery requires a configured verified sender and provider key. Account deletion is a separate confirmed action.

Explore uses a top-layer scrollable dialog with Back/X, including short landscape screens. Item-details Back/X remain visible while scrolling. Header Back controls cover web and shared packaged-client views. Search is pinned above the feed; media filters are fixed in the compact black bottom dock. More/less expands the short description inline; Explore this item shows complete information. Contribute opens the active collection's form and preserves it through sign-in. Browser installation uses native eligibility and Safari's Add to Home Screen fallback.

Current operational notices are applied consistently to customized legal text, public legal pages and registration consent fingerprints. They do not alter historical acceptance records or fill unknown institutional details. Complete operator/contact/provider/retention/transfer fields before treating the policy drafts as finalized. See the current user and administration guides in docs, and docs/legal/CURRENT_PLATFORM_NOTICES_2026-10-30.md (paths are relative to the repository root).


## Purpose

Use this guide to check that the Luo Lingua AI chatbot accepts questions and gives useful answers about Luo language and culture.

## Before you start

- Open the Luo Lingua website in a web browser and make sure you have an internet connection.
- You can test as a visitor. Sign in if you also want to check that chats appear in your chat history.

## Test the chatbot

1. Open **Chat** (or the chatbot page) from the website.
2. On the first screen, choose a suggested question or type your own question in the box at the bottom.
3. For the proverb test, enter: **Explain the proverb Ng'ato ok nyal timo gima ok onyal**. Press Enter or click the send button.
4. Wait for the answer to appear. Check that it explains the proverb in clear language. The stored meaning is **“Accept your limitations”**; the interpretation is **“Know your limits and respect them.”** The answer may use different wording, but it should keep this meaning.
5. If source labels appear below the answer, check that they refer to relevant cultural information.
6. Ask another question, such as **What does nyathi mean?** Check that the chatbot responds again.
7. Try a question about media, such as **Show me the Luo cultural artifact videos**. If matching media is available, it should appear in a results panel.
8. If the **Answer language** menu is shown, change it to English and ask a question again. Check that the answer uses the selected language.

## What should work

- Your question appears in the chat and the chatbot replies without an error.
- The answer is related to the question and understandable.
- The proverb answer keeps the meaning described above.
- Relevant sources or media are shown when available.
- You can send another question after receiving an answer.

## If something goes wrong

Refresh the page and try once more. If the problem continues, record the question you asked, what happened, and the date and time. Take a screenshot if possible and share these details with the project owner. Do not treat an incorrect or confusing answer as correct; report it for review.
