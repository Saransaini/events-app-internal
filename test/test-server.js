var chai = require('chai');
const request = require('supertest');
const proxyquire = require('proxyquire');
const FakeFirestore = require('./fake-firestore');

// server.js constructs a real Firestore client at module load time; swap
// it for an in-memory fake so the suite is deterministic and needs no
// network access or credentials. See TEST_PLAN.md for why.
const app = proxyquire('../server', {
  '@google-cloud/firestore': FakeFirestore
});

describe('GET /', function() {
    it('responds with json', function(done) {
      request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, done);
    });
  });

  describe('GET /version', function() {
    it('responds with the current version', function(done) {
      request(app)
        .get('/version')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          chai.expect(JSON.parse(res.text)).to.eql({ version: '1.0.0' });
          return done();
        });
    });
  });

  describe('unknown route', function() {
    it('responds with 404', function(done) {
      request(app)
        .get('/not-a-real-route')
        .expect(404, done);
    });
  });

  describe('CORS', function() {
    it('sets Access-Control-Allow-Origin on responses', function(done) {
      request(app)
        .get('/version')
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          chai.expect(res.headers['access-control-allow-origin']).to.equal('*');
          return done();
        });
    });
  });

  describe('GET /events', function() {
    it('responds with json', function(done) {
      request(app)
        .get('/events')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, done);
    });
    it('returns events', function(done) {
      request(app)
      .get('/events')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        chai.expect(JSON.parse(res.text)).to.have.property('events');
        return done();
      });

      });
    it('falls back to the mock events when Firestore is empty', function(done) {
      request(app)
      .get('/events')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        const body = JSON.parse(res.text);
        chai.expect(body.events.length).to.equal(2);
        chai.expect(body.events.map(e => e.id)).to.include.members([1, 2]);
        return done();
      });
      });
  });

  // populated by the POST /event test below, and reused by the
  // like/unlike tests to reference a real (fake) Firestore doc id
  let createdEventId;

  describe('POST /event', function() {
    it('adds an event', function(done) {
      request(app)
      .post('/event')
      .send( { title: 'a test event', description: 'a really cool test', location: 'Somewhere nice' })
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        // Firestore was empty before this call, so the collection now
        // holds exactly the one event just added.
        const body = JSON.parse(res.text);
        chai.expect(body.events.length).to.equal(1);
        chai.expect(body.events[0].title).to.equal('a test event');
        chai.expect(body.events[0].likes).to.equal(0);
        createdEventId = body.events[0]._id;
        chai.expect(createdEventId).to.be.a('string');
        return done();
      });

      });
  });


  describe('PUT /event/like', function() {
    it('likes an event', function(done) {
      request(app)
      .put('/event/like')
      .send({ id: createdEventId })
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        chai.expect(JSON.parse(res.text).events.find(x => x._id === createdEventId).likes).to.equal(1);
        return done();
      });

      });
  });


  describe('DELETE /event/like', function() {
    it('un-likes an event', function(done) {
      request(app)
      .delete('/event/like')
      .send({ id: createdEventId })
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        chai.expect(JSON.parse(res.text).events.find(x => x._id === createdEventId).likes).to.equal(0);
        return done();
      });

      });

    // Documents actual current behavior: changeLikes has no floor at 0
    // (see TEST_PLAN.md "App-level bug found"). This test pins today's
    // behavior rather than asserting the (unimplemented) intended one.
    it('goes below 0 when un-liking an event already at 0', function(done) {
      request(app)
      .delete('/event/like')
      .send({ id: createdEventId })
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        chai.expect(JSON.parse(res.text).events.find(x => x._id === createdEventId).likes).to.equal(-1);
        return done();
      });

      });
  });

  describe('GET /events when Firestore errors', function() {
    it('falls back to mock events', function(done) {
      FakeFirestore.lastInstance.failNextGet();
      request(app)
      .get('/events')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        const body = JSON.parse(res.text);
        chai.expect(body.events.length).to.equal(2);
        return done();
      });
    });
  });
