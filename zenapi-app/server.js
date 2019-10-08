#!/usr/bin/env node
'use strict';

/**
 * Use `server.js` to run your application without `$ zenapi start`.
 * To start the server, run: `$ npm start`.
 *
 * This is handy in situations where the Zenapi CLI is not relevant or useful.
 */

process.chdir(__dirname);

(() => {
  const zenapi = require('zenapi');
  zenapi.start();
})();
