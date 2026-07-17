'use strict';

const express = require('express');
const firestore = require('../lib/firestore');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.get('/mine', async (req, res, next) => {
    try {
        const snapshot = await firestore
            .collection('matches')
            .where('uids', 'array-contains', req.uid)
            .orderBy('createdAt', 'desc')
            .get();
        res.json({ matches: snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() })) });
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const snapshot = await firestore.collection('matches').doc(req.params.id).get();
        if (!snapshot.exists) {
            return res.status(404).json({ message: 'Match not found' });
        }
        if (!snapshot.data().uids.includes(req.uid)) {
            return res.status(403).json({ message: 'Not a participant in this match' });
        }
        res.json({ _id: snapshot.id, ...snapshot.data() });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
