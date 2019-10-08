'use strict';

/**
 * Email.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');

const createDefaultEnvConfig = async (env) => {
  const pluginStore = zenapi.store({
    environment: env,
    type: 'plugin',
    name: 'email'
  });

  const provider = _.find(zenapi.plugins.email.config.providers, {provider: 'sendmail'});
  const value = _.assign({}, provider, {});

  await pluginStore.set({key: 'provider', value});
  return await zenapi.store({
    environment: env,
    type: 'plugin',
    name: 'email'
  }).get({key: 'provider'});
};

const getProviderConfig = async (env) => {
  let config = await zenapi.store({
    environment: env,
    type: 'plugin',
    name: 'email'
  }).get({key: 'provider'});

  if(!config) {
    config = await createDefaultEnvConfig(env);
  }

  return config;
};

module.exports = {
  getProviderConfig,
  send: async (options, config, cb) => {
    // Get email provider settings to configure the provider to use.
    if(!config) {
      config = await getProviderConfig(zenapi.config.environment);
    }

    const provider = _.find(zenapi.plugins.email.config.providers, { provider: config.provider });

    if (!provider) {
      throw new Error(`The provider package isn't installed. Please run \`npm install zenapi-provider-email-${config.provider}\``);
    }

    const actions = provider.init(config);

    // Execute email function of the provider for all files.
    return actions.send(options, cb);
  }
};
