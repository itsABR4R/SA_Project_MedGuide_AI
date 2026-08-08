# MedGuide AI MVP

This is a functional local MVP built from the original single-file prototype. It includes:

- email/password account creation and sign-in;
- hashed passwords and HTTP-only session cookies;
- editable user profiles;
- server-persisted symptom checks and report history;
- real AI symptom guidance and chat through OpenRouter API;
- structured AI output, emergency-language guardrails, and a fixed catalog of reviewed health sources;
- no API key in browser code.

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
