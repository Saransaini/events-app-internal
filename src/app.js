'use strict';

// express is a nodejs web server
// https://www.npmjs.com/package/express
const express = require('express');

// converts content in the request into parameter req.body
// https://www.npmjs.com/package/body-parser
const bodyParser = require('body-parser');

const eventsRouter = require('./routes/events');
const usersRouter = require('./routes/users');
const dogsRouter = require('./routes/dogs');
const swipesRouter = require('./routes/swipes');
const matchesRouter = require('./routes/matches');
const errorHandler = require('./middleware/errorHandler');

// create the server
const app = express();
// the backend server will parse json, not a form request
app.use(bodyParser.json());

// allow AJAX calls from 3rd party domains
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, MERGE, GET, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

app.use(eventsRouter);
app.use('/users', usersRouter);
app.use('/dogs', dogsRouter);
app.use('/swipes', swipesRouter);
app.use('/matches', matchesRouter);

app.use(errorHandler);

module.exports = app;
