import { test, expect, type Browser, type Page } from '@playwright/test';
import path from 'node:path';

// Two people use the real web app side by side, against the Firebase
// emulators (never the real project): both sign up, build a profile with a
// photo, like each other, chat in real time, and then one unmatches — which
// must permanently delete the whole conversation for both of them.

const DOG_PHOTO = path.join(__dirname, 'fixtures', 'dog.jpg');
// ZIP 10001 in src/data/usZipCoords.json, so the browser's location and the
// ZIP the profile is created with put both people in the same place.
const NEW_YORK = { latitude: 40.7484, longitude: -73.9967 };
const NO_ONE_LEFT = 'No one new nearby right now. Check back later!';
const NO_MATCHES = 'No matches yet. Keep swiping!';

interface Person {
  name: string;
  dog: string;
  email: string;
  page: Page;
  errors: string[];
}

// Expo Router's stack keeps earlier screens mounted (hidden) on web, so the
// same button text can exist several times; only ever act on the visible one.
const text = (page: Page, value: string) =>
  page.getByText(value, { exact: true }).filter({ visible: true });
const field = (page: Page, placeholder: string) =>
  page.getByPlaceholder(placeholder, { exact: true }).filter({ visible: true });

async function openAs(browser: Browser, name: string, dog: string): Promise<Person> {
  const context = await browser.newContext({
    geolocation: NEW_YORK,
    permissions: ['geolocation'],
  });
  const page = await context.newPage();
  const errors: string[] = [];
  // Uncaught errors in the app fail the test at the end, rather than hiding
  // behind a screen that merely looks fine.
  page.on('pageerror', (err) => errors.push(err.message));
  const email = `${name.toLowerCase()}-${Date.now()}@example.com`;
  return { name, dog, email, page, errors };
}

async function signUpAndCreateProfile(person: Person) {
  const { page } = person;

  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await text(page, "Don't have an account? Sign up").click();

  await field(page, 'Your name').fill(person.name);
  await field(page, 'Email').fill(person.email);
  await field(page, 'Password').fill('test-password-123');
  await text(page, 'Sign Up').click();

  // Signing in briefly lands on Discover ("Create a profile") before the
  // signup screen finishes saving the account and moves on to onboarding.
  await expect(text(page, 'Tell us about your dog')).toBeVisible({ timeout: 30_000 });

  await field(page, 'Name').fill(person.dog);
  await field(page, 'Breed').fill('Golden Retriever');
  await field(page, 'Age (years)').fill('3');
  await text(page, 'Female').click();
  await field(page, 'A little bio...').fill(`${person.dog} loves the park.`);
  await text(page, 'Next').click();

  // Photo upload: the real picker -> resize -> Firebase Storage path.
  await expect(text(page, 'Add some photos')).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await text(page, '+').click();
  await (await chooser).setFiles(DOG_PHOTO);
  await expect(page.locator('img[src*="dog-photos"]').filter({ visible: true })).toBeVisible({
    timeout: 30_000,
  });
  await text(page, 'Next').click();

  await expect(text(page, 'What are you looking for?')).toBeVisible();
  await text(page, 'Dating').click();
  await text(page, 'Next').click();

  await expect(text(page, 'Where are you?')).toBeVisible();
  await field(page, 'ZIP code').fill('10001');
  await text(page, 'Use ZIP').click();
  await expect(text(page, 'Location set: New York, NY')).toBeVisible();
  await text(page, 'Finish').click();

  await expect(page).toHaveURL(/\/discover/);
}

async function seeCardAndLike(liker: Person, liked: Person) {
  const { page } = liker;
  await page.goto('/discover');
  // The other person's card, with their dog and photo.
  await expect(text(page, liked.name).first()).toBeVisible();
  await expect(text(page, `with ${liked.dog} (Golden Retriever)`).first()).toBeVisible();
  // Their uploaded photo actually loads from Storage on the card.
  await expect(page.locator('img[src*="dog-photos"]').filter({ visible: true }).first()).toBeVisible();
  await text(page, 'Like').click();
  await expect(text(page, NO_ONE_LEFT)).toBeVisible();
}

async function openChatWith(person: Person, other: Person) {
  const { page } = person;
  await page.goto('/matches');
  await text(page, other.name).click();
  await expect(page).toHaveURL(/\/match\//);
  await expect(field(page, 'Type a message…')).toBeVisible();
}

async function sendMessage(person: Person, message: string) {
  await field(person.page, 'Type a message…').fill(message);
  await text(person.page, 'Send').click();
}

test('two dog owners match, chat, and unmatch', async ({ browser }) => {
  const alice = await openAs(browser, 'Alice', 'Biscuit');
  const bob = await openAs(browser, 'Bob', 'Pepper');

  await test.step('both sign up and create a profile with a photo', async () => {
    await signUpAndCreateProfile(alice);
    await signUpAndCreateProfile(bob);
  });

  await test.step('a like is saved: the person never reappears in Discover', async () => {
    await seeCardAndLike(bob, alice);
    await expect(async () => {
      await bob.page.reload();
      await expect(text(bob.page, NO_ONE_LEFT)).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
  });

  await test.step('liking back creates the match', async () => {
    await seeCardAndLike(alice, bob);
    // Tab navigation, not a reload, so the like-then-match request in flight
    // is never interrupted.
    await text(alice.page, 'Matches').click();
    await expect(text(alice.page, bob.name)).toBeVisible();
    await expect(text(alice.page, `with ${bob.dog}`)).toBeVisible();
  });

  await test.step('messages arrive in real time, both ways', async () => {
    await openChatWith(alice, bob);
    await openChatWith(bob, alice);

    await sendMessage(alice, 'Hi Bob! Park on Saturday?');
    await expect(text(bob.page, 'Hi Bob! Park on Saturday?')).toBeVisible();

    await sendMessage(bob, 'Yes! Pepper would love that.');
    await expect(text(alice.page, 'Yes! Pepper would love that.')).toBeVisible();
  });

  await test.step('unmatching deletes the match and the conversation for both', async () => {
    alice.page.once('dialog', (dialog) => dialog.accept());
    await text(alice.page, 'Unmatch').click();
    await expect(alice.page).toHaveURL(/\/matches/);
    await expect(text(alice.page, NO_MATCHES)).toBeVisible();

    await bob.page.goto('/matches');
    await expect(text(bob.page, NO_MATCHES)).toBeVisible();
  });

  expect(alice.errors, 'uncaught errors in Alice\'s browser').toEqual([]);
  expect(bob.errors, 'uncaught errors in Bob\'s browser').toEqual([]);
});
