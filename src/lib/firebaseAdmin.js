'use strict';

const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT
    });
}

module.exports = admin;
