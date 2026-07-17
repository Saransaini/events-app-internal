'use strict';

const chai = require('chai');
const request = require('supertest');
const app = require('../server');
const { clearFirestore } = require('./setup/firestoreEmulator');

const expect = chai.expect;
const OWNER_A = 'test-owner-match-a';
const OWNER_B = 'test-owner-match-b';

function createDog(owner, body) {
    return request(app).post('/dogs').set('x-test-uid', owner).send(body);
}

function swipe(owner, body) {
    return request(app).post('/swipes').set('x-test-uid', owner).send(body);
}

describe('Matches API', function () {
    afterEach(clearFirestore);

    it('lists matches for a participant and forbids non-participants', function (done) {
        createDog(OWNER_A, { name: 'DogA', intents: ['breeding'] })
            .expect(201)
            .end((err, resA) => {
                if (err) return done(err);
                const dogAId = resA.body._id;

                createDog(OWNER_B, { name: 'DogB', intents: ['breeding'] })
                    .expect(201)
                    .end((err2, resB) => {
                        if (err2) return done(err2);
                        const dogBId = resB.body._id;

                        swipe(OWNER_A, { swiperDogId: dogAId, targetDogId: dogBId, intent: 'breeding', direction: 'like' })
                            .expect(200)
                            .end((err3) => {
                                if (err3) return done(err3);

                                swipe(OWNER_B, { swiperDogId: dogBId, targetDogId: dogAId, intent: 'breeding', direction: 'like' })
                                    .expect(200)
                                    .end((err4, res4) => {
                                        if (err4) return done(err4);
                                        const matchId = res4.body.match._id;

                                        request(app)
                                            .get('/matches/mine')
                                            .set('x-test-uid', OWNER_A)
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
});
