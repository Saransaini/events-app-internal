'use strict';

// bring in firestore
const Firestore = require('@google-cloud/firestore');

// configure with current project
const firestore = new Firestore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT
});

module.exports = firestore;
