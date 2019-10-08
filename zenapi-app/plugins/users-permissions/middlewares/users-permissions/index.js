'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

module.exports = zenapi => {
  return {
    beforeInitialize: function() {
      zenapi.config.middleware.load.before.unshift('users-permissions');
    },

    initialize: function(cb) {
      _.forEach(zenapi.admin.config.routes, value => {
        if (_.get(value.config, 'policies')) {
          value.config.policies.unshift('plugins.users-permissions.permissions');
        }
      });

      _.forEach(zenapi.config.routes, value => {
        if (_.get(value.config, 'policies')) {
          value.config.policies.unshift('plugins.users-permissions.permissions');
        }
      });

      if (zenapi.plugins) {
        _.forEach(zenapi.plugins, (plugin, name) => {
          _.forEach(plugin.config.routes, value => {
            if (_.get(value.config, 'policies')) {
              value.config.policies.unshift('plugins.users-permissions.permissions');
            }
          });
        });
      }

      cb();
    }
  };
};
