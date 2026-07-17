'use strict';

const app = require('./src/app');

// only start listening when this file is run directly (npm start), not when
// required as a module (e.g. by test/test-server.js via require('../server'))
if (require.main === module) {
    const PORT = process.env.PORT ? process.env.PORT : 8082;
    const server = app.listen(PORT, () => {
        const host = server.address().address;
        const port = server.address().port;

        console.log(`Events app listening at http://${host}:${port}`);
    });
}

module.exports = app;
