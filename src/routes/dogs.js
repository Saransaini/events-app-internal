'use strict';

const express = require('express');
const { GeoPoint } = require('@google-cloud/firestore');
const firestore = require('../lib/firestore');
const geohash = require('../lib/geohash');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const VALID_INTENTS = ['playdate', 'breeding', 'adoption'];

router.use(requireAuth);

function toDogResponse(snapshot) {
    const data = snapshot.data();
    const response = { _id: snapshot.id, ...data };
    if (data.location) {
        response.location = { lat: data.location.latitude, lng: data.location.longitude };
    }
    return response;
}

router.post('/', async (req, res, next) => {
    try {
        const { name, bio, breed, age, sex, photos, intents, location } = req.body;
        if (!name || !Array.isArray(intents) || intents.length === 0) {
            return res.status(400).json({ message: 'name and at least one intent are required' });
        }
        if (!intents.every((i) => VALID_INTENTS.includes(i))) {
            return res.status(400).json({ message: `intents must be a subset of ${VALID_INTENTS.join(', ')}` });
        }

        const doc = {
            ownerId: req.uid,
            name,
            bio: bio || '',
            breed: breed || '',
            age: typeof age === 'number' ? age : null,
            sex: sex || null,
            photos: Array.isArray(photos) ? photos : [],
            intents,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
            doc.location = new GeoPoint(location.lat, location.lng);
            doc.geohash = geohash.encode(location.lat, location.lng);
        }

        const ref = await firestore.collection('dogs').add(doc);
        const snapshot = await ref.get();
        res.status(201).json(toDogResponse(snapshot));
    } catch (err) {
        next(err);
    }
});

router.get('/mine', async (req, res, next) => {
    try {
        const snapshot = await firestore.collection('dogs').where('ownerId', '==', req.uid).get();
        res.json({ dogs: snapshot.docs.map(toDogResponse) });
    } catch (err) {
        next(err);
    }
});

// Candidate deck for swiping: filters by shared intent + a geohash bounding
// box around (lat, lng), excludes the requester's own dogs and any dog
// already swiped on (checked in-memory against the swipes collection since
// Firestore can't efficiently do a server-side "not in" exclusion here).
// Registered before /:id so "discover" isn't captured as a dog id param.
router.get('/discover', async (req, res, next) => {
    try {
        const { dogId, intent, lat, lng, radiusKm, limit } = req.query;
        if (!dogId || !intent || lat === undefined || lng === undefined) {
            return res.status(400).json({ message: 'dogId, intent, lat, and lng are required' });
        }
        if (!VALID_INTENTS.includes(intent)) {
            return res.status(400).json({ message: `intent must be one of ${VALID_INTENTS.join(', ')}` });
        }

        const numLat = parseFloat(lat);
        const numLng = parseFloat(lng);
        const radius = radiusKm ? parseFloat(radiusKm) : 25;
        const cap = limit ? parseInt(limit, 10) : 25;

        const swipedSnapshot = await firestore.collection('swipes').where('swiperDogId', '==', dogId).get();
        const alreadySwipedIds = new Set(swipedSnapshot.docs.map((d) => d.data().targetDogId));

        const candidateSnapshot = await firestore
            .collection('dogs')
            .where('intents', 'array-contains', intent)
            .where('active', '==', true)
            .limit(200)
            .get();

        const origin = { lat: numLat, lng: numLng };
        const results = candidateSnapshot.docs
            .filter((doc) => doc.id !== dogId)
            .filter((doc) => doc.data().ownerId !== req.uid)
            .filter((doc) => !alreadySwipedIds.has(doc.id))
            .map((doc) => {
                const response = toDogResponse(doc);
                if (response.location) {
                    response.distanceKm = geohash.haversineDistanceKm(origin, response.location);
                }
                return response;
            })
            .filter((dog) => dog.distanceKm === undefined || dog.distanceKm <= radius)
            .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
            .slice(0, cap);

        res.json({ dogs: results });
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const snapshot = await firestore.collection('dogs').doc(req.params.id).get();
        if (!snapshot.exists) {
            return res.status(404).json({ message: 'Dog not found' });
        }
        res.json(toDogResponse(snapshot));
    } catch (err) {
        next(err);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const ref = firestore.collection('dogs').doc(req.params.id);
        const existing = await ref.get();
        if (!existing.exists) {
            return res.status(404).json({ message: 'Dog not found' });
        }
        if (existing.data().ownerId !== req.uid) {
            return res.status(403).json({ message: 'You do not own this dog profile' });
        }

        const { name, bio, breed, age, sex, photos, intents, location, active } = req.body;
        const doc = { updatedAt: new Date() };
        if (name !== undefined) doc.name = name;
        if (bio !== undefined) doc.bio = bio;
        if (breed !== undefined) doc.breed = breed;
        if (age !== undefined) doc.age = age;
        if (sex !== undefined) doc.sex = sex;
        if (photos !== undefined) doc.photos = photos;
        if (active !== undefined) doc.active = active;
        if (intents !== undefined) {
            if (!Array.isArray(intents) || !intents.every((i) => VALID_INTENTS.includes(i))) {
                return res.status(400).json({ message: `intents must be a subset of ${VALID_INTENTS.join(', ')}` });
            }
            doc.intents = intents;
        }
        if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
            doc.location = new GeoPoint(location.lat, location.lng);
            doc.geohash = geohash.encode(location.lat, location.lng);
        }

        await ref.set(doc, { merge: true });
        const snapshot = await ref.get();
        res.json(toDogResponse(snapshot));
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const ref = firestore.collection('dogs').doc(req.params.id);
        const existing = await ref.get();
        if (!existing.exists) {
            return res.status(404).json({ message: 'Dog not found' });
        }
        if (existing.data().ownerId !== req.uid) {
            return res.status(403).json({ message: 'You do not own this dog profile' });
        }
        await ref.set({ active: false, updatedAt: new Date() }, { merge: true });
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

module.exports = router;
