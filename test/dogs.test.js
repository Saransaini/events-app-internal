'use strict';

const chai = require('chai');
const request = require('supertest');
const app = require('../server');
const { clearFirestore } = require('./setup/firestoreEmulator');

const expect = chai.expect;
const OWNER_A = 'test-owner-a';
const OWNER_B = 'test-owner-b';

function createDog(owner, body) {
    return request(app).post('/dogs').set('x-test-uid', owner).send(body);
}

describe('Dogs API', function () {
    afterEach(clearFirestore);

    it('creates a dog profile and lists it under /dogs/mine', function (done) {
        createDog(OWNER_A, {
            name: 'Rex',
            breed: 'Labrador',
            age: 3,
            sex: 'male',
            intents: ['playdate'],
            location: { lat: 37.7749, lng: -122.4194 }
        })
            .expect(201)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body.name).to.equal('Rex');
                expect(res.body._id).to.be.a('string');

                request(app)
                    .get('/dogs/mine')
                    .set('x-test-uid', OWNER_A)
                    .expect(200)
                    .end((err2, res2) => {
                        if (err2) return done(err2);
                        expect(res2.body.dogs).to.have.length(1);
                        done();
                    });
            });
    });

    it('rejects creating a dog with an invalid intent', function (done) {
        createDog(OWNER_A, { name: 'Rex', intents: ['not-a-real-intent'] }).expect(400, done);
    });

    it('prevents a non-owner from updating or deleting a dog', function (done) {
        createDog(OWNER_A, { name: 'Rex', intents: ['playdate'] })
            .expect(201)
            .end((err, res) => {
                if (err) return done(err);
                const dogId = res.body._id;

                request(app)
                    .patch(`/dogs/${dogId}`)
                    .set('x-test-uid', OWNER_B)
                    .send({ name: 'Hijacked' })
                    .expect(403, done);
            });
    });

    it('discover returns nearby dogs sharing an intent, excluding own dogs and already-swiped dogs', function (done) {
        createDog(OWNER_A, {
            name: 'MyDog',
            intents: ['playdate'],
            location: { lat: 37.7749, lng: -122.4194 }
        })
            .expect(201)
            .end((err, resMine) => {
                if (err) return done(err);
                const myDogId = resMine.body._id;

                createDog(OWNER_B, {
                    name: 'Nearby',
                    intents: ['playdate'],
                    location: { lat: 37.775, lng: -122.4195 }
                })
                    .expect(201)
                    .end((err2, resNearby) => {
                        if (err2) return done(err2);

                        createDog(OWNER_B, {
                            name: 'Far Away',
                            intents: ['playdate'],
                            location: { lat: 40.7128, lng: -74.006 }
                        })
                            .expect(201)
                            .end((err3) => {
                                if (err3) return done(err3);

                                request(app)
                                    .get('/dogs/discover')
                                    .set('x-test-uid', OWNER_A)
                                    .query({
                                        dogId: myDogId,
                                        intent: 'playdate',
                                        lat: 37.7749,
                                        lng: -122.4194,
                                        radiusKm: 25
                                    })
                                    .expect(200)
                                    .end((err4, res4) => {
                                        if (err4) return done(err4);
                                        const names = res4.body.dogs.map((d) => d.name);
                                        expect(names).to.include('Nearby');
                                        expect(names).to.not.include('Far Away');
                                        expect(names).to.not.include('MyDog');
                                        done();
                                    });
                            });
                    });
            });
    });
});
