# Deployment Guide

HelpDesk Pro is a serverless SPA: the **frontend** deploys to GitHub Pages,
and **Firebase** (Authentication, Firestore, Storage) is the backend -
there is no server process or database connection string to stand up.

## 1. Create the Firebase project (one-time)

1. Go to **https://console.firebase.google.com** -> **Add project**.
   Name it anything (e.g. `helpdesk-pro`); Google Analytics is not needed.
2. **Build -> Authentication -> Get started** -> enable the
   **Email/Password** sign-in provider.
3. **Build -> Firestore Database -> Create database** -> start in
   **production mode** (the rules in this repo, not Firestore's default
   deny-all, are what govern access) -> pick any region.
4. **Build -> Storage -> Get started** -> production mode, same region.
5. **Project settings** (gear icon) -> **Your apps** -> click **`</>`**
   (Web) -> register an app (uncheck Firebase Hosting; this repo uses
   GitHub Pages) -> copy the `firebaseConfig` object shown.

This whole project stays on Firebase's free **Spark** plan - nothing here
requires the paid Blaze plan, since the app has no Cloud Functions by
design (see the README's Security Notes for what that trades off).

## 2. Configure the app with your project

```bash
cp apps/web/.env.example apps/web/.env.local
# paste your firebaseConfig values into apps/web/.env.local
```

Also update `.firebaserc` at the repo root with your project ID:

```json
{ "projects": { "default": "your-project-id" } }
```

## 3. Deploy the security rules

The rules in `firebase/firestore.rules` and `firebase/storage.rules` are
the entire access-control layer - the app will not behave correctly (or
safely) against a project that still has Firestore/Storage's own default
rules.

```bash
npx firebase-tools login
npm run firebase:deploy:rules
```

## 4. Seed demo data (optional but recommended)

```bash
# Firebase console -> Project settings -> Service accounts
# -> Generate new private key (downloads a JSON file - keep it local,
#    never commit it)
npm run seed:firebase -- /path/to/serviceAccountKey.json
```

This creates the 4 demo accounts (`admin@helpdesk.local`,
`technician@helpdesk.local`, `manager@helpdesk.local`,
`employee@helpdesk.local`, all password `Passw0rd!123`) plus 18 more
users, 10 assets, 15 knowledge base articles, and 30 tickets.

## 5. Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in with a demo account.

## 6. Deploy the frontend to GitHub Pages

Already automated: `.github/workflows/deploy.yml` runs on every push to
`main`, builds `apps/web` with your Firebase config baked in at build
time, and publishes it to GitHub Pages.

One-time setup in the GitHub repository:

1. **Settings -> Pages** -> set **Source** to **GitHub Actions**.
2. **Settings -> Secrets and variables -> Actions -> Variables** -> add
   6 repository variables with your Firebase config values:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

   These are safe to store as plain (non-secret) repository Variables -
   they identify a Firebase project, not a credential (see the README's
   Security Notes).
3. **Firebase console -> Authentication -> Settings -> Authorized domains**
   -> add `<your-github-username>.github.io` so Firebase Auth accepts
   sign-ins from the deployed site.
4. Push to `main` (or run the workflow manually from the Actions tab).
   The deployed URL appears in the workflow's summary and under
   **Settings -> Pages**.

## 7. Local testing against the Firebase Emulator Suite (optional)

For a fully offline dev loop that never touches your real project data:

```bash
npm run firebase:emulators   # requires Java - see Firebase's docs
```

Then set `VITE_USE_FIREBASE_EMULATORS=true` in `apps/web/.env.local` and
restart `npm run dev`. Auth/Firestore/Storage all run locally; data
persists between runs via `--export-on-exit` into `firebase/emulator-data/`
(gitignored).

## 8. Rolling back / re-deploying

- **Frontend**: re-run the `Deploy Frontend to GitHub Pages` workflow, or
  push a new commit to `main`.
- **Rules**: `npm run firebase:deploy:rules` again after editing
  `firebase/firestore.rules` or `firebase/storage.rules` - changes take
  effect immediately, no rollback mechanism needed beyond re-deploying an
  earlier version from git history.
- **Data**: Firestore has no built-in rollback; use the Firebase console's
  data export/import or write a one-off Admin SDK script for any bulk
  correction.
