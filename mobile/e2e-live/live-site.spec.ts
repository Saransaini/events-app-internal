import { test, expect } from '@playwright/test';

// Post-deploy check of the LIVE site against the REAL Firebase project.
// Read-only and account-free: it loads the site, then makes one
// unauthenticated Firestore read from inside the page with the same SDK
// version the app uses. The security rules must refuse it
// ("permission-denied") — which can only happen if the browser actually
// reached Firestore's servers. "unavailable" / "client is offline" means the
// browser could not connect at all.

const LIVE_URL = process.env.LIVE_URL!;
const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/12.16.0';

test('live site loads and can reach Firestore', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(LIVE_URL);
  await expect(page.getByText('Log In', { exact: true }).first()).toBeVisible({ timeout: 30_000 });

  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };

  const result = await page.evaluate(
    async ({ sdk, config }) => {
      const { initializeApp } = await import(`${sdk}/firebase-app.js`);
      const { getFirestore, doc, getDoc } = await import(`${sdk}/firebase-firestore.js`);
      const db = getFirestore(initializeApp(config, 'live-check'));
      const started = Date.now();
      try {
        await getDoc(doc(db, 'publicProfiles', '__live_connectivity_check__'));
        return { code: 'read-succeeded', ms: Date.now() - started };
      } catch (err: any) {
        return { code: err?.code ?? String(err), message: err?.message, ms: Date.now() - started };
      }
    },
    { sdk: FIREBASE_SDK, config }
  );

  console.log('Firestore check from the live site:', JSON.stringify(result));
  expect(result.code, `Firestore unreachable from the live site: ${JSON.stringify(result)}`).toBe('permission-denied');
  expect(errors).toEqual([]);
});
