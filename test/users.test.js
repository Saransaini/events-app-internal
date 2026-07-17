'use strict';

const chai = require('chai');
const request = require('supertest');
const app = require('../server');
const { clearFirestore } = require('./setup/firestoreEmulator');

const expect = chai.expect;
const TEST_UID = 'test-owner-users';

describe('Users API', function () {
    afterEach(clearFirestore);

    it('creates and fetches a user profile', function (done) {
        request(app)
            .post('/users/me')
            .set('x-test-uid', TEST_UID)
            .send({ displayName: 'Jamie', email: 'jamie@example.com' })
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body.displayName).to.equal('Jamie');

                request(app)
                    .get('/users/me')
                    .set('x-test-uid', TEST_UID)
                    .expect(200)
                    .end((err2, res2) => {
                        if (err2) return done(err2);
                        expect(res2.body.email).to.equal('jamie@example.com');
                        done();
                    });
            });
    });

    it('updates a user profile via PATCH', function (done) {
        request(app)
            .post('/users/me')
            .set('x-test-uid', TEST_UID)
            .send({ displayName: 'Jamie' })
            .expect(200)
            .end((err) => {
                if (err) return done(err);

                request(app)
                    .patch('/users/me')
                    .set('x-test-uid', TEST_UID)
                    .send({ displayName: 'Jamie Updated' })
                    .expect(200)
                    .end((err2, res2) => {
                        if (err2) return done(err2);
                        expect(res2.body.displayName).to.equal('Jamie Updated');
                        done();
                    });
            });
    });

    it('rejects requests without auth', function (done) {
        request(app).get('/users/me').expect(401, done);
    });

    it('creates a profile with an embedded dog and intents, activating it for discovery', function (done) {
        request(app)
            .post('/users/me')
            .set('x-test-uid', TEST_UID)
            .send({
                displayName: 'Jamie',
                email: 'jamie@example.com',
                dog: { name: 'Rex', breed: 'Labrador', age: 3, sex: 'male' },
                intents: ['dating', 'playdate'],
                location: { lat: 37.7749, lng: -122.4194 },
            })
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body.dog.name).to.equal('Rex');
                expect(res.body.intents).to.eql(['dating', 'playdate']);
                expect(res.body.active).to.equal(true);
                done();
            });
    });

    it('rejects an invalid intent', function (done) {
        request(app)
            .post('/users/me')
            .set('x-test-uid', TEST_UID)
            .send({ dog: { name: 'Rex' }, intents: ['breeding'] })
            .expect(400, done);
    });

    it('rejects a dog without a name', function (done) {
        request(app)
            .post('/users/me')
            .set('x-test-uid', TEST_UID)
            .send({ dog: { breed: 'Labrador' } })
            .expect(400, done);
    });

    it('exposes another user\'s public profile without email or exact location', function (done) {
        request(app)
            .post('/users/me')
            .set('x-test-uid', TEST_UID)
            .send({
                displayName: 'Jamie',
                email: 'jamie@example.com',
                dog: { name: 'Rex' },
                location: { lat: 37.7749, lng: -122.4194 },
            })
            .expect(200)
            .end((err) => {
                if (err) return done(err);

                request(app)
                    .get(`/users/${TEST_UID}`)
                    .set('x-test-uid', 'someone-else')
                    .expect(200)
                    .end((err2, res2) => {
                        if (err2) return done(err2);
                        expect(res2.body.displayName).to.equal('Jamie');
                        expect(res2.body.dog.name).to.equal('Rex');
                        expect(res2.body.email).to.equal(undefined);
                        expect(res2.body.location).to.equal(undefined);
                        done();
                    });
            });
    });
});

describe('Discover API', function () {
    afterEach(clearFirestore);

    const ME = 'test-discover-me';
    const NEARBY = 'test-discover-nearby';
    const FAR = 'test-discover-far';
    const INACTIVE = 'test-discover-inactive';

    function createProfile(uid, body) {
        return request(app).post('/users/me').set('x-test-uid', uid).send(body);
    }

    it('returns nearby active people, excluding the requester and inactive profiles', function (done) {
        createProfile(ME, {
            displayName: 'Me',
            dog: { name: 'MyDog' },
            intents: ['dating'],
            location: { lat: 37.7749, lng: -122.4194 },
        })
            .expect(200)
            .end((err) => {
                if (err) return done(err);

                createProfile(NEARBY, {
                    displayName: 'Nearby',
                    dog: { name: 'NearbyDog' },
                    intents: ['playdate'],
                    location: { lat: 37.775, lng: -122.4195 },
                })
                    .expect(200)
                    .end((err2) => {
                        if (err2) return done(err2);

                        createProfile(FAR, {
                            displayName: 'Far',
                            dog: { name: 'FarDog' },
                            intents: ['dating'],
                            location: { lat: 40.7128, lng: -74.006 },
                        })
                            .expect(200)
                            .end((err3) => {
                                if (err3) return done(err3);

                                // no dog => inactive, shouldn't appear in discovery
                                createProfile(INACTIVE, { displayName: 'NoDogYet' })
                                    .expect(200)
                                    .end((err4) => {
                                        if (err4) return done(err4);

                                        request(app)
                                            .get('/users/discover')
                                            .set('x-test-uid', ME)
                                            .query({ lat: 37.7749, lng: -122.4194, radiusKm: 25 })
                                            .expect(200)
                                            .end((err5, res5) => {
                                                if (err5) return done(err5);
                                                const names = res5.body.users.map((u) => u.displayName);
                                                expect(names).to.include('Nearby');
                                                expect(names).to.not.include('Far');
                                                expect(names).to.not.include('Me');
                                                expect(names).to.not.include('NoDogYet');
                                                done();
                                            });
                                    });
                            });
                    });
            });
    });
});
