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
});
