'use strict';

const firestore = require('../lib/firestore');

// A match is created once both people have liked each other. Unlike the
// earlier dog-to-dog design, every match here is reciprocal — there's no
// asymmetric "listing" case anymore since people (unlike shelter dogs) can
// always swipe back.
async function evaluate({ swiperUid, targetUid }) {
    const reciprocalId = `${targetUid}_${swiperUid}`;
    const reciprocal = await firestore.collection('swipes').doc(reciprocalId).get();
    if (!reciprocal.exists || reciprocal.data().direction !== 'like') {
        return { matched: false };
    }

    const sortedUids = [swiperUid, targetUid].sort();
    const matchId = `${sortedUids[0]}_${sortedUids[1]}`;
    const matchDoc = {
        uids: [swiperUid, targetUid],
        createdAt: new Date(),
    };

    const ref = firestore.collection('matches').doc(matchId);
    await ref.set(matchDoc, { merge: true });
    const snapshot = await ref.get();
    return { matched: true, match: { _id: snapshot.id, ...snapshot.data() } };
}

module.exports = { evaluate };
