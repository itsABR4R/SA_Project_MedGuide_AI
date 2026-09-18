# MedGuide AI

MedGuide AI is a professionally structured MERN application for informational health guidance. It provides private user accounts, one-time onboarding, symptom analysis with multiple ordered matches, AI follow-up chat, user profiles, and saved check history.

> MedGuide AI does not provide a diagnosis and is not an emergency service or a replacement for a qualified medical professional.

## Technology

| Layer       | Technology                                                   |
| ----------- | ------------------------------------------------------------ |
| Client      | React 19, Vite, CSS                                          |
| Server      | Node.js, Express 5                                           |
| Database    | MongoDB (local or Atlas), Mongoose                           |
| AI provider | OpenRouter, accessed only by the server                      |
| Deployment  | Vercel-compatible Express Function and CDN-hosted Vite build |
| Quality     | ESLint, Prettier, Node test runner, Vitest, Testing Library  |

All project-owned Node modules use standard `.js` filenames. Modern ECMAScript modules remain enabled through `"type": "module"` in `package.json`; the project does not use `.mjs` files.

## Features

- Account registration, sign-in, sign-out, and profile management
- Password-free guest signup with required name, age, and occupation for structured user testing
- Seven-step product tour shown once for each newly created account
- AI symptom analysis with one primary pattern and 2–3 lower matches
- Multi-point pattern explanations with relative symptom-match percentages
- Simple bullet explanations with per-pattern detailed narrative popups
- Visible “Check another symptom” navigation that fully replaces the old report, resets the form, and returns to the page top, plus a wider responsive explanation dialog
- Reviewed sources and action plans for each saved symptom check
- Emergency-language detection and urgent-care guidance
- Contextual health assistant chat through OpenRouter
- Symptom-check query shown above each saved analysis result
- Symptom-check summaries displayed as explicit chat context, not simulated AI responses
- Symptom-scoped chat history: the assistant shows only the selected check's chats and branches
- Check History controls for opening a report's chats or separate general/unlinked conversations
- Cascading check deletion that also removes every linked main chat and branch
- Account-based chat history with new-chat, reopen, and delete controls
- Collapsible conversation folders with up to two context-preserving branches per main chat
- Copy controls for every message and read-aloud controls with device-voice selection plus server-generated audio fallback
- Clean AI response formatting for display, copy, and speech, including previously saved replies
- Browser voice typing for symptom descriptions and chat messages, with an editable transcript before submission
- Persistent English/Bangla interface mode available on every page, including localized dates, numbers, errors, speech input, AI guidance, and chat replies
- MongoDB-backed registered and guest accounts, sessions, onboarding state, and check history
- Salted `scrypt` password hashes and hashed session tokens
- HTTP-only cookies, origin checks, request validation, rate limits, and security headers
- Validated environment configuration and bounded HTTP/MongoDB timeouts
- Request IDs, structured production logs, compressed responses, immutable asset caching, and graceful shutdown
- Client error boundary and browser request timeouts

## MVC Architecture

The application keeps a clear MVC separation:

- **Models:** Mongoose schemas and MongoDB indexes
- **Views:** React feature components
- **Controllers:** Express request and response handlers
- **Services:** authentication, chat orchestration, and OpenRouter business logic
- **Repositories:** MongoDB persistence behind a testable data-access interface
- **Routes and middleware:** endpoint composition, authentication, validation, security, logging, and errors

The API contracts, database name, and existing collection names remain compatible with the previous release. Guest profiles are stored separately in the new `guest_users` collection. Their generated IDs begin with `guest_`, and their sessions, symptom checks, chats, and branches also store `accountType: "guest"`, making user-testing data easy to filter without changing normal accounts. New conversations store the related symptom-check ID. Existing conversations are linked automatically only when their saved symptom query and guidance summary exactly and uniquely match a check; ambiguous or general conversations stay in “Other saved conversations.” Existing data is reused automatically when `MONGODB_URI` still points to the same database.

Guest signup does not require an email address or password. It creates a database-backed profile and signs the tester in with the same hashed, HTTP-only session mechanism used by registered accounts. Signing out removes access from that browser session but does not remove the guest profile, symptom checks, chats, or branches from MongoDB.

Voice typing uses the browser's speech-recognition capability. Browser support and audio processing depend on the browser; recognized text is placed in the input and is not submitted until the user selects Analyze or Send. The selected interface language also selects English or Bangla speech recognition. Language mode is saved in the browser and sent to the server through `Accept-Language` so new analyses, emergency guidance, chat replies, reviewed-source metadata, and API errors use the selected language. Existing user-entered text and previously saved AI content are preserved exactly as originally stored.

Read aloud follows the response text, including saved Bangla replies viewed in English interface mode. It first selects an exact-language device voice (`bn-BD`, then `bn-IN`, then another Bangla voice) and briefly waits for asynchronously loaded voices. If the device exposes no matching voice, the authenticated server generates MP3 audio through OpenRouter's configured text-to-speech model instead of allowing an English voice to read Bangla. This fallback uses the same `OPENROUTER_API_KEY`, consumes OpenRouter credits, and sends only the response that the user explicitly chose to read; MedGuide AI does not save the generated audio. Playback and in-flight generation stop when you select Stop, change chats, leave the page, or change interface language. Microphone permissions affect voice typing, not read-aloud playback.

AI Markdown markers such as `**` are removed at display time, with bullet points, paragraph breaks, quantities, and source URLs preserved. The same clean text is copied and read aloud; saved records and user messages are not rewritten.

## Requirements

- Node.js 20.19 or newer
- npm 10.8 or newer
- MongoDB Community Server for local use, or a MongoDB Atlas connection string
- An OpenRouter API key for symptom analysis, chat, and server-generated read-aloud fallback

Docker is not required. The default local connection is:

```text
mongodb://127.0.0.1:27017/medguide_ai
```

## Configuration

Create `.env` from the included example and add your private OpenRouter key:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/medguide_ai
OPENROUTER_API_KEY=your_openrouter_key
```

Important settings:

| Variable                 | Purpose                                       | Default                               |
| ------------------------ | --------------------------------------------- | ------------------------------------- |
| `MONGODB_URI`            | MongoDB connection string                     | local `medguide_ai` database          |
| `OPENROUTER_API_KEY`     | Enables AI and generated read-aloud fallback  | none                                  |
| `OPENROUTER_MODEL`       | Analysis and chat model                       | `google/gemini-2.5-flash`             |
| `OPENROUTER_TTS_MODEL`   | Read-aloud fallback model                     | `google/gemini-3.1-flash-tts-preview` |
| `OPENROUTER_TTS_VOICE`   | Read-aloud fallback voice                     | `Kore`                                |
| `OPENROUTER_TTS_API_URL` | OpenRouter text-to-speech endpoint            | `/api/v1/audio/speech` on OpenRouter  |
| `HOST`                   | Server bind address                           | `0.0.0.0`                             |
| `PORT`                   | Application port                              | `3000`                                |
| `NODE_ENV`               | `development`, `test`, or `production`        | `development`                         |
| `LOG_LEVEL`              | `debug`, `info`, `warn`, `error`, or `silent` | `info`                                |
| `TRUST_PROXY`            | Trust one reverse proxy hop                   | `false`                               |

The remaining MongoDB pool, HTTP timeout, session, and OpenRouter privacy settings are documented in `.env.example`. Invalid configuration stops startup with a clear error instead of failing later at runtime.

Keep `.env` private. Never place the OpenRouter key in React code or commit it to source control.

## Deploy on Vercel Hobby

This release includes a native Vercel Express entry, a dedicated Vite build that writes static assets to Vercel's `public` directory, platform security headers, automatic proxy detection, and a serverless-safe MongoDB connection lifecycle. The browser still calls the same `/api` routes, and the local workflow is unchanged.

The only required Vercel environment variables are:

```dotenv
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER/medguide_ai?retryWrites=true&w=majority
OPENROUTER_API_KEY=your_openrouter_key
```

Vercel supplies the production mode and deployment URL. The app automatically trusts Vercel's proxy, uses that URL for OpenRouter attribution, and lowers the default MongoDB connection pool to five. Do not add `PORT`, `HOST`, or `TRUST_PROXY` in Vercel unless you intentionally want to override those defaults.

For the complete Atlas setup, import settings, validation steps, and free-tier limitations, follow [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md).

## Run on Linux Mint

From the extracted project directory:

```bash
cp .env.example .env
nano .env
sudo systemctl enable --now mongod
npm install
npm run db:check
npm start
```

Open <http://localhost:3000>.

For later starts:

```bash
sudo systemctl start mongod
npm start
```

## Run on Windows 11

Ensure the installed MongoDB service is running from Administrator PowerShell:

```powershell
Start-Service MongoDB
```

Then open PowerShell in the extracted project directory:

```powershell
Copy-Item .env.example .env
notepad .env
npm install
npm run db:check
npm start
```

Open <http://localhost:3000>.

## Development

Start the React and Express development servers together:

```bash
npm run dev
```

Open <http://localhost:5173>. Vite forwards `/api` requests to Express on port `3000`.

Before committing changes, run the complete quality gate:

```bash
npm run check
```

This checks lint rules, formatting, the production client build, server integration tests, and React tests.

## View Local Database Data

Mongoose reads and writes documents, while the MongoDB service stores the actual database files. Data is not saved inside the project directory.

Display a safe summary that excludes password hashes and session tokens:

```bash
npm run db:view
npm run db:view -- --limit 25
```

Inspect the database directly with MongoDB Shell:

```bash
mongosh "mongodb://127.0.0.1:27017/medguide_ai"
```

```javascript
show collections
db.users.find({}, { passwordHash: 0, passwordSalt: 0 }).pretty()
db.guest_users.find().sort({ createdAt: -1 }).pretty()
db.health_checks.find({ accountType: "guest" }).sort({ createdAt: -1 }).pretty()
db.chat_conversations.find({ accountType: "guest" }, { messages: 0 }).sort({ updatedAt: -1 }).pretty()
db.health_checks.find().sort({ createdAt: -1 }).limit(10).pretty()
db.chat_conversations.find({}, { messages: 0 }).sort({ updatedAt: -1 }).limit(10).pretty()
db.sessions.countDocuments()
```

MongoDB Compass can connect to `mongodb://127.0.0.1:27017`; select `medguide_ai` to browse visually.

| Collection           | Contents                                                                |
| -------------------- | ----------------------------------------------------------------------- |
| `users`              | Accounts, profiles, password hashes, and tour completion state          |
| `guest_users`        | Separate password-free guest profiles and user-testing demographics     |
| `sessions`           | Hashed session tokens and expiry dates                                  |
| `health_checks`      | Symptoms, structured analysis, sources, and report history              |
| `chat_conversations` | Per-user chat messages, linked check IDs, contexts, and branch metadata |

Displayed match percentages are relative symptom-pattern overlap scores for comparison. They are not diagnostic probabilities and must not be interpreted as the chance that a condition is present.

On Linux Mint, MongoDB normally stores database files under `/var/lib/mongodb`. Confirm the active location using `storage.dbPath` in `/etc/mongod.conf`.

## Commands

| Command                                          | Purpose                                            |
| ------------------------------------------------ | -------------------------------------------------- |
| `npm start`                                      | Build React and start the application on port 3000 |
| `npm run start:server`                           | Start Express using an existing client build       |
| `npm run dev`                                    | Start React and Express in development mode        |
| `npm run build`                                  | Create the production React build                  |
| `npm run build:vercel`                           | Create Vercel's CDN-ready `public` build           |
| `npm run lint`                                   | Run ESLint with zero warnings allowed              |
| `npm run format`                                 | Format project source files                        |
| `npm run format:check`                           | Verify formatting without changing files           |
| `npm test`                                       | Build and run all server and client tests          |
| `npm run check`                                  | Run the complete production quality gate           |
| `npm run db:check`                               | Verify the MongoDB connection                      |
| `npm run db:view`                                | Show a safe database summary                       |
| `npm run db:migrate -- --file /path/to/app.json` | Import data from the earlier JSON edition          |

## Project Structure

```text
client/
  src/
    api/                 Browser API client
    components/          Shared UI, product tour, and error boundary
    features/            Auth, symptoms, chat, history, and profile views
    i18n/                Persistent English/Bangla translations and locale state
server/
  src/
    config/              Validated environment, logging, and MongoDB connection
    constants/           Health guardrails and AI response schema
    controllers/         Express controllers
    middleware/          Authentication, security, rate limiting, logging, and errors
    models/              Mongoose schemas and indexes
    repositories/        MongoDB persistence and test repository
    routes/              Express API routes
    services/            Authentication and OpenRouter logic
    utils/               Shared server utilities
    runtime.js            Shared Express and MongoDB runtime factory
  index.js               Production server entry point
app.js                    Vercel Express Function entry point
vercel.json               Vercel build and response-header configuration
scripts/                 Database check, viewing, and migration utilities
test/                    Server integration and unit tests
```

## Other Production Deployment

For an internet-facing deployment:

1. Set `NODE_ENV=production` and store secrets in the host environment.
2. Run behind HTTPS using a trusted reverse proxy; set `TRUST_PROXY=true` only when that proxy is correctly configured.
3. Run `npm run build`, then manage `npm run start:server` with a process supervisor.
4. Enable MongoDB authentication, restrict network access, and maintain tested backups.
5. Monitor `/api/health`, request logs, process restarts, and dependency failures.
6. Complete independent security, privacy, legal, and clinical reviews before using real patient information.
