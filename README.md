# MedGuide AI MVP

This is a functional local MVP built from the original single-file prototype. It includes:

- email/password account creation and sign-in;
- hashed passwords and HTTP-only session cookies;
- editable user profiles;
- server-persisted symptom checks and report history;
- real AI symptom guidance and chat through OpenRouter API;
- structured AI output, emergency-language guardrails, and a fixed catalog of reviewed health sources;
- no API key in browser code.

## Run it today

You need Node.js 20 or newer and an API key from [OpenRouter](https://openrouter.ai/keys).

1. Install the project packages:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env`, then replace the placeholder with your OpenRouter API key:

   ```bash
   cp .env.example .env
   ```

   On Windows Command Prompt, use `copy .env.example .env`.

3. Start the app:

   ```bash
   npm start
   ```

4. Open <http://localhost:3000>, create an account, and complete the optional profile.

The default model is `google/gemini-2.5-flash`. You can change `OPENROUTER_MODEL` in `.env` to any supported model on OpenRouter (such as `openai/gpt-4o-mini`, `meta-llama/llama-3.3-70b-instruct`, or `anthropic/claude-3.5-sonnet`).

Never paste your API key into `public/index.html` or `public/app.js`; `.env` is already excluded from Git.

## Data and privacy

Local account and check data is written to `data/app.json`. The file is excluded from Git. Passwords are salted and hashed; session tokens are stored as hashes. Symptom text sent for analysis or chat is transmitted to OpenRouter.

Google currently states that content submitted through the Gemini free tier may be used to improve its products, while paid-tier content is not. Do not use identifiable or real patient health data on the free tier. Confirm the current terms, privacy rules, and billing tier in Google AI Studio before testing with sensitive information.

This is an MVP, not a production medical system. Before accepting real patient information or publishing publicly, move persistence to a managed database, add email verification/password reset, define retention and deletion policies, perform a security review, and obtain legal/privacy/clinical review for every region where the app will operate.

## Safety boundaries

The app is intentionally described as informational health guidance. It does not provide a diagnosis. A deterministic warning-sign check runs before the AI request, AI analysis uses a strict JSON schema, and the model may select sources only from the server's fixed source catalog.

These controls reduce risk but do not clinically validate the product. Human review, evaluation with representative and adversarial cases, monitoring, and a clear incident/reporting process are still required before real-world healthcare use.

## Useful commands

```bash
npm run dev   # restart automatically when files change
npm test      # run the account/profile/analysis/chat/history integration flow
npm start     # normal local start
```

## Project structure

```text
public/index.html   Interface and original visual design
public/app.js       Browser-side interactions
server.mjs          Accounts, sessions, persistence, AI routes, and static server
data/               Local database directory
test/               End-to-end API integration test
```
