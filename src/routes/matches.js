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

// Deletes every message doc under matches/{matchId}/messages in batches
// (Firestore batch writes cap at 500 ops), so nothing is left behind.
async function purgeMessages(matchId) {
    const messagesRef = firestore.collection('matches').doc(matchId).collection('messages');
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const snapshot = await messagesRef.limit(500).get();
        if (snapshot.empty) return;
        const batch = firestore.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
    }
}

// Unmatching is permanent and total: there is no "unmatched" status kept
// around, and no chat history retained anywhere (not even server-side for
// abuse investigation) — the match doc and every message in it are deleted
// outright the moment either participant unmatches.
router.delete('/:id', async (req, res, next) => {
    try {
        const ref = firestore.collection('matches').doc(req.params.id);
        const snapshot = await ref.get();
        if (!snapshot.exists) {
            return res.status(404).json({ message: 'Match not found' });
        }
        if (!snapshot.data().uids.includes(req.uid)) {
            return res.status(403).json({ message: 'Not a participant in this match' });
        }

        await purgeMessages(req.params.id);
        await ref.delete();
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

module.exports = router;
