# Wagmate

A dating app for dog owners — people match with people, with each person's
dog as the centerpiece of their profile. The idea: two dog owners ("dog mom",
"dog dad") match, go on a date, and if the romantic spark isn't there, their
dogs can still have a playdate.

## Architecture

The app is an Expo/React Native client (`/mobile`) that talks to Firebase
directly — Auth for sign-in, Firestore for everything else. There is no
server in the request path, which is what lets it be published as a static
site (see [Deployment](#deployment)).

It did not start that way: profiles, discovery, swipes and matches used to go
through the Express API in `/src`, which held a privileged Admin SDK
connection. Moving those calls into the client (`mobile/src/lib/api.ts`,
which kept its old name and shape so the hooks above it were untouched) moved
every access check into `firestore.rules`.

### Why profiles are stored twice

Firestore rules grant access per *document* and cannot hide individual
fields. The Express API used to strip `email` and exact coordinates out of
anyone else's profile before returning it; a client reading those documents
directly would get the unredacted version, handing every nearby user's home
coordinates and email to anyone who asked. So a profile is split:

- `users/{uid}` — private. Email, exact `GeoPoint`. Readable only by its owner.
- `publicProfiles/{uid}` — what other people see. Name, dog, intents, and a
  location rounded to ~1km. No email; the rules reject the field outright.

Distances in the discover feed are computed from the coarse location, which is
precise enough for "3 km away" and far too coarse to locate a home.

### How a match is created without a trusted server

A client must not be able to fabricate a match with someone who never liked
it back, but it also should not be able to read other people's swipes to
learn who liked them. Both hold at once because **rules can read documents
the client itself cannot**:

- Swipes are readable only by the person who made them.
- Creating `matches/{matchId}` is permitted only if the rules' own lookup
  finds a `like` in *both* directions.

So the client optimistically attempts to create the match after every like,
and a `permission-denied` is simply the normal "not mutual yet" answer.

`test/rules.test.js` covers this against the Firestore emulator — 37 cases,
each protection paired with a test proving it denies.

**No chat history is retained anywhere.** Messages live in Firestore only for
as long as a match is active. The moment either person unmatches, every
message in that match is deleted along with the match itself — no
soft-deleted status, no moderation log. That's a deliberate privacy tradeoff:
a reported conversation can't be reviewed after the fact, because nothing of
it still exists. (Messages are deleted before the match document, since the
rule authorising a message delete reads its parent match to check
participation.)

## Backend (`/src`) — no longer used by the app

Express + Firestore. The mobile app no longer calls any of it; it is kept
because `src/routes/events.js` is the repository's original, unrelated events
feature. The dating routes (`users`, `swipes`, `matches`) are now dead code
superseded by the client-side data layer, and are left in place rather than
deleted so the earlier design stays legible in history.

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

Everything runs against the Firestore emulator rather than a real project.

**Security rules** — the important suite, since the rules are now the only
thing protecting user data:

```bash
npm run test:rules
```

37 cases in `test/rules.test.js`, each protection paired with a test proving
it denies: no reading another user's private profile, no "who liked me" leak,
no fabricating a match without a genuine mutual like, no forging a message as
someone else, no outsider reading a conversation.

**Backend** (the now-unused Express routes):

```bash
npm run test:emulator
```

Starts the emulator, runs `npm test` (Mocha/Chai/Supertest) against it, and
tears it down. These use an `x-test-uid` header to bypass real Firebase Auth
tokens in `NODE_ENV=test` (see `src/middleware/requireAuth.js`).

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
- `src/hooks/useGoogleSignIn.ts` — Google sign-in: on web via Firebase's own
  `signInWithRedirect`/`getRedirectResult`; on native via `expo-auth-session`
  (works in Expo Go, no custom native build needed), exchanging the Google ID
  token for a Firebase credential via `signInWithCredential`

### Setup

```bash
cd mobile
npm install
cp .env.example .env   # fill in your Firebase web app config + API base URL
npx expo start
```

### Google sign-in setup (optional)

Email/password works with no extra setup. The "Continue with Google" button
always shows on web — it goes through Firebase's own `signInWithRedirect`
handler, which needs no Google Cloud OAuth client at all, just:

1. In **Firebase Console → Authentication → Sign-in method**, enable the
   **Google** provider.
2. In **Firebase Console → Authentication → Settings → Authorized domains**,
   add whatever domain the web build is served from (e.g.
   `saransaini.github.io`, and `localhost` for local dev — `localhost` is
   included by default).

Native (iOS/Android) is separate and still needs its own OAuth client IDs
from [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
since there's no Firebase-hosted redirect handler on those platforms:

1. Create (or pick) a project, then **Create Credentials → OAuth client ID**.
2. You need one client ID **per native platform you'll test**:
   - **iOS** — bundle ID must match `mobile/app.json`'s `ios.bundleIdentifier`
     (`com.wagmate.app`, or whatever you change it to).
   - **Android** — package name must match `mobile/app.json`'s
     `android.package`, plus your app's SHA-1 signing certificate fingerprint
     (`eas credentials` can show this for an EAS-built app).
3. Put the client ID(s) you created in `mobile/.env`:
   ```
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
   ```
   Leave either blank if you're not testing that platform.

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

## Deployment

`.github/workflows/deploy-wagmate.yml` exports the app as a static site and
publishes it to GitHub Pages on every push. Because the app talks to Firebase
directly, that static bundle is the entire deployment — there is nothing else
to host.

Enable it once, in **Settings → Pages → Source → GitHub Actions**. The site
then appears at `https://<user>.github.io/<repo>/`.

Three details make a subpath deployment work, all handled by the workflow:

- `experiments.baseUrl` (set in `mobile/app.config.js` from an env var, so it
  applies only to this build and not to local dev) prefixes asset URLs with
  the repo name. Without it the page loads blank.
- `.nojekyll`, because Pages otherwise runs Jekyll, which silently drops
  Expo's `_expo/` bundle directory.
- `404.html` as a copy of `index.html`, because the export is a single-page
  app and Pages has no rewrite rule, so deep links like `/discover` would
  otherwise 404 before the router ever loads.

**Sign-in needs the deployed origin allow-listed** or Google login fails on
the live site: add it under Firebase Console → Authentication → Settings →
**Authorized domains**, and as an authorized JavaScript origin on the OAuth
client in Google Cloud Console.

### Running it as a real phone app instead

The web build is a convenience, not the ceiling. `npx expo start` plus the
Expo Go app gives the real native experience (native swipe gestures, camera
capture); a standalone build via EAS needs an Apple Developer account for
iOS.

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
- Only Google sign-in is supported alongside email/password — no Apple or
  Facebook login yet (Apple's App Store rules require an alternative to
  social login if you ever remove email/password, which this app doesn't).
- **Dog photo uploads need Firebase Storage**, which now requires the paid
  Blaze plan on new projects. On the free Spark plan everything else works
  and photo upload fails; profiles simply have no photos.
- The discover scan reads up to 200 active profiles and filters by distance
  client-side rather than issuing a real geo query. Fine at v1 scale, wrong
  well before serious growth — the geohash helper in `src/lib/geohash.js` was
  written for the bounded-range query this should become.
- The coarsened location in a public profile is rounded by the client, and
  the rules do not re-check the rounding (float comparison in rules is not
  reliable enough to be worth it). Publishing a precise location can
  therefore only expose the person choosing to do it.
