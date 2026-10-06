# Healing Hive

An inclusive mental health support platform for Kenyan youth, offering therapy, peer counselling, AI guidance and educational resources to promote mental wellness, awareness and healing.

**Tagline:** _"St;ll Here"_, inspired by the semicolon movement: your story isn't over yet.

This is the second version of the [MindConnect](https://github.com/KathFK1234/mindconnect) platform, rebuilt from the skeleton the original team put together.

## What's in it

| For | Features |
| --- | --- |
| People looking for support | Directory of verified therapists and peer counsellors, session booking, daily mood check-ins, private journal, AI companion, nuggets, reminders, events |
| Therapists and peer counsellors | Application and verification, public profile, weekly hours, accepting requests, private session notes, writing nuggets, hosting events |
| Admins | Reviewing applications, reviewing and publishing nuggets, platform numbers |

A **Get help now** button with Kenyan crisis lines is on every page.

## Getting started

You need Node.js 20 or newer and a MongoDB database (local, or a free MongoDB Atlas cluster).

```bash
# 1. Install everything (run from the repo root)
npm install

# 2. Configure the server
cp server/.env.example server/.env
#    then open server/.env and fill in MONGO_URI and JWT_SECRET

# 3. Add starter nuggets and your admin account
#    (set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env first)
npm run seed
#    for local development you can also add sample professionals:
npm run seed -- --demo

# 4. Start the API and the web app, in two terminals
npm run dev:server     # http://localhost:7002
npm run dev:client     # http://localhost:5173
```

Other commands, all from the repo root:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the API tests against an in-memory MongoDB. No setup needed. |
| `npm run lint` | Lints the web app |
| `npm run build` | Builds the web app into `client/dist` |

### Settings

Every server setting is listed in [`server/.env.example`](server/.env.example) and checked at startup; the server refuses to start with a missing or weak value and tells you which.

- **Never commit `.env`.** It is in `.gitignore`.
- **AI companion:** leave `OPENAI_API_KEY` empty to run without it. The chat page then says it is switched off, and still answers crisis messages with help contacts. `AI_BASE_URL` and `AI_MODEL` let you point it at any OpenAI-compatible provider.
- **Web app:** `client/.env.example` has one setting, `VITE_API_URL`, only needed when the API is hosted on a different address from the web app.

## How it's organised

```text
server/                  Express + MongoDB API, served under /api/v1
  src/
    config/              settings (validated) and database connection
    middleware/          sign-in check, role check, input validation, error handling
    modules/             one folder per feature: its model, routes and logic together
      auth/ users/ professionals/ sessions/ moods/ journal/
      reminders/ nuggets/ events/ ai/ admin/
    utils/               shared helpers, including crisis contacts
  scripts/seed.js        starter content and the first admin
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
- **Roles change in one place.** Everyone signs up as `user`. An account becomes `therapist` or `peer` only when an admin approves its application.
- **Personal data is scoped to its owner in the query.** Journal entries, mood check-ins, reminders and AI conversations have no route for anyone else, admins included.
- **The database prevents double-booking**, with a unique index on a professional's time slot, so two people booking at the same instant cannot both succeed.
- **Times are East Africa Time** (UTC+3, no daylight saving) for working hours, slots and reminders.
- **Colours come from design tokens** in `client/src/index.css`, with light and dark values. Use the Tailwind names (`bg-primary`, `text-muted-foreground`, `bg-honey-soft`), not hex values.

## Not built yet

- **Payments (M-Pesa and card).** Sessions record a price and a payment status, but nothing is charged. Needs Safaricom Daraja credentials.
- **Reminder delivery by SMS or email.** Reminders are saved and shown in the app. Sending them needs Africa's Talking credentials and a scheduled job.
- **Video and voice calls.** A session records how the two people want to meet, but there is no built-in call room.
- **Institution dashboards.** Institutions can apply; their tools are not built.
- **Password reset by email**, which needs an email provider.
- **Ratings and reviews** of professionals.

## Before going live

- **Verify every crisis number** in `server/src/utils/crisis.js` and `client/src/lib/crisis.js` (the two lists must match), and re-check them regularly.
- Have a qualified clinician review the AI companion's instructions in `server/src/modules/ai/ai.service.js` and the crisis wording.
- Generate a fresh `JWT_SECRET` for production, and set `NODE_ENV=production` and `CLIENT_ORIGIN` to the real web address.
- Do not run `npm run seed -- --demo` against the production database: the sample professionals would appear in the public directory.

## Contributors

Healing Hive builds on MindConnect, created by Derick Macharia, Katheu Kilonzo, George Kahuria and Julius Mwakachi.
