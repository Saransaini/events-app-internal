'use strict';

const admin = require('../lib/firebaseAdmin');

// Verifies `Authorization: Bearer <idToken>` via firebase-admin and attaches
// req.uid. In test env only, allows a `x-test-uid` header to bypass real
// token verification so route tests don't need live Firebase Auth tokens.
module.exports = async function requireAuth(req, res, next) {
    if (process.env.NODE_ENV === 'test' && req.headers['x-test-uid']) {
        req.uid = req.headers['x-test-uid'];
        return next();
    }

    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
        return res.status(401).json({ message: 'Missing Authorization bearer token' });
    }

    try {
        const decoded = await admin.auth().verifyIdToken(match[1]);
        req.uid = decoded.uid;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};
