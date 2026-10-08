// `npm run test:e2e`: builds the web app pointed at the Firebase emulators,
// starts Auth + Firestore + Storage emulators with the real security rules
// from the repo root, and runs the Playwright tests against it. Nothing here
// touches the real Firebase project. Works the same on Windows, macOS, Linux.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(mobileDir, '..');
const PROJECT = 'wagmate-e2e';
const extraArgs = process.argv.slice(2).join(' ');

function run(command, cwd, env = {}) {
  const result = spawnSync(command, {
    cwd,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('npx expo export --platform web --output-dir dist-e2e', mobileDir, {
  EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: '127.0.0.1',
  EXPO_PUBLIC_FIREBASE_API_KEY: 'fake-api-key',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT}.firebaseapp.com`,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: PROJECT,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: `${PROJECT}.appspot.com`,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '0',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:0:web:0',
  // No Google button in tests; it needs a real OAuth client.
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '',
});

run(
  `npx --yes firebase-tools emulators:exec --project ${PROJECT} --only auth,firestore,storage ` +
    `"cd mobile && npx playwright test ${extraArgs}"`,
  repoRoot
);
