'use strict';

// Minimal in-memory stand-in for @google-cloud/firestore, implementing
// only the collection/doc/get/add/update surface server.js uses. Lets
// tests exercise the real server.js logic without a network call or an
// emulator.
class FakeFirestore {
  constructor() {
    this._collections = {};
    this._counter = 0;
    this._failNextGet = false;
    // server.js instantiates this once at module load; tests can reach
    // in via FakeFirestore.lastInstance to drive error paths without
    // re-requiring (and re-listen()ing) server.js.
    FakeFirestore.lastInstance = this;
  }

  failNextGet() {
    this._failNextGet = true;
  }

  collection(name) {
    if (!this._collections[name]) {
      this._collections[name] = {};
    }
    const store = this._collections[name];

    return {
      get: () => {
        if (this._failNextGet) {
          this._failNextGet = false;
          return Promise.reject(new Error('unavailable'));
        }
        return Promise.resolve({
          empty: Object.keys(store).length === 0,
          docs: Object.keys(store).map((id) => ({
            id,
            data: () => store[id]
          }))
        });
      },
      add: (obj) => {
        const id = `fake-id-${++this._counter}`;
        store[id] = obj;
        return Promise.resolve({ id });
      },
      doc: (id) => ({
        get: () => Promise.resolve({
          exists: Object.prototype.hasOwnProperty.call(store, id),
          data: () => store[id]
        }),
        update: (obj) => {
          store[id] = obj;
          return Promise.resolve();
        }
      })
    };
  }
}

module.exports = FakeFirestore;
