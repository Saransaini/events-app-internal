# Tinder for Dogs

A dog-matching app supporting three intents — **playdates**, **breeding**, and
**adoption** — built as an Express/Firestore backend (`/`) plus an Expo/React
Native mobile client (`/mobile`).

## Backend (`/`)

Express + Firestore, structured under `src/`:

- `src/routes/events.js` — the original events feature (unchanged).
- `src/routes/users.js`, `dogs.js`, `swipes.js`, `matches.js` — the dog-matching API.
- `src/services/matchService.js` — match-creation logic. Playdate/breeding
  require a reciprocal like from both dogs; adoption creates a match
  immediately on a single like, since a shelter listing can't swipe back.
- `src/middleware/requireAuth.js` — verifies a Firebase ID token
  (`Authorization: Bearer <token>`) via `firebase-admin`.

### Setup

```bash
npm install
```

Requires a Firebase project with **Firestore**, **Authentication**
(email/password provider), and **Storage** enabled. Set `GOOGLE_CLOUD_PROJECT`
to your project ID before running against real Firestore:

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
npm start   # listens on PORT (default 8082)
```

Deploy composite indexes (needed for the discover/matches queries) with:

```bash
npx firebase-tools deploy --only firestore:indexes
```

### Tests

Backend tests run against the Firestore emulator rather than a real project:

```bash
npm run test:emulator
```

This starts the emulator, runs `npm test` (Mocha/Chai/Supertest) against it,
and tears it down. `test/*.test.js` cover the dogs/swipes/matches/users API
using an `x-test-uid` header to bypass real Firebase Auth tokens in
`NODE_ENV=test` (see `src/middleware/requireAuth.js`).

The original `test/test-server.js` (events) has 4 known-failing cases
unrelated to this feature — a pre-existing mock-data assumption in that test
file that predates this work.

## Mobile (`/mobile`)

Expo (managed workflow) + TypeScript, using Expo Router for navigation.

- `app/(auth)` — login/signup
- `app/(onboarding)` — dog profile creation wizard (basic info → photos → intents → location)
- `app/(tabs)` — Discover (swipe deck), Matches, Profile
- `app/match/[id].tsx` — match placeholder screen (no chat yet)
- `src/lib/api.ts` — typed fetch client for the backend, attaches the Firebase ID token
- `src/lib/firebase.ts` — Firebase client SDK init (Auth + Storage)

### Setup

```bash
cd mobile
npm install
cp .env.example .env   # fill in your Firebase web app config + API base URL
npx expo start
```

Scan the QR code with the **Expo Go** app on a real iOS/Android device, or run
`npx expo start --ios` / `--android` if you have Xcode/Android Studio locally.

### Verification

```bash
npx tsc --noEmit    # typecheck
npx expo-doctor     # config/dependency sanity
```

## Known limitations (v1)

- No in-app chat — matches show a placeholder screen.
- No push notifications, payments, or shelter/admin dashboard.
- Single dog profile per owner assumed by the mobile UI (backend supports
  multiple dogs per owner via `GET /dogs/mine`).
- Discover feed excludes already-swiped dogs via an in-memory filter rather
  than a Firestore-side query, since Firestore can't do an efficient
  server-side "not in" exclusion at scale — fine for v1, worth revisiting if
  the dog count per region grows large.
