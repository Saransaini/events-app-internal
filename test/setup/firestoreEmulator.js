'use strict';

// Mocha --require hook (wired via .mocharc.yml). Ensures tests that touch
// Firestore run against the local emulator instead of a real project.
// Exports clearFirestore() for test files to call in their own afterEach
// hooks (root-level `afterEach` isn't available yet when a --require file
// loads, before Mocha's BDD globals are attached).

if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.error(
        '\nFIRESTORE_EMULATOR_HOST is not set.\n' +
        'Run tests via `npm run test:emulator` (starts the emulator for you), or start it yourself with\n' +
        '`npx firebase-tools emulators:start --only firestore` and set FIRESTORE_EMULATOR_HOST=localhost:8080.\n'
    );
    process.exit(1);
}

process.env.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'events-app-internal-test';
process.env.NODE_ENV = 'test';

const projectId = process.env.GOOGLE_CLOUD_PROJECT;

async function clearFirestore() {
    const url = `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${projectId}/databases/(default)/documents`;
    await fetch(url, { method: 'DELETE' });
}

module.exports = { clearFirestore };
