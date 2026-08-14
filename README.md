# MedGuide AI

MedGuide AI is a local-first health guidance web application built with Node.js, Express, MongoDB, Mongoose, and OpenRouter. Users can create accounts, describe symptoms, review several matching health patterns, discuss results with an AI assistant, and retain their check history locally.

> MedGuide AI provides general health information only. It is not a diagnosis, emergency service, or replacement for a qualified medical professional.

## Features

- Account registration, sign-in, sign-out, and profile management
- One-time interactive product tour for each newly registered user
- AI-guided symptom analysis with 3–4 ordered matching patterns
- Clear `strong`, `possible`, and `limited` match labels
- Emergency-language detection and urgent-care warnings
- Follow-up conversation with the AI health assistant
- MongoDB-backed users, sessions, profiles, and check history
- Salted `scrypt` password hashes and hashed session tokens
- HTTP-only session cookies, request validation, rate limits, and security headers

## Technology

| Area | Technology |
|---|---|
| Front end | HTML, CSS, native JavaScript |
| Back end | Node.js, Express 5, ECMAScript modules |
| Database | MongoDB, Mongoose |
| AI provider | OpenRouter |
| Tests | Node.js test runner |

The server follows an MVC-style structure with separate routes, controllers, services, models, and repositories. The browser never receives the OpenRouter API key.

## Requirements

- [Node.js](https://nodejs.org/en/download) 24 LTS recommended; version 20.19 or newer is required
- MongoDB Community Server running locally
  - [Linux installation](https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-ubuntu/)
  - [Windows installation](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-windows/)
- An [OpenRouter API key](https://openrouter.ai/keys)

The default local database connection is:

```text
mongodb://127.0.0.1:27017/medguide_ai
```

## Configuration

Create `.env` from the included example and set at least the OpenRouter key:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/medguide_ai
OPENROUTER_API_KEY=your_openrouter_key
```

Important variables:

| Variable | Purpose | Default |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/medguide_ai` |
| `OPENROUTER_API_KEY` | Enables symptom analysis and AI chat | none |
| `OPENROUTER_MODEL` | OpenRouter model identifier | `google/gemini-2.5-flash` |
| `PORT` | Application port | `3000` |
| `HOST` | Application bind address | `0.0.0.0` |
| `NODE_ENV` | Runtime environment | `development` |

Keep `.env` private. Never place the API key in `public/index.html` or `public/app.js`.

## Run on Linux Mint

Open a terminal in the extracted project directory:

```bash
cd "/path/to/ai-health-checker"
cp .env.example .env
nano .env
sudo systemctl start mongod
npm install
npm run db:check
npm start
```

Open <http://localhost:3000>.

After the first setup, normal startup only requires MongoDB to be running and `npm start` from the project directory.

## Run on Windows 11

Install MongoDB Community Server as a Windows service. If the service is stopped, start it from an Administrator PowerShell window:

```powershell
Start-Service MongoDB
```

Then open PowerShell in the extracted project directory:

```powershell
cd "C:\path\to\ai-health-checker"
Copy-Item .env.example .env
notepad .env
npm install
npm run db:check
npm start
```

Open <http://localhost:3000>.

After the first setup, normal startup only requires the MongoDB service and `npm start` from the project directory.

## View Local Database Data

Display a read-only summary of users, session counts, and recent health checks:

```bash
npm run db:view
npm run db:view -- --limit 25
```

The command excludes password hashes and session tokens.

For direct access with MongoDB Shell:

```bash
mongosh mongodb://127.0.0.1:27017/medguide_ai
```

Useful shell commands:

```javascript
show collections
db.users.find({}, { passwordHash: 0, passwordSalt: 0 }).pretty()
db.health_checks.find().sort({ createdAt: -1 }).limit(10).pretty()
db.users.countDocuments()
db.health_checks.countDocuments()
```

The application uses these collections:

| Collection | Contents |
|---|---|
| `users` | Accounts, profiles, password hashes, and tour state |
| `sessions` | Hashed session tokens and expiry dates |
| `health_checks` | Symptoms, structured analysis, and check history |

## Commands

| Command | Purpose |
|---|---|
| `npm start` | Start the application |
| `npm run dev` | Start with automatic restart on source changes |
| `npm test` | Run the automated test suite |
| `npm run db:check` | Verify the MongoDB connection |
| `npm run db:view` | View a safe, read-only database summary |
| `npm run db:migrate -- --file /path/to/app.json` | Import data from the earlier JSON edition |

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Service and dependency status |
| `POST` | `/api/register` | Create an account |
| `POST` | `/api/login` | Sign in |
| `POST` | `/api/logout` | Sign out |
| `GET` | `/api/me` | Get the signed-in user |
| `PUT` | `/api/profile` | Update the user profile |
| `PATCH` | `/api/onboarding` | Complete the product tour |
| `POST` | `/api/analyze` | Analyze reported symptoms |
| `POST` | `/api/chat` | Continue with the AI assistant |
| `GET` | `/api/checks` | List saved checks |
| `DELETE` | `/api/checks/:checkId` | Delete an owned check |

All routes except health, registration, and login require an authenticated session.

## Project Structure

```text
public/                  Browser interface
scripts/                 Database checks, viewing, and migration
src/
  config/                Environment and MongoDB configuration
  constants/             Health guardrails and AI response schema
  controllers/           Request handlers
  middleware/            Authentication, validation, and security
  models/                Mongoose schemas and indexes
  repositories/          Database access and test repository
  routes/                API routes
  services/              Authentication and OpenRouter logic
  utils/                 Shared utilities
test/                    Automated tests
server.mjs               Application entry point
```

## Deployment Note

This repository is intended as a local development MVP. Before using it with real patient information or exposing it publicly, complete independent security, privacy, legal, and clinical reviews and add appropriate production controls.
