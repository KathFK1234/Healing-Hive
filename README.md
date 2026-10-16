# Healing Hive

An inclusive mental health support platform for Kenyan youth, offering therapy, peer counselling, AI guidance and educational resources to promote mental wellness, awareness and healing.

**Tagline:** _"St;ll Here"_, inspired by the semicolon movement: your story isn't over yet.

This is the second version of the [MindConnect](https://github.com/derick-macharia/mindconnect-platform) platform, rebuilt from the skeleton the original team put together.

## What's in it

| For | Features |
| --- | --- |
| People looking for support | Directory of verified therapists and peer counsellors, booking, video sessions, ratings, daily mood check-ins, private journal, AI companion, nuggets, reminders, events |
| Therapists and peer counsellors | Their own sign-up and verification, public profile, weekly hours, Google Calendar and Meet, accepting requests, private session notes, writing nuggets, hosting events |
| Institutions | Their own sign-up, inviting verified professionals, a dashboard of sessions, ratings and value per team member |
| Admins | Reviewing applications, reviewing and publishing nuggets, finding anyone who has signed up, platform numbers |

A **Get help now** button with Kenyan crisis lines is on every page.

## Getting started

You need Node.js 22 (22.13 or later). Nothing else: no database to install, no settings to fill in. `package.json` asks for Node 22 so that Railway runs the version CI tests; a newer Node works locally, though npm may warn.

```bash
npm install
npm run dev
```

`npm run dev` starts three things together and prints the web address to open (usually http://localhost:5173):

- a local database that keeps its data in `server/.data` between runs
- the API, on port 7002
- the web app

The first run creates `server/.env` for you and fills the database with starter nuggets, events and sample accounts, so every page has something in it:

| Sign in as | Email | Password |
| --- | --- | --- |
| Someone looking for support | `client@healinghive.local` | `healing-hive-demo` |
| A therapist | `therapist@healinghive.local` | `healing-hive-demo` |
| An institution | `institution@healinghive.local` | `healing-hive-demo` |
| The admin | `admin@healinghive.local` | in `server/.env` (`ADMIN_PASSWORD`) |

To start again from a clean database, stop `npm run dev` and delete the `server/.data` folder.

Other commands, all from the repo root:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the API tests against an in-memory MongoDB |
| `npm run lint` | Lints the web app |
| `npm run build` | Builds the web app into `client/dist` |
| `npm run seed` | Adds starter nuggets and the admin account to whatever database `server/.env` points at |

### Switching features on

Everything below is optional locally. Each setting is explained in [`server/.env.example`](server/.env.example); the server checks them at startup and tells you which one is wrong. **Never commit `.env`** (it is in `.gitignore`).

| Feature | What to set in `server/.env` | Without it |
| --- | --- | --- |
| AI companion (Claude) | `ANTHROPIC_API_KEY`, from [console.anthropic.com](https://console.anthropic.com) | The chat page says it is switched off. Crisis messages still get help contacts. |
| Real emails | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. For Gmail use `smtp.gmail.com` and an [app password](https://myaccount.google.com/apppasswords). | Emails, including password reset links, are printed in the terminal running `npm run dev`. |
| Google Calendar and Meet | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (steps in `.env.example`) | Each confirmed session gets the professional's own meeting link, or a private Jitsi room. |
| A hosted database | `MONGO_URI` pointing at MongoDB Atlas | The local database is used. |

### Do I need to deploy it?

Not to build and test: everything above runs on your own machine, including Google sign-in (Google allows `localhost` redirect addresses). You need a deployed copy when other people have to reach it: real users, a professional connecting their calendar from their own device, or Safaricom's M-Pesa servers calling back with payment results.

### How it is deployed

The web app and the API are hosted separately:

- **Web app: GitHub Pages**, at `https://<owner>.github.io/Healing-Hive/`. `.github/workflows/pages.yml` runs the tests and lint on every push to `main`, then builds `client/` with `BASE_PATH=/Healing-Hive/` and publishes it. Pages has no rewrite rules, so the workflow copies `index.html` to `404.html` and links such as `/therapists/123` still open the app.
- **API: Railway**, from this repository. `railway.json` starts only the API (`npm start -w server`), checks `/api/v1/health`, and runs `npm run seed -w server` before each deploy (starter nuggets and the admin account; it skips anything already there).

Setting it up once:

1. **Database.** Create a MongoDB database: MongoDB Atlas (copy its connection string), or Railway's MongoDB in the same project (+ New > Database > MongoDB).
2. **Railway.** New project > Deploy from GitHub repo > `Healing-Hive`. Leave Settings > Source > **Root Directory empty**: `railway.json`, the lockfile and the `-w server` commands all work from the repository root, and the build already skips the web app. Under Settings > Networking, generate a domain. Under Variables, set:
   `NODE_ENV=production`, `MONGO_URI` (Atlas's string, or `${{MongoDB.MONGO_URL}}` with Railway's MongoDB, where `MongoDB` is that service's name), `JWT_SECRET` (at least 32 characters; 48 random bytes, see `.env.example`), `CLIENT_ORIGIN=https://<owner>.github.io`, `CLIENT_URL=https://<owner>.github.io/Healing-Hive`, `API_URL=https://<your Railway domain>`, `MONGOMS_DISABLE_POSTINSTALL=1` (skips downloading the test database), and optionally the SMTP settings (without them no email is sent), `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` (remove the password once the admin exists). Railway sets `PORT` itself.
3. **GitHub.** Settings > Pages > Source: GitHub Actions. Settings > Secrets and variables > Actions > Variables: add `VITE_API_URL=https://<your Railway domain>`. Re-run the workflow (Actions > Test and deploy to GitHub Pages > Run workflow).
4. If Google Calendar is used, add `https://<your Railway domain>/api/v1/google/callback` as an authorised redirect URI in Google Cloud.
5. **Check.** `https://<your Railway domain>/api/v1/health` answers `{"status":"ok"}`. If it answers 502 "Application failed to respond", the API stopped at start: the deployment's Deploy Logs name the missing or invalid setting ("Invalid environment configuration") or say "Could not connect to the database".

## How it's organised

```text
server/                  Express + MongoDB API, served under /api/v1
  src/
    config/              settings (validated) and database connection
    middleware/          sign-in check, role check, input validation, error handling
    modules/             one folder per feature: its model, routes and logic together
      auth/ users/ professionals/ sessions/ reviews/ institutions/
      google/ moods/ journal/ reminders/ nuggets/ events/ ai/ admin/
    utils/               shared helpers: crisis contacts, outgoing email
  scripts/               local dev database, starter content and sample accounts
  test/                  API tests

client/                  React + Vite + Tailwind web app
  src/
    pages/               one file per page, loaded on first visit
    components/ui/       shared building blocks (Button, Card, Modal, form fields ...)
    components/layout/   public layout, signed-in layout, route guards
    context/             who is signed in
    lib/                 API client, date and money formatting, option lists
```

To add a feature: create a folder in `server/src/modules/`, mount its routes in `server/src/routes.js`, then add a page in `client/src/pages/` and a route in `client/src/App.jsx`.

### Rules the code relies on

- **Input is validated before it reaches a controller.** Routes declare a schema, and only fields in the schema get through. This is what stops someone setting their own `role`, or the owner of a record, from the request body.
- **Roles change in one place.** Everyone starts with the role `user`, including professionals who have applied. An account becomes `therapist`, `peer` or `institution` only when an admin approves its application.
- **Each kind of account has its own home and menu** (`client/src/lib/roles.js`): people looking for support, applicants, practising professionals, institutions and admins.
- **Personal data is scoped to its owner in the query.** Journal entries, mood check-ins, reminders and AI conversations have no route for anyone else, admins included. Institutions see counts for their team, never client names or notes. Reviews are public without names.
- **The database prevents double-booking**, with a unique index on a professional's time slot, so two people booking at the same instant cannot both succeed.
- **Times are East Africa Time** (UTC+3, no daylight saving) for working hours, slots and reminders.
- **Colours come from design tokens** in `client/src/index.css`, with light and dark values. Use the Tailwind names (`bg-primary`, `text-muted-foreground`, `bg-honey-soft`), not hex values.

## Not built yet

- **Payments (M-Pesa and card).** Sessions record a price and a payment status, but nothing is charged. Needs Safaricom Daraja credentials and a deployed address for callbacks.
- **Reminder delivery by SMS or email.** Reminders are saved and shown in the app. Sending them needs Africa's Talking credentials and a scheduled job.
- **A built-in call room.** Sessions happen on Google Meet, the professional's own link, or Jitsi. Note that Jitsi's free service asks whoever opens a room first to sign in with a Google or GitHub account.
- **Changing your email address**, and confirming an email address at sign-up.

## Before going live

- **Verify every crisis number** in `server/src/utils/crisis.js` and `client/src/lib/crisis.js` (the two lists must match), and re-check them regularly.
- Google Calendar uses "sensitive" permissions. While the Google Cloud project is in testing, only the test users you list can connect; opening it to all professionals needs Google's verification.
- Have a qualified clinician review the AI companion's instructions in `server/src/modules/ai/ai.service.js` and the crisis wording.
- After `npm run seed` has created the admin account, sign in, change its password from Settings, and remove `ADMIN_PASSWORD` from the host's settings. It is only read by the seed.
- Generate a fresh `JWT_SECRET` for production, and set `NODE_ENV=production`, `CLIENT_ORIGIN` and `CLIENT_URL` to the real web address (see "How it is deployed").
- Do not run `npm run seed -- --demo` against the production database: the sample accounts share a public password and would appear in the directory. (It refuses unless the database is on your own machine, and when `NODE_ENV=production`.)

## Contributors

Healing Hive builds on MindConnect, created by Derick Macharia, Katheu Kilonzo, George Kahuria and Julius Mwakachi.
