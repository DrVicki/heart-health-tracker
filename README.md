# Heart Rhythm — Heart Healthy Daily Tracker

A daily tracker for blood pressure, weight, activity, nutrition, medications,
sleep, stress, and symptoms, with 30-day trend charts. Backed by Supabase
(Postgres + Auth) so each person's data is private to their own account.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier is fine).
2. Once it's provisioned, open **SQL Editor** → New query, paste the contents
   of `supabase/schema.sql`, and run it. This creates the `entries` and
   `profiles` tables with row-level security so users can only read/write
   their own rows.
3. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public API key

By default Supabase requires email confirmation for new sign-ups. For local
testing you can turn this off under **Authentication → Providers → Email →
Confirm email** (toggle off), or just confirm via the email that gets sent.

## 2. Configure the app

```bash
cp .env.example .env
```

Edit `.env` and paste in your Project URL and anon key:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 3. Install and run locally

```bash
npm install
npm run dev
```

Open the printed localhost URL, sign up with an email + password, and start
logging entries.

## 4. Deploy

**Vercel**
1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com) → New Project → import the repo.
3. Framework preset: Vite (auto-detected).
4. Add the two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) under
   Project Settings → Environment Variables.
5. Deploy.

**Netlify** works the same way — build command `npm run build`, publish
directory `dist`, same two env vars.

## Project structure

```
heart-tracker/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── supabase/
│   └── schema.sql          # run this once in the Supabase SQL editor
└── src/
    ├── main.jsx
    ├── App.jsx              # auth session routing
    ├── supabaseClient.js
    ├── lib/
    │   └── data.js          # all Supabase queries (entries + profile)
    └── components/
        ├── Auth.jsx         # sign in / sign up screen
        └── HeartHealthyTracker.jsx   # the tracker UI itself
```

## Data model

- `entries`: one row per `(user_id, date)`, with the full day's metrics in a
  single `data` jsonb column — blood pressure, weight, steps, nutrition,
  medication adherence, sleep, stress/mood, and symptoms.
- `profiles`: one row per user — height and a custom medication list.

Row-level security policies (in `schema.sql`) restrict every row so a user
can only ever select, insert, update, or delete rows where `user_id` matches
their own authenticated `auth.uid()`.

## Notes

- This is a personal tracking tool, not a medical device. The in-app BP and
  symptom callouts are general awareness nudges, not diagnostic guidance.
- No name or other identifying fields are collected beyond the login email
  Supabase Auth requires.
- Supabase's free tier is not HIPAA-compliant out of the box — if this will
  ever hold real patients' data beyond personal use, look into Supabase's
  paid HIPAA add-on or an equivalent compliant backend.
