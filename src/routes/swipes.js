'use strict';

const express = require('express');
const firestore = require('../lib/firestore');
const requireAuth = require('../middleware/requireAuth');
const matchService = require('../services/matchService');

const router = express.Router();

router.use(requireAuth);

router.post('/', async (req, res, next) => {
    try {
        const { targetUid, direction } = req.body;
        if (!targetUid || !direction) {
            return res.status(400).json({ message: 'targetUid and direction are required' });
        }
        if (!['like', 'pass'].includes(direction)) {
            return res.status(400).json({ message: 'direction must be "like" or "pass"' });
        }
        if (targetUid === req.uid) {
            return res.status(400).json({ message: 'Cannot swipe on yourself' });
        }

        const targetSnapshot = await firestore.collection('users').doc(targetUid).get();
        if (!targetSnapshot.exists) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        const swipeId = `${req.uid}_${targetUid}`;
        await firestore.collection('swipes').doc(swipeId).set(
            {
                swiperUid: req.uid,
                targetUid,
                direction,
                createdAt: new Date(),
            },
            { merge: true }
        );

        if (direction !== 'like') {
            return res.json({ matched: false });
        }

        const result = await matchService.evaluate({ swiperUid: req.uid, targetUid });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
