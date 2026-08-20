'use strict';

// Security-rule tests. These matter more than the usual unit test here:
// with the Express backend gone, firestore.rules is the ONLY thing standing
// between a signed-in user and everyone else's data, so each rule that
// protects something gets a test proving it actually denies.

const fs = require('fs');
const path = require('path');
const { assert } = require('chai');
const {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    collection,
    getDocs,
    query,
    where,
} = require('firebase/firestore');

const ALICE = 'alice';
const BOB = 'bob';
const CAROL = 'carol';

// Match ids are the two uids sorted and joined, which the rules enforce.
const ALICE_BOB_MATCH = [ALICE, BOB].sort().join('_');

let testEnv;

before(async function () {
    this.timeout(60000);
    testEnv = await initializeTestEnvironment({
        projectId: 'wagmate-rules-test',
        firestore: {
            rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8'),
            host: '127.0.0.1',
            port: 8080,
        },
    });
});

after(async () => {
    if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
    await testEnv.clearFirestore();
});

function db(uid) {
    return testEnv.authenticatedContext(uid).firestore();
}

function anonDb() {
    return testEnv.unauthenticatedContext().firestore();
}

// Writes fixture data bypassing rules, for setting up preconditions.
function seed(fn) {
    return testEnv.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));
}

async function seedSwipe(from, to, direction) {
    await seed((f) => setDoc(doc(f, 'swipes', `${from}_${to}`), { swiperUid: from, targetUid: to, direction }));
}

async function seedMatch(uids) {
    const sorted = [...uids].sort();
    await seed((f) => setDoc(doc(f, 'matches', sorted.join('_')), { uids: sorted, createdAt: new Date() }));
}

describe('firestore.rules', () => {
    describe('private profiles (users/{uid})', () => {
        it('lets the owner read and write their own', async () => {
            await assertSucceeds(setDoc(doc(db(ALICE), 'users', ALICE), { displayName: 'Alice' }));
            await assertSucceeds(getDoc(doc(db(ALICE), 'users', ALICE)));
        });

        it("denies reading another user's private profile, which holds their email and exact location", async () => {
            await seed((f) =>
                setDoc(doc(f, 'users', BOB), { displayName: 'Bob', email: 'bob@example.com' })
            );
            await assertFails(getDoc(doc(db(ALICE), 'users', BOB)));
        });

        it("denies writing another user's private profile", async () => {
            await assertFails(setDoc(doc(db(ALICE), 'users', BOB), { displayName: 'hacked' }));
        });

        it('denies signed-out access entirely', async () => {
            await assertFails(getDoc(doc(anonDb(), 'users', ALICE)));
        });
    });

    describe('public profiles (publicProfiles/{uid})', () => {
        it('lets any signed-in user read them, since that is the discover feed', async () => {
            await seed((f) => setDoc(doc(f, 'publicProfiles', BOB), { displayName: 'Bob', active: true }));
            await assertSucceeds(getDoc(doc(db(ALICE), 'publicProfiles', BOB)));
        });

        it('denies signed-out reads', async () => {
            await seed((f) => setDoc(doc(f, 'publicProfiles', BOB), { displayName: 'Bob', active: true }));
            await assertFails(getDoc(doc(anonDb(), 'publicProfiles', BOB)));
        });

        it('lets the owner write their own', async () => {
            await assertSucceeds(setDoc(doc(db(ALICE), 'publicProfiles', ALICE), { displayName: 'Alice', active: true }));
        });

        it("denies writing someone else's", async () => {
            await assertFails(setDoc(doc(db(ALICE), 'publicProfiles', BOB), { displayName: 'hacked' }));
        });

        it('rejects an email field, keeping emails out of world-readable documents', async () => {
            await assertFails(
                setDoc(doc(db(ALICE), 'publicProfiles', ALICE), { displayName: 'Alice', email: 'alice@example.com' })
            );
        });
    });

    describe('swipes', () => {
        it('lets a user record their own swipe', async () => {
            await assertSucceeds(
                setDoc(doc(db(ALICE), 'swipes', `${ALICE}_${BOB}`), {
                    swiperUid: ALICE,
                    targetUid: BOB,
                    direction: 'like',
                })
            );
        });

        it('denies forging a swipe as someone else', async () => {
            await assertFails(
                setDoc(doc(db(ALICE), 'swipes', `${BOB}_${CAROL}`), {
                    swiperUid: BOB,
                    targetUid: CAROL,
                    direction: 'like',
                })
            );
        });

        it('denies a document id that disagrees with its contents', async () => {
            await assertFails(
                setDoc(doc(db(ALICE), 'swipes', `${ALICE}_${CAROL}`), {
                    swiperUid: ALICE,
                    targetUid: BOB,
                    direction: 'like',
                })
            );
        });

        it('denies an invalid direction', async () => {
            await assertFails(
                setDoc(doc(db(ALICE), 'swipes', `${ALICE}_${BOB}`), {
                    swiperUid: ALICE,
                    targetUid: BOB,
                    direction: 'superlike',
                })
            );
        });

        it('denies swiping on yourself', async () => {
            await assertFails(
                setDoc(doc(db(ALICE), 'swipes', `${ALICE}_${ALICE}`), {
                    swiperUid: ALICE,
                    targetUid: ALICE,
                    direction: 'like',
                })
            );
        });

        it('lets a user read back their own swipes, which discovery needs', async () => {
            await seedSwipe(ALICE, BOB, 'like');
            await assertSucceeds(
                getDocs(query(collection(db(ALICE), 'swipes'), where('swiperUid', '==', ALICE)))
            );
        });

        it('denies reading swipes aimed at you, so there is no "who liked me" leak', async () => {
            await seedSwipe(BOB, ALICE, 'like');
            await assertFails(
                getDocs(query(collection(db(ALICE), 'swipes'), where('targetUid', '==', ALICE)))
            );
        });

        it('denies deleting a swipe, so a pass cannot be silently retried', async () => {
            await seedSwipe(ALICE, BOB, 'pass');
            await assertFails(deleteDoc(doc(db(ALICE), 'swipes', `${ALICE}_${BOB}`)));
        });
    });

    describe('match creation', () => {
        const sorted = [ALICE, BOB].sort();
        const payload = { uids: sorted, createdAt: new Date() };

        it('allows it once both people have liked each other', async () => {
            await seedSwipe(ALICE, BOB, 'like');
            await seedSwipe(BOB, ALICE, 'like');
            await assertSucceeds(setDoc(doc(db(ALICE), 'matches', ALICE_BOB_MATCH), payload));
        });

        it('denies it when only one side has liked — the core anti-fabrication check', async () => {
            await seedSwipe(ALICE, BOB, 'like');
            await assertFails(setDoc(doc(db(ALICE), 'matches', ALICE_BOB_MATCH), payload));
        });

        it('denies it when nobody has liked at all', async () => {
            await assertFails(setDoc(doc(db(ALICE), 'matches', ALICE_BOB_MATCH), payload));
        });

        it('denies it when the other side passed rather than liked', async () => {
            await seedSwipe(ALICE, BOB, 'like');
            await seedSwipe(BOB, ALICE, 'pass');
            await assertFails(setDoc(doc(db(ALICE), 'matches', ALICE_BOB_MATCH), payload));
        });

        it('denies creating a match between two other people', async () => {
            await seedSwipe(BOB, CAROL, 'like');
            await seedSwipe(CAROL, BOB, 'like');
            const others = [BOB, CAROL].sort();
            await assertFails(
                setDoc(doc(db(ALICE), 'matches', others.join('_')), { uids: others, createdAt: new Date() })
            );
        });

        it('denies a document id that does not match the uid pair', async () => {
            await seedSwipe(ALICE, BOB, 'like');
            await seedSwipe(BOB, ALICE, 'like');
            await assertFails(setDoc(doc(db(ALICE), 'matches', 'some-other-id'), payload));
        });

        it('denies editing a match after the fact', async () => {
            await seedMatch([ALICE, BOB]);
            await assertFails(
                setDoc(doc(db(ALICE), 'matches', ALICE_BOB_MATCH), { uids: [ALICE, CAROL], createdAt: new Date() })
            );
        });
    });

    describe('match access', () => {
        it('lets a participant read their match', async () => {
            await seedMatch([ALICE, BOB]);
            await assertSucceeds(getDoc(doc(db(ALICE), 'matches', ALICE_BOB_MATCH)));
        });

        it('denies an outsider reading it', async () => {
            await seedMatch([ALICE, BOB]);
            await assertFails(getDoc(doc(db(CAROL), 'matches', ALICE_BOB_MATCH)));
        });

        it('lets either participant unmatch', async () => {
            await seedMatch([ALICE, BOB]);
            await assertSucceeds(deleteDoc(doc(db(BOB), 'matches', ALICE_BOB_MATCH)));
        });

        it('denies an outsider unmatching other people', async () => {
            await seedMatch([ALICE, BOB]);
            await assertFails(deleteDoc(doc(db(CAROL), 'matches', ALICE_BOB_MATCH)));
        });
    });

    describe('messages', () => {
        beforeEach(async () => {
            await seedMatch([ALICE, BOB]);
        });

        it('lets a participant send a message', async () => {
            await assertSucceeds(
                setDoc(doc(db(ALICE), 'matches', ALICE_BOB_MATCH, 'messages', 'm1'), {
                    senderId: ALICE,
                    text: 'hi',
                    createdAt: new Date(),
                })
            );
        });

        it('denies sending a message signed as the other person', async () => {
            await assertFails(
                setDoc(doc(db(ALICE), 'matches', ALICE_BOB_MATCH, 'messages', 'm1'), {
                    senderId: BOB,
                    text: 'forged',
                    createdAt: new Date(),
                })
            );
        });

        it('denies an outsider sending into the conversation', async () => {
            await assertFails(
                setDoc(doc(db(CAROL), 'matches', ALICE_BOB_MATCH, 'messages', 'm1'), {
                    senderId: CAROL,
                    text: 'intruding',
                    createdAt: new Date(),
                })
            );
        });

        it('denies an outsider reading the conversation', async () => {
            await seed((f) =>
                setDoc(doc(f, 'matches', ALICE_BOB_MATCH, 'messages', 'm1'), {
                    senderId: ALICE,
                    text: 'private',
                    createdAt: new Date(),
                })
            );
            await assertFails(getDoc(doc(db(CAROL), 'matches', ALICE_BOB_MATCH, 'messages', 'm1')));
        });

        it('lets a participant read the conversation', async () => {
            await seed((f) =>
                setDoc(doc(f, 'matches', ALICE_BOB_MATCH, 'messages', 'm1'), {
                    senderId: ALICE,
                    text: 'hello',
                    createdAt: new Date(),
                })
            );
            await assertSucceeds(getDoc(doc(db(BOB), 'matches', ALICE_BOB_MATCH, 'messages', 'm1')));
        });

        it('denies editing a sent message', async () => {
            await seed((f) =>
                setDoc(doc(f, 'matches', ALICE_BOB_MATCH, 'messages', 'm1'), {
                    senderId: ALICE,
                    text: 'original',
                    createdAt: new Date(),
                })
            );
            await assertFails(
                setDoc(doc(db(ALICE), 'matches', ALICE_BOB_MATCH, 'messages', 'm1'), {
                    senderId: ALICE,
                    text: 'edited',
                    createdAt: new Date(),
                })
            );
        });

        it('lets a participant delete messages, which is how unmatch purges history', async () => {
            await seed((f) =>
                setDoc(doc(f, 'matches', ALICE_BOB_MATCH, 'messages', 'm1'), {
                    senderId: ALICE,
                    text: 'bye',
                    createdAt: new Date(),
                })
            );
            await assertSucceeds(deleteDoc(doc(db(BOB), 'matches', ALICE_BOB_MATCH, 'messages', 'm1')));
        });

        it('denies an outsider deleting messages', async () => {
            await seed((f) =>
                setDoc(doc(f, 'matches', ALICE_BOB_MATCH, 'messages', 'm1'), {
                    senderId: ALICE,
                    text: 'keep',
                    createdAt: new Date(),
                })
            );
            await assertFails(deleteDoc(doc(db(CAROL), 'matches', ALICE_BOB_MATCH, 'messages', 'm1')));
        });
    });

    describe('everything else', () => {
        it('is denied by the catch-all', async () => {
            await assertFails(setDoc(doc(db(ALICE), 'someRandomCollection', 'x'), { a: 1 }));
            await assertFails(getDoc(doc(db(ALICE), 'someRandomCollection', 'x')));
        });
    });
});
