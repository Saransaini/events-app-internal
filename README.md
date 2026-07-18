# Tinder for Dogs

A dating app for dog owners — people match with people, with each person's
dog as the centerpiece of their profile. The idea: two dog owners ("dog mom",
dog dad") match, go on a date, and if the romantic spark isn't there, their
dogs can still have a playdate. Built as an Express/Firestore backend (`/`)
plus an Expo/React Native mobile client (`/mobile`).

## Backend (`/`)

Express + Firestore, structured under `src/`:

- `src/routes/events.js` — the original events feature (unchanged, unrelated
  to this app).
- `src/routes/users.js` — profile CRUD (a person's profile always embeds
  their dog), the nearby-people discovery feed, and a public profile lookup
  (`GET /users/:id`) used to show who a match is with.
- `src/routes/swipes.js` — records a like/pass and checks for a match.
- `src/routes/matches.js` — list/get matches for the signed-in user, and
  `DELETE /matches/:id` to unmatch.
- `src/services/matchService.js` — a match is created once both people have
  liked each other (always reciprocal — no asymmetric/listing case, unlike an
  earlier version of this app that matched dogs directly).
- `src/middleware/requireAuth.js` — verifies a Firebase ID token
  (`Authorization: Bearer <token>`) via `firebase-admin`.

Chat deliberately bypasses this API: the mobile client reads/writes
`matches/{matchId}/messages` directly via the Firebase client SDK for
realtime delivery, scoped by `firestore.rules` to the two matched
participants (everything else stays behind the Express API, which uses the
Admin SDK and bypasses rules entirely).

**No chat history is retained anywhere.** Messages live in Firestore only
for as long as a match is active. The moment either person unmatches
(`DELETE /matches/:id`), the backend purges every message in that match's
`messages` subcollection and deletes the match itself — there's no
soft-deleted/"unmatched" status kept around, and no separate log kept
server-side for moderation. That's a deliberate privacy tradeoff: it means a
reported conversation can't be reviewed after the fact, since nothing of it
still exists.

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

Deploy indexes and security rules with:

```bash
npx firebase-tools deploy --only firestore:indexes,firestore:rules
```

### Tests

Backend tests run against the Firestore emulator rather than a real project:

```bash
npm run test:emulator
```

This starts the emulator, runs `npm test` (Mocha/Chai/Supertest) against it,
and tears it down. `test/*.test.js` cover the users/swipes/matches API using
an `x-test-uid` header to bypass real Firebase Auth tokens in `NODE_ENV=test`
(see `src/middleware/requireAuth.js`).

The original `test/test-server.js` (events) has 4 known-failing cases
unrelated to this feature — a pre-existing mock-data assumption in that test
file that predates this work.

## Mobile (`/mobile`)

Expo (managed workflow) + TypeScript, using Expo Router for navigation.

- `app/(auth)` — login/signup
- `app/(onboarding)` — profile creation wizard (dog's basic info → photos →
  what you're looking for → location)
- `app/(tabs)` — Discover (swipe deck of people), Matches, Profile
- `app/match/[id].tsx` — real-time chat with a match (Firestore-backed)
- `src/lib/api.ts` — typed fetch client for the backend, attaches the
  Firebase ID token
- `src/lib/firebase.ts` — Firebase client SDK init (Auth + Storage +
  Firestore)
- `src/lib/chat.ts` — direct Firestore reads/writes for chat messages

### Setup

```bash
cd mobile
npm install
cp .env.example .env   # fill in your Firebase web app config + API base URL
npx expo start
```

Scan the QR code with the **Expo Go** app on a real iOS/Android device, or run
`npx expo start --ios` / `--android` if you have Xcode/Android Studio locally.

**Fastest way to just look at the screens, no phone needed:** run
`npx expo start --web` instead and open the printed `localhost` URL in a
browser. This renders the actual app UI (login, signup, onboarding, etc.),
though a few native-only bits (camera/photo picker, native swipe gestures,
GPS permission prompts) won't behave identically to a real device — treat it
as a UI preview, not the real experience.

### Verification

```bash
npx tsc --noEmit    # typecheck
npx expo-doctor     # config/dependency sanity
```

## Known limitations (v1)

- No push notifications, payments, or a shelter/admin dashboard.
- One dog per person profile (a person must have a dog to use the app; no
  multi-dog households yet).
- "Looking for" (dating / playdate) is descriptive metadata on a profile, not
  a filter — discovery shows all nearby active people regardless of what
  they're open to.
- Discover feed excludes already-swiped people via an in-memory filter rather
  than a Firestore-side query, since Firestore can't do an efficient
  server-side "not in" exclusion at scale — fine for v1, worth revisiting if
  the user count per region grows large.
- Unmatching exists (permanently deletes the match + all messages, see
  above) but there's no block or report flow yet.
