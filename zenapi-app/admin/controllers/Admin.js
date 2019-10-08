'use strict';

const path = require('path');
const shell = require('shelljs');
const _ = require('lodash');

/**
 * A set of functions called "actions" for `Admin`
 */

module.exports = {
  getCurrentEnvironment: async ctx => {
    try {
      ctx.send({ currentEnvironment: zenapi.app.env });
    } catch(err) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  getZenapiVersion: async ctx => {
    try {
      const zenapiVersion = _.get(zenapi.config, 'info.zenapi', null);
      return ctx.send({ zenapiVersion });
    } catch(err) {
      return ctx.badRequest(null, [{ messages: [{ id: 'The version is not available' }] }]);
    }
  },

  getGaConfig: async ctx => {
    try {
      ctx.send({ uuid: _.get(zenapi.config, 'uuid', false) });
    } catch(err) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  getLayout: async ctx => {
    try {
      const layout = require('../config/layout.js');

      return ctx.send({ layout });
    } catch(err) {
      return ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  installPlugin: async ctx => {
    try {
      const { plugin, port } = ctx.request.body;
      const zenapiBin = path.join(process.cwd(), 'node_modules', 'zenapi', 'bin', 'zenapi');

      zenapi.reload.isWatching = false;

      zenapi.log.info(`Installing ${plugin}...`);
      shell.exec(`node ${zenapiBin} install ${plugin} ${(port === '4000') ? '--dev' : ''}`, {silent: true});

      ctx.send({ ok: true });

      zenapi.reload(true);
    } catch(err) {
      zenapi.reload.isWatching = true;
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  plugins: async ctx => {
    try {
      const plugins = Object.keys(zenapi.plugins).reduce((acc, key) => {
        acc[key] = zenapi.plugins[key].package.zenapi;

        return acc;
      }, {});

      ctx.send({ plugins });
    } catch(err) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  uninstallPlugin: async ctx => {
    try {
      const { plugin } = ctx.params;
      const zenapiBin = path.join(process.cwd(), 'node_modules', 'zenapi', 'bin', 'zenapi');

      zenapi.reload.isWatching = false;

      zenapi.log.info(`Uninstalling ${plugin}...`);
      shell.exec(`node ${zenapiBin} uninstall ${plugin}`, {silent: true});

      ctx.send({ ok: true });

      zenapi.reload(true);
    } catch(err) {
      zenapi.reload.isWatching = true;
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  }
};
