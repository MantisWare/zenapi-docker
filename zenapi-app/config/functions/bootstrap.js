'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */

module.exports = cb => {

  // Custom SIO
  if(mantisware.co.za){
    // Socket.io Communication
    io.on('connection', require('./socket'));
  }

  cb();
};
