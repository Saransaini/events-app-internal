'use strict';

const express = require('express');
const firestore = require('../lib/firestore');

const router = express.Router();

// mock events data - for a real solution this data should be coming
// from a cloud data store
const mockEvents = {
    events: [
        { title: 'an event', id: 1, description: 'something really cool', location: 'Joes pizza', likes: 0 },
        { title: 'another event', id: 2, description: 'something even cooler', location: 'Johns pizza', likes: 0 }
    ]
};

// health endpoint - returns an empty array
router.get('/', (req, res) => {
    res.json([]);
});

// version endpoint to provide easy convient method to demonstrating tests pass/fail
router.get('/version', (req, res) => {
    res.json({ version: '1.0.0' });
});

// responsible for retrieving events from firestore and adding
// firestore's generated id to the returned object
function getEvents(req, res) {
    firestore.collection('Events').get()
        .then((snapshot) => {
            if (!snapshot.empty) {
                const ret = { events: [] };
                snapshot.docs.forEach(element => {
                    //get data
                    const el = element.data();
                    //get internal firestore id
                    el._id = element.id;
                    //add object to array
                    ret.events.push(el);
                }, this);
                console.log(ret);
                res.json(ret);
            } else {
                // if no data has yet been added to firestore, return mock data
                res.json(mockEvents);
            }
        })
        .catch((err) => {
            console.error('Error getting events', err);
            res.json(mockEvents);
        });
};

// this has been modifed to call the shared getEvents method that
// returns data from firestore
router.get('/events', (req, res) => {
    getEvents(req, res);
});

// This has been modified to insert into firestore, and then call
// the shared getEvents method.
router.post('/event', (req, res) => {
    // create a new object from the json data. The id property
    // has been removed because it is no longer required.
    // Firestore generates its own unique ids
    const ev = {
        title: req.body.title,
        description: req.body.description,
        location: req.body.location,
        likes: 0
    }
    firestore.collection('Events').add(ev).then(ret => {
        // return events using shared method that adds __id
        getEvents(req, res);
    });
});

// function used by both like and unlike. If increment = true, a like is added.
// If increment is false, a like is removed.
function changeLikes(req, res, id, increment) {
    // return the existing objct
    firestore.collection('Events').doc(id).get()
        .then((snapshot) => {
            const el = snapshot.data();
            // if you have elements in firestore with no likes property
            if (!el.likes) {
                el.likes = 0;
            }
            // increment the likes
            if (increment) {
                el.likes++;
            }
            else {
                el.likes--;
            }
            // do the update
            firestore.collection('Events')
                .doc(id).update(el).then((ret) => {
                    // return events using shared method that adds __id
                    getEvents(req, res);
                });
        })
        .catch(err => { console.log(err) });
}

// put because this is an update. Passes through to shared method.
router.put('/event/like', (req, res) => {
    changeLikes(req, res, req.body.id, true);
});

// Passes through to shared method.
// Delete distinguishes this route from put above
router.delete('/event/like', (req, res) => {
    changeLikes(req, res, req.body.id, false);
});

module.exports = router;
