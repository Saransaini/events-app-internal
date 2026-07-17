'use strict';

const express = require('express');
const { GeoPoint } = require('@google-cloud/firestore');
const firestore = require('../lib/firestore');
const geohash = require('../lib/geohash');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const VALID_INTENTS = ['dating', 'playdate'];
const VALID_SEX = ['male', 'female'];

router.use(requireAuth);

// Full response for the signed-in user's own profile — includes email and
// exact location, neither of which should ever be sent to other users.
function toUserResponse(snapshot) {
    const data = snapshot.data();
    const response = { _id: snapshot.id, ...data };
    if (data.location) {
        response.location = { lat: data.location.latitude, lng: data.location.longitude };
    }
    return response;
}

// Response shape for any OTHER user (discover candidates, match participants,
// GET /:id) — omits email and raw location; distanceKm (when computed by the
// caller) is the only location-derived field ever exposed to other users.
function toPublicUserResponse(snapshot) {
    const data = snapshot.data();
    return {
        _id: snapshot.id,
        displayName: data.displayName,
        dog: data.dog,
        intents: data.intents || [],
        active: data.active,
    };
}

function buildDog(input, existingDog) {
    if (input === undefined) return existingDog;
    const { name, breed, age, sex, bio, photos } = input;
    if (!name) {
        throw Object.assign(new Error('dog.name is required'), { status: 400 });
    }
    if (sex !== undefined && sex !== null && !VALID_SEX.includes(sex)) {
        throw Object.assign(new Error(`dog.sex must be one of ${VALID_SEX.join(', ')}`), { status: 400 });
    }
    return {
        name,
        breed: breed || '',
        age: typeof age === 'number' ? age : null,
        sex: sex || null,
        bio: bio || '',
        photos: Array.isArray(photos) ? photos : [],
    };
}

router.post('/me', async (req, res, next) => {
    try {
        const { displayName, email, location, dog, intents } = req.body;

        const doc = {
            displayName: displayName || '',
            email: email || '',
            updatedAt: new Date(),
        };

        if (dog !== undefined) {
            doc.dog = buildDog(dog);
        }
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

        const ref = firestore.collection('users').doc(req.uid);
        const existing = await ref.get();
        if (!existing.exists) {
            doc.createdAt = new Date();
            doc.active = doc.dog ? true : false;
        } else if (doc.dog) {
            doc.active = true;
        }

        await ref.set(doc, { merge: true });
        const snapshot = await ref.get();
        res.json(toUserResponse(snapshot));
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
});

router.get('/me', async (req, res, next) => {
    try {
        const snapshot = await firestore.collection('users').doc(req.uid).get();
        if (!snapshot.exists) {
            return res.status(404).json({ message: 'User profile not found' });
        }
        res.json(toUserResponse(snapshot));
    } catch (err) {
        next(err);
    }
});

router.patch('/me', async (req, res, next) => {
    try {
        const ref = firestore.collection('users').doc(req.uid);
        const existing = await ref.get();
        if (!existing.exists) {
            return res.status(404).json({ message: 'User profile not found' });
        }

        const { displayName, location, dog, intents, active } = req.body;
        const doc = { updatedAt: new Date() };
        if (displayName !== undefined) doc.displayName = displayName;
        if (active !== undefined) doc.active = active;
        if (dog !== undefined) {
            doc.dog = buildDog(dog, existing.data().dog);
            doc.active = true;
        }
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
        res.json(toUserResponse(snapshot));
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
});

// Discover feed: nearby active people (each with a required dog profile),
// excluding the requester and anyone they've already swiped on. Intents are
// descriptive badges only now, not a filter dimension — a "dating" match
// that doesn't work out can still lead to a playdate, so there's no reason
// to split discovery by intent.
router.get('/discover', async (req, res, next) => {
    try {
        const { lat, lng, radiusKm, limit } = req.query;
        if (lat === undefined || lng === undefined) {
            return res.status(400).json({ message: 'lat and lng are required' });
        }

        const numLat = parseFloat(lat);
        const numLng = parseFloat(lng);
        const radius = radiusKm ? parseFloat(radiusKm) : 25;
        const cap = limit ? parseInt(limit, 10) : 25;

        const swipedSnapshot = await firestore.collection('swipes').where('swiperUid', '==', req.uid).get();
        const alreadySwipedIds = new Set(swipedSnapshot.docs.map((d) => d.data().targetUid));

        const candidateSnapshot = await firestore.collection('users').where('active', '==', true).limit(200).get();

        const origin = { lat: numLat, lng: numLng };
        const results = candidateSnapshot.docs
            .filter((doc) => doc.id !== req.uid)
            .filter((doc) => !alreadySwipedIds.has(doc.id))
            .map((doc) => {
                const response = toPublicUserResponse(doc);
                const location = doc.data().location;
                if (location) {
                    response.distanceKm = geohash.haversineDistanceKm(origin, {
                        lat: location.latitude,
                        lng: location.longitude,
                    });
                }
                return response;
            })
            .filter((user) => user.distanceKm === undefined || user.distanceKm <= radius)
            .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
            .slice(0, cap);

        res.json({ users: results });
    } catch (err) {
        next(err);
    }
});

// Public profile lookup for another user — used by the mobile client to show
// who a match is with (name + dog) so it's worth exposing beyond /me, but
// deliberately uses the same non-sensitive shape as /discover.
router.get('/:id', async (req, res, next) => {
    try {
        const snapshot = await firestore.collection('users').doc(req.params.id).get();
        if (!snapshot.exists) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(toPublicUserResponse(snapshot));
    } catch (err) {
        next(err);
    }
});

module.exports = router;
