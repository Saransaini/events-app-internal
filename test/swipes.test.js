'use strict';

const chai = require('chai');
const request = require('supertest');
const app = require('../server');
const { clearFirestore } = require('./setup/firestoreEmulator');

const expect = chai.expect;
const UID_A = 'test-swipe-a';
const UID_B = 'test-swipe-b';

function createProfile(uid, body) {
    return request(app).post('/users/me').set('x-test-uid', uid).send(body);
}

function swipe(uid, body) {
    return request(app).post('/swipes').set('x-test-uid', uid).send(body);
}

describe('Swipes API', function () {
    afterEach(clearFirestore);

    it('creates a match only once both people have liked each other', function (done) {
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
                            .end((err3, res3) => {
                                if (err3) return done(err3);
                                expect(res3.body.matched).to.equal(false);

                                swipe(UID_B, { targetUid: UID_A, direction: 'like' })
                                    .expect(200)
                                    .end((err4, res4) => {
                                        if (err4) return done(err4);
                                        expect(res4.body.matched).to.equal(true);
                                        expect(res4.body.match.uids).to.have.members([UID_A, UID_B]);
                                        done();
                                    });
                            });
                    });
            });
    });

    it('does not match on a pass', function (done) {
        createProfile(UID_A, { displayName: 'A', dog: { name: 'DogA' }, intents: ['dating'] })
            .expect(200)
            .end((err) => {
                if (err) return done(err);

                createProfile(UID_B, { displayName: 'B', dog: { name: 'DogB' }, intents: ['dating'] })
                    .expect(200)
                    .end((err2) => {
                        if (err2) return done(err2);

                        swipe(UID_A, { targetUid: UID_B, direction: 'pass' }).expect(200).end((err3, res3) => {
                            if (err3) return done(err3);
                            expect(res3.body.matched).to.equal(false);
                            done();
                        });
                    });
            });
    });

    it('rejects swiping on yourself', function (done) {
        createProfile(UID_A, { displayName: 'A', dog: { name: 'DogA' }, intents: ['dating'] })
            .expect(200)
            .end((err) => {
                if (err) return done(err);
                swipe(UID_A, { targetUid: UID_A, direction: 'like' }).expect(400, done);
            });
    });

    it('rejects swiping on a nonexistent user', function (done) {
        createProfile(UID_A, { displayName: 'A', dog: { name: 'DogA' }, intents: ['dating'] })
            .expect(200)
            .end((err) => {
                if (err) return done(err);
                swipe(UID_A, { targetUid: 'no-such-user', direction: 'like' }).expect(404, done);
            });
    });
});
