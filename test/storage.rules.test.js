'use strict';

// Security-rule tests for storage.rules (dog photos), run against the Storage
// and Auth emulators. Two halves:
//
// 1. The rules themselves, through the Firebase SDK, like the web app
//    uploads: each protection paired with a test proving it denies.
// 2. The exact raw HTTP request the native (iOS/Android) app sends — see
//    mobile/src/lib/photoUpload.native.ts — using a real ID token from the
//    Auth emulator. The native app doesn't go through the SDK, so this is
//    what proves its request shape is one the rules accept.

const fs = require('fs');
const path = require('path');
const { assert } = require('chai');
const {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds,
} = require('@firebase/rules-unit-testing');

const PROJECT_ID = 'wagmate-rules-test';
const BUCKET = PROJECT_ID; // rules-unit-testing's default bucket: gs://<projectId>
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9]);

const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

// `npm test` picks up every file in test/, including from suites that only
// start the Firestore emulator; skip cleanly there rather than fail.
const describeWithEmulators = storageHost && authHost ? describe : describe.skip;

describeWithEmulators('storage (needs Storage + Auth emulators)', () => {
    let testEnv;

    before(async function () {
        this.timeout(60000);
        const [host, port] = storageHost.split(':');
        testEnv = await initializeTestEnvironment({
            projectId: PROJECT_ID,
            storage: {
                rules: fs.readFileSync(path.join(__dirname, '..', 'storage.rules'), 'utf8'),
                host,
                port: Number(port),
            },
        });
    });

    after(async () => {
        if (testEnv) await testEnv.cleanup();
    });

    beforeEach(async () => {
        await testEnv.clearStorage();
    });

    function storageAs(uid) {
        return testEnv.authenticatedContext(uid).storage();
    }

    function upload(storage, objectPath, bytes = JPEG, contentType = 'image/jpeg') {
        const metadata = contentType ? { contentType } : undefined;
        return storage.ref(objectPath).put(bytes, metadata);
    }

    async function seedPhoto(objectPath) {
        await testEnv.withSecurityRulesDisabled((ctx) =>
            ctx.storage().ref(objectPath).put(JPEG, { contentType: 'image/jpeg' })
        );
    }

    describe('storage.rules (dog photos)', () => {
        describe('uploading', () => {
            it('lets a user upload a JPEG to their own folder', async () => {
                await assertSucceeds(upload(storageAs('alice'), 'dog-photos/alice/1.jpg'));
            });

            it('refuses an upload into someone else\'s folder', async () => {
                await assertFails(upload(storageAs('alice'), 'dog-photos/bob/1.jpg'));
            });

            it('refuses an upload from someone not signed in', async () => {
                const anon = testEnv.unauthenticatedContext().storage();
                await assertFails(upload(anon, 'dog-photos/alice/1.jpg'));
            });

            it('refuses a file that is not declared as an image', async () => {
                await assertFails(upload(storageAs('alice'), 'dog-photos/alice/1.jpg', JPEG, 'application/pdf'));
            });

            // The original iOS bug: a blob with no type is sent as
            // application/octet-stream, which the rules must (and do) reject.
            it('refuses an upload with no content type at all', async () => {
                await assertFails(upload(storageAs('alice'), 'dog-photos/alice/1.jpg', JPEG, null));
            });

            it('refuses a file of 10 MB or more', async () => {
                const big = new Uint8Array(10 * 1024 * 1024);
                await assertFails(upload(storageAs('alice'), 'dog-photos/alice/big.jpg', big));
            });

            it('refuses uploads anywhere outside dog-photos/', async () => {
                await assertFails(upload(storageAs('alice'), 'alice/1.jpg'));
                await assertFails(upload(storageAs('alice'), 'dog-photos/1.jpg'));
            });

            it('refuses deleting someone else\'s photo', async () => {
                await seedPhoto('dog-photos/bob/1.jpg');
                await assertFails(storageAs('alice').ref('dog-photos/bob/1.jpg').delete());
            });

            it('lets a user delete their own photo', async () => {
                await seedPhoto('dog-photos/alice/1.jpg');
                await assertSucceeds(storageAs('alice').ref('dog-photos/alice/1.jpg').delete());
            });
        });

        describe('viewing', () => {
            it('lets any signed-in user see other people\'s photos (discover cards)', async () => {
                await seedPhoto('dog-photos/bob/1.jpg');
                await assertSucceeds(storageAs('alice').ref('dog-photos/bob/1.jpg').getMetadata());
            });

            it('refuses viewing photos when not signed in', async () => {
                await seedPhoto('dog-photos/bob/1.jpg');
                const anon = testEnv.unauthenticatedContext().storage();
                await assertFails(anon.ref('dog-photos/bob/1.jpg').getMetadata());
            });
        });
    });

    // ---------------------------------------------------------------------------
    // The native app's raw upload request
    // ---------------------------------------------------------------------------

    async function signUpOnAuthEmulator(email) {
        const res = await fetch(
            `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: 'test-password-123', returnSecureToken: true }),
            }
        );
        const body = await res.json();
        assert.equal(res.status, 200, JSON.stringify(body));
        return { uid: body.localId, idToken: body.idToken };
    }

    // Mirrors photoUpload.native.ts exactly: POST ?name=<path>, body = the file,
    // Content-Type = the object's type, "Authorization: Firebase <idToken>".
    function nativeStyleUpload({ objectPath, idToken, contentType = 'image/jpeg', bytes = JPEG }) {
        const headers = { 'Content-Type': contentType };
        if (idToken) headers.Authorization = `Firebase ${idToken}`;
        return fetch(
            `http://${storageHost}/v0/b/${BUCKET}/o?name=${encodeURIComponent(objectPath)}`,
            { method: 'POST', headers, body: bytes }
        );
    }

    describe('native app upload request (photoUpload.native.ts)', () => {
        it('is accepted for the signed-in user\'s own folder, and returns a working download link', async () => {
            const { uid, idToken } = await signUpOnAuthEmulator(`native-ok-${Date.now()}@example.com`);
            const objectPath = `dog-photos/${uid}/${Date.now()}.jpg`;

            const res = await nativeStyleUpload({ objectPath, idToken });
            const body = await res.json();
            assert.equal(res.status, 200, JSON.stringify(body));
            assert.equal(body.contentType, 'image/jpeg');

            // The app builds the public URL from downloadTokens in this response.
            const token = body.downloadTokens.split(',')[0];
            assert.ok(token, 'upload response should include a download token');
            const download = await fetch(
                `http://${storageHost}/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`
            );
            assert.equal(download.status, 200);
            assert.deepEqual(new Uint8Array(await download.arrayBuffer()), JPEG);
        });

        it('is refused without a sign-in token', async () => {
            const res = await nativeStyleUpload({ objectPath: 'dog-photos/someone/1.jpg' });
            assert.equal(res.status, 403);
        });

        it('is refused for another user\'s folder', async () => {
            const { idToken } = await signUpOnAuthEmulator(`native-other-${Date.now()}@example.com`);
            const res = await nativeStyleUpload({ objectPath: 'dog-photos/not-me/1.jpg', idToken });
            assert.equal(res.status, 403);
        });

        it('is refused when the content type is not an image', async () => {
            const { uid, idToken } = await signUpOnAuthEmulator(`native-type-${Date.now()}@example.com`);
            const res = await nativeStyleUpload({
                objectPath: `dog-photos/${uid}/1.jpg`,
                idToken,
                contentType: 'application/octet-stream',
            });
            assert.equal(res.status, 403);
        });
    });
});
