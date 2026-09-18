# Deploy MedGuide AI on Vercel Hobby

This project is configured for Vercel's free Hobby plan and keeps its existing React, Express, MongoDB, authentication, AI, chat, history, localization, and speech behavior. Its layout follows [Vercel's native Express deployment model](https://vercel.com/docs/frameworks/backend/express).

Vercel hosts the Vite files from `public/` on its CDN and runs `app.js` as the Express Function. MongoDB stores all durable data; the Function filesystem is not used for application data.

## 1. Create a free MongoDB Atlas database

1. Create an [Atlas Free cluster (formerly M0)](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/).
2. Create a database user with a strong, unique password and only the permissions this app needs.
3. Configure the [Atlas IP access list](https://www.mongodb.com/docs/atlas/security/ip-access-list/) so your Vercel deployment can connect. Hobby deployments do not provide a fixed outbound IP by default, so a personal project may need Atlas's `0.0.0.0/0` access-list entry. If you use it, the database username and password are the security boundary: keep them unique and private.
4. Copy the Atlas Node.js connection string and include the database name `medguide_ai`:

   ```text
   mongodb+srv://USERNAME:PASSWORD@CLUSTER/medguide_ai?retryWrites=true&w=majority
   ```

Percent-encode special characters in the username or password. Do not put the connection string in this repository.

## 2. Import the project into Vercel

1. Put the project in a private Git repository. Do not commit `.env`, `node_modules/`, `client/dist/`, or `public/`; they are already ignored.
2. In Vercel, select **Add New → Project** and import the repository.
3. Keep the project root at the repository root—the directory containing `package.json`, `app.js`, and `vercel.json`.
4. Leave the build and install commands unchanged. `vercel.json` selects `npm ci` and `npm run build:vercel`.

You can also deploy with the Vercel CLI from the project root. The dashboard import is easier for the first deployment because it prompts for environment variables.

## 3. Add environment variables

Add these in **Project Settings → Environment Variables** for Production (and Preview only if you want previews to use the same services):

| Variable                | Required | Value                                             |
| ----------------------- | -------- | ------------------------------------------------- |
| `MONGODB_URI`           | Yes      | Atlas connection string containing `/medguide_ai` |
| `OPENROUTER_API_KEY`    | Yes*     | Private OpenRouter key                            |
| `LOG_LEVEL`             | No       | `info` by default; use `warn` to reduce logs      |
| `OPENROUTER_MODEL`      | No       | Defaults to `google/gemini-2.5-flash`             |
| `OPENROUTER_TTS_MODEL`  | No       | Defaults to `google/gemini-3.1-flash-tts-preview` |
| `MONGODB_MAX_POOL_SIZE` | No       | Defaults to `5` on Vercel                         |

\*The site can start without an OpenRouter key, but symptom analysis, assistant replies, and server-generated speech are unavailable.

Vercel already provides `NODE_ENV`, `VERCEL`, and the deployment hostname. This code uses them to select secure cookies, trust the platform proxy, locate the CDN build, and set the OpenRouter application URL. No `PORT`, `HOST`, `TRUST_PROXY`, or `OPENROUTER_APP_URL` setting is needed.

## 4. Deploy and verify

Select **Deploy**, then check:

1. Open `https://YOUR-PROJECT.vercel.app/api/health`. It should report a connected database.
2. Open the site, create a guest or registered account, and complete one symptom check.
3. Reload the page and confirm the session and saved check remain available.
4. Test assistant chat and read aloud if the OpenRouter key and account credits support those routes.

If `/api/health` reports a database failure, check the Atlas access list, database credentials, database name, and Vercel Function logs. If the build fails before deployment, run `npm ci && npm run check && npm run build:vercel` locally with a supported Node.js version.

## Free-tier behavior

- Vercel Functions are stateless, but the MongoDB connection and application runtime are cached for the lifetime of each warm Function instance. All user data remains in Atlas.
- A request after an idle period can have a cold-start delay while the Function reconnects to Atlas.
- Rate limiting is intentionally process-local. That is reasonable for a small personal deployment, but it is not a distributed abuse-control system.
- Generated speech is capped below Vercel's Function response-body limit. Very large audio responses return the existing “try a shorter response” error.
- Vercel Hobby and Atlas M0 can host the app without a hosting charge within their current allowances. OpenRouter model and speech usage can still consume credits and is not controlled by Vercel.
- This remains an informational personal project, not a diagnosis service or an appropriate place for real patient data without independent clinical, privacy, security, and legal review.

## Local development remains unchanged

Use a local MongoDB instance and `.env` as before:

```bash
npm ci
npm run dev
```

For the local production-style server:

```bash
npm start
```
