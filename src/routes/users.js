'use strict';

const express = require('express');
const { GeoPoint } = require('@google-cloud/firestore');
const firestore = require('../lib/firestore');
const geohash = require('../lib/geohash');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

// create/upsert the current user's profile, called post-signup
router.post('/me', async (req, res, next) => {
    try {
        const { displayName, email, location } = req.body;
        const doc = {
            displayName: displayName || '',
            email: email || '',
            updatedAt: new Date()
        };
        if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
            doc.location = new GeoPoint(location.lat, location.lng);
            doc.geohash = geohash.encode(location.lat, location.lng);
        }
        const ref = firestore.collection('users').doc(req.uid);
        const existing = await ref.get();
        if (!existing.exists) {
            doc.createdAt = new Date();
        }
        await ref.set(doc, { merge: true });
        const snapshot = await ref.get();
        res.json({ _id: snapshot.id, ...snapshot.data() });
    } catch (err) {
        next(err);
    }
});

router.get('/me', async (req, res, next) => {
    try {
        const snapshot = await firestore.collection('users').doc(req.uid).get();
        if (!snapshot.exists) {
            return res.status(404).json({ message: 'User profile not found' });
        }
        res.json({ _id: snapshot.id, ...snapshot.data() });
    } catch (err) {
        next(err);
    }
});

router.patch('/me', async (req, res, next) => {
    try {
        const { displayName, location } = req.body;
        const doc = { updatedAt: new Date() };
        if (displayName !== undefined) doc.displayName = displayName;
        if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
            doc.location = new GeoPoint(location.lat, location.lng);
            doc.geohash = geohash.encode(location.lat, location.lng);
        }
        await firestore.collection('users').doc(req.uid).set(doc, { merge: true });
        const snapshot = await firestore.collection('users').doc(req.uid).get();
        res.json({ _id: snapshot.id, ...snapshot.data() });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
