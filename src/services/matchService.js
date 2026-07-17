'use strict';

const firestore = require('../lib/firestore');

// Decides whether a "like" swipe creates a match, and creates it.
//
// playdate/breeding are reciprocal: a match is only created once both dogs
// have liked each other.
//
// adoption is asymmetric: the target dog is a listing that can't swipe back,
// so a single like immediately creates a match connecting the liker's owner
// to the listing's owner.
async function evaluate({ swiperDog, targetDog, intent }) {
    const isAdoption = intent === 'adoption';

    if (!isAdoption) {
        const reciprocalId = `${targetDog.id}_${swiperDog.id}`;
        const reciprocal = await firestore.collection('swipes').doc(reciprocalId).get();
        if (!reciprocal.exists || reciprocal.data().direction !== 'like') {
            return { matched: false };
        }
    }

    const matchDoc = {
        dogAId: isAdoption ? targetDog.id : swiperDog.id,
        dogBId: isAdoption ? swiperDog.id : targetDog.id,
        ownerAId: isAdoption ? targetDog.data().ownerId : swiperDog.data().ownerId,
        ownerBId: isAdoption ? swiperDog.data().ownerId : targetDog.data().ownerId,
        ownerIds: [swiperDog.data().ownerId, targetDog.data().ownerId],
        intent,
        type: isAdoption ? 'asymmetric' : 'reciprocal',
        status: 'active',
        createdAt: new Date()
    };

    const sortedIds = [swiperDog.id, targetDog.id].sort();
    const matchId = `${sortedIds[0]}_${sortedIds[1]}_${intent}`;
    const ref = firestore.collection('matches').doc(matchId);
    await ref.set(matchDoc, { merge: true });
    const snapshot = await ref.get();
    return { matched: true, match: { _id: snapshot.id, ...snapshot.data() } };
}

module.exports = { evaluate };
