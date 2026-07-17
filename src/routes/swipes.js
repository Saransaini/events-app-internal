'use strict';

const express = require('express');
const firestore = require('../lib/firestore');
const requireAuth = require('../middleware/requireAuth');
const matchService = require('../services/matchService');

const router = express.Router();
const VALID_INTENTS = ['playdate', 'breeding', 'adoption'];

router.use(requireAuth);

router.post('/', async (req, res, next) => {
    try {
        const { swiperDogId, targetDogId, intent, direction } = req.body;
        if (!swiperDogId || !targetDogId || !intent || !direction) {
            return res.status(400).json({ message: 'swiperDogId, targetDogId, intent, and direction are required' });
        }
        if (!VALID_INTENTS.includes(intent)) {
            return res.status(400).json({ message: `intent must be one of ${VALID_INTENTS.join(', ')}` });
        }
        if (!['like', 'pass'].includes(direction)) {
            return res.status(400).json({ message: 'direction must be "like" or "pass"' });
        }

        const swiperSnapshot = await firestore.collection('dogs').doc(swiperDogId).get();
        if (!swiperSnapshot.exists || swiperSnapshot.data().ownerId !== req.uid) {
            return res.status(403).json({ message: 'You do not own the swiping dog profile' });
        }
        const targetSnapshot = await firestore.collection('dogs').doc(targetDogId).get();
        if (!targetSnapshot.exists) {
            return res.status(404).json({ message: 'Target dog not found' });
        }

        const swipeId = `${swiperDogId}_${targetDogId}`;
        await firestore.collection('swipes').doc(swipeId).set(
            {
                swiperDogId,
                swiperOwnerId: req.uid,
                targetDogId,
                targetOwnerId: targetSnapshot.data().ownerId,
                intent,
                direction,
                createdAt: new Date()
            },
            { merge: true }
        );

        if (direction !== 'like') {
            return res.json({ matched: false });
        }

        const result = await matchService.evaluate({
            swiperDog: swiperSnapshot,
            targetDog: targetSnapshot,
            intent
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
