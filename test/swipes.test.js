'use strict';

const chai = require('chai');
const request = require('supertest');
const app = require('../server');
const { clearFirestore } = require('./setup/firestoreEmulator');

const expect = chai.expect;
const OWNER_A = 'test-owner-swipe-a';
const OWNER_B = 'test-owner-swipe-b';

function createDog(owner, body) {
    return request(app).post('/dogs').set('x-test-uid', owner).send(body);
}

function swipe(owner, body) {
    return request(app).post('/swipes').set('x-test-uid', owner).send(body);
}

describe('Swipes API', function () {
    afterEach(clearFirestore);

    it('playdate/breeding intents require a reciprocal like before matching', function (done) {
        createDog(OWNER_A, { name: 'DogA', intents: ['playdate'] })
            .expect(201)
            .end((err, resA) => {
                if (err) return done(err);
                const dogAId = resA.body._id;

                createDog(OWNER_B, { name: 'DogB', intents: ['playdate'] })
                    .expect(201)
                    .end((err2, resB) => {
                        if (err2) return done(err2);
                        const dogBId = resB.body._id;

                        swipe(OWNER_A, { swiperDogId: dogAId, targetDogId: dogBId, intent: 'playdate', direction: 'like' })
                            .expect(200)
                            .end((err3, res3) => {
                                if (err3) return done(err3);
                                expect(res3.body.matched).to.equal(false);

                                swipe(OWNER_B, { swiperDogId: dogBId, targetDogId: dogAId, intent: 'playdate', direction: 'like' })
                                    .expect(200)
                                    .end((err4, res4) => {
                                        if (err4) return done(err4);
                                        expect(res4.body.matched).to.equal(true);
                                        expect(res4.body.match.type).to.equal('reciprocal');
                                        done();
                                    });
                            });
                    });
            });
    });

    it('adoption intent creates an asymmetric match on a single like', function (done) {
        createDog(OWNER_A, { name: 'ShelterDog', intents: ['adoption'] })
            .expect(201)
            .end((err, resShelter) => {
                if (err) return done(err);
                const shelterDogId = resShelter.body._id;

                createDog(OWNER_B, { name: 'AdopterDog', intents: ['adoption'] })
                    .expect(201)
                    .end((err2, resAdopter) => {
                        if (err2) return done(err2);
                        const adopterDogId = resAdopter.body._id;

                        swipe(OWNER_B, {
                            swiperDogId: adopterDogId,
                            targetDogId: shelterDogId,
                            intent: 'adoption',
                            direction: 'like'
                        })
                            .expect(200)
                            .end((err3, res3) => {
                                if (err3) return done(err3);
                                expect(res3.body.matched).to.equal(true);
                                expect(res3.body.match.type).to.equal('asymmetric');
                                expect(res3.body.match.dogAId).to.equal(shelterDogId);
                                done();
                            });
                    });
            });
    });

    it('rejects swiping with a dog you do not own', function (done) {
        createDog(OWNER_A, { name: 'DogA', intents: ['playdate'] })
            .expect(201)
            .end((err, resA) => {
                if (err) return done(err);

                createDog(OWNER_B, { name: 'DogB', intents: ['playdate'] })
                    .expect(201)
                    .end((err2, resB) => {
                        if (err2) return done(err2);

                        swipe(OWNER_B, {
                            swiperDogId: resA.body._id,
                            targetDogId: resB.body._id,
                            intent: 'playdate',
                            direction: 'like'
                        }).expect(403, done);
                    });
            });
    });
});
