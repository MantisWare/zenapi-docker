'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */

const path = require('path');
const fs = require('fs');
const _ = require('lodash');

module.exports = async cb => {
  // set plugin store
  const pluginStore = zenapi.store({
    environment: zenapi.config.environment,
    type: 'plugin',
    name: 'email'
  });

  zenapi.plugins.email.config.providers = [];

  const loadProviders = (basePath, cb) => {
    fs.readdir(path.join(basePath, 'node_modules'), async (err, node_modules) => {
      // get all email providers
      const emails = _.filter(node_modules, (node_module) => {
        // DEPRECATED zenapi-email-* will be remove in next version
        return _.startsWith(node_module, 'zenapi-provider-email') || _.startsWith(node_module, 'zenapi-email');
      });

      node_modules.filter((node_module) => {
        return node_module.startsWith('@');
      })
        .forEach((orga) => {
          const node_modules = fs.readdirSync(path.join(basePath, 'node_modules', orga));

          node_modules.forEach((node_module) => {
            // DEPRECATED zenapi-email-* will be remove in next version
            if (_.startsWith(node_module, 'zenapi-provider-email') || _.startsWith(node_module, 'zenapi-email')) {
              emails.push(`${orga}/${node_module}`);
            }
          });
        });

      // mount all providers to get configs
      _.forEach(emails, (node_module) => {
        zenapi.plugins.email.config.providers.push(
          require(path.join(`${basePath}/node_modules/${node_module}`))
        );
      });

      try {
        // if provider config not exist set one by default
        const config = await pluginStore.get({key: 'provider'});

        if (!config) {
          const provider = _.find(zenapi.plugins.email.config.providers, {provider: 'sendmail'});

          const value = _.assign({}, provider, {
            // TODO: set other default settings here
          });

          await pluginStore.set({key: 'provider', value});
        }
      } catch (err) {
        zenapi.log.error(`Can't load ${config.provider} email provider.`);
        zenapi.log.warn(`Please install zenapi-provider-email-${config.provider} --save in ${path.join(zenapi.config.appPath, 'plugins', 'email')} folder.`);
        zenapi.stop();
      }

      cb();
    });
  };

  // Load providers from the plugins' node_modules.
  loadProviders(path.join(zenapi.config.appPath, 'plugins', 'email'), () => {
    // Load providers from the root node_modules.
    loadProviders(path.join(zenapi.config.appPath), cb);
  });

};
