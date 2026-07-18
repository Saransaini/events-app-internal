'use strict';

const chai = require('chai');
const request = require('supertest');
const app = require('../server');
const firestore = require('../src/lib/firestore');
const { clearFirestore } = require('./setup/firestoreEmulator');

const expect = chai.expect;
const UID_A = 'test-match-a';
const UID_B = 'test-match-b';

function createProfile(uid, body) {
    return request(app).post('/users/me').set('x-test-uid', uid).send(body);
}

function swipe(uid, body) {
    return request(app).post('/swipes').set('x-test-uid', uid).send(body);
}

describe('Matches API', function () {
    afterEach(clearFirestore);

    it('lists matches for a participant and forbids non-participants', function (done) {
        createProfile(UID_A, { displayName: 'A', dog: { name: 'DogA' }, intents: ['dating'] })
            .expect(200)
            .end((err) => {
                if (err) return done(err);

                createProfile(UID_B, { displayName: 'B', dog: { name: 'DogB' }, intents: ['dating'] })
                    .expect(200)
                    .end((err2) => {
                        if (err2) return done(err2);

                        swipe(UID_A, { targetUid: UID_B, direction: 'like' })
                            .expect(200)
                            .end((err3) => {
                                if (err3) return done(err3);

                                swipe(UID_B, { targetUid: UID_A, direction: 'like' })
                                    .expect(200)
                                    .end((err4, res4) => {
                                        if (err4) return done(err4);
                                        const matchId = res4.body.match._id;

                                        request(app)
                                            .get('/matches/mine')
                                            .set('x-test-uid', UID_A)
                                            .expect(200)
                                            .end((err5, res5) => {
                                                if (err5) return done(err5);
                                                expect(res5.body.matches).to.have.length(1);

                                                request(app)
                                                    .get(`/matches/${matchId}`)
                                                    .set('x-test-uid', 'some-unrelated-uid')
                                                    .expect(403, done);
                                            });
                                    });
                            });
                    });
            });
    });

    it('unmatching permanently deletes the match and every message in it, with no history left anywhere', function (done) {
        createProfile(UID_A, { displayName: 'A', dog: { name: 'DogA' }, intents: ['dating'] })
            .expect(200)
            .end((err) => {
                if (err) return done(err);

                createProfile(UID_B, { displayName: 'B', dog: { name: 'DogB' }, intents: ['dating'] })
                    .expect(200)
                    .end((err2) => {
                        if (err2) return done(err2);

                        swipe(UID_A, { targetUid: UID_B, direction: 'like' })
                            .expect(200)
                            .end((err3) => {
                                if (err3) return done(err3);

                                swipe(UID_B, { targetUid: UID_A, direction: 'like' })
                                    .expect(200)
                                    .end(async (err4, res4) => {
                                        if (err4) return done(err4);
                                        const matchId = res4.body.match._id;

                                        try {
                                            // simulate chat messages, normally written directly by the
                                            // mobile client via the Firestore SDK, never through this API
                                            const messages = firestore.collection('matches').doc(matchId).collection('messages');
                                            await messages.add({ senderId: UID_A, text: 'hey!', createdAt: new Date() });
                                            await messages.add({ senderId: UID_B, text: 'hi there', createdAt: new Date() });

                                            request(app)
                                                .delete(`/matches/${matchId}`)
                                                .set('x-test-uid', 'some-unrelated-uid')
                                                .expect(403)
                                                .end((errForbidden) => {
                                                    if (errForbidden) return done(errForbidden);

                                                    request(app)
                                                        .delete(`/matches/${matchId}`)
                                                        .set('x-test-uid', UID_A)
                                                        .expect(204)
                                                        .end(async (errDelete) => {
                                                            if (errDelete) return done(errDelete);

                                                            try {
                                                                const remainingMessages = await messages.get();
                                                                expect(remainingMessages.empty).to.equal(true);

                                                                request(app)
                                                                    .get(`/matches/${matchId}`)
                                                                    .set('x-test-uid', UID_A)
                                                                    .expect(404, done);
                                                            } catch (assertErr) {
                                                                done(assertErr);
                                                            }
                                                        });
                                                });
                                        } catch (setupErr) {
                                            done(setupErr);
                                        }
                                    });
                            });
                    });
            });
    });
});
