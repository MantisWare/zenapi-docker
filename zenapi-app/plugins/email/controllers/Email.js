'use strict';

/**
 * Email.js controller
 *
 * @description: A set of functions called "actions" of the `email` plugin.
 */

const _ = require('lodash');

module.exports = {
  send: async (ctx) => {
    // Retrieve provider configuration.
    const config = await zenapi.store({
      environment: zenapi.config.environment,
      type: 'plugin',
      name: 'email'
    }).get({ key: 'provider' });

    // Verify if the file email is enable.
    if (config.enabled === false) {
      zenapi.log.error('Email is disabled');
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Email.status.disabled' }] }] : 'Emailis disabled');
    }

    // Something is wrong
    if (ctx.status === 400) {
      return;
    }

    let options = ctx.request.body;

    await zenapi.plugins.email.services.email.send(options, config);

    // Send 200 `ok`
    ctx.send({});
  },

  getEnvironments: async (ctx) => {
    const environments =  _.map(_.keys(zenapi.config.environments), environment => {
      return {
        name: environment,
        active: (zenapi.config.environment === environment)
      };
    });

    ctx.send({ environments });
  },

  getSettings: async (ctx) => {
    let config = await zenapi.plugins.email.services.email.getProviderConfig(ctx.params.environment);

    ctx.send({
      providers: zenapi.plugins.email.config.providers,
      config
    });
  },

  updateSettings: async (ctx) => {
    await zenapi.store({
      environment: ctx.params.environment,
      type: 'plugin',
      name: 'email'
    }).set({key: 'provider', value: ctx.request.body});

    ctx.send({ok: true});
  },
};
