'use strict';

/**
 * Upload.js controller
 *
 * @description: A set of functions called "actions" of the `upload` plugin.
 */

const fs = require('fs');
const _ = require('lodash');

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

module.exports = {
  upload: async (ctx) => {
    // Retrieve provider configuration.
    const config = await zenapi.store({
      environment: zenapi.config.environment,
      type: 'plugin',
      name: 'upload'
    }).get({ key: 'provider' });

    // Verify if the file upload is enable.
    if (config.enabled === false) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Upload.status.disabled' }] }] : 'File upload is disabled');
    }

    // Extract optional relational data.
    const { refId, ref, source, field, path } = ctx.request.body.fields;
    const { files = {} } = ctx.request.body.files;

    if (_.isEmpty(files)) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Upload.status.empty' }] }] : 'Files are empty');
    }

    // Transform stream files to buffer
    const buffers = await zenapi.plugins.upload.services.upload.bufferize(ctx.request.body.files.files);
    const enhancedFiles = buffers.map(file => {
      if (file.size > config.sizeLimit) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Upload.status.sizeLimit', values: {file: file.name} }] }] : `${file.name} file is bigger than limit size!`);
      }

      // Add details to the file to be able to create the relationships.
      if (refId && ref && field) {
        Object.assign(file, {
          related: [{
            refId,
            ref,
            source,
            field
          }]
        });
      }

      // Update uploading folder path for the file.
      if (path) {
        Object.assign(file, {
          path
        });
      }

      return file;
    });

    // Something is wrong (size limit)...
    if (ctx.status === 400) {
      return;
    }

    const _uploadedFiles = await zenapi.plugins.upload.services.upload.upload(enhancedFiles, config);
    zenapi.log.debug('UPLOAD-Controller', '_uploadedFiles \n', _uploadedFiles);
    const uploadedFiles = [];
    await asyncForEach(_uploadedFiles, async (file) => {
      const res = await zenapi.plugins.upload.services.upload.add(file);

      zenapi.log.debug('UPLOAD-Controller', 'Done \n', res);

      // Remove temp file
      fs.unlinkSync(file.tmpPath);
      uploadedFiles.push(res);
    });

    zenapi.log.debug('UPLOAD-Controller', 'Files \n', uploadedFiles);

    // Send 200 `ok`
    ctx.send(uploadedFiles.map((file) => {
      // If is local server upload, add backend host as prefix
      if (file.url && file.url[0] === '/') {
        file.url = zenapi.config.url + file.url;
      }

      if (_.isArray(file.related)) {
        file.related = file.related.map(obj => obj.ref || obj);
      }

      return file;
    }));
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
    const config = await zenapi.store({
      environment: ctx.params.environment,
      type: 'plugin',
      name: 'upload'
    }).get({key: 'provider'});

    ctx.send({
      providers: zenapi.plugins.upload.config.providers,
      config
    });
  },

  updateSettings: async (ctx) => {
    await zenapi.store({
      environment: ctx.params.environment,
      type: 'plugin',
      name: 'upload'
    }).set({key: 'provider', value: ctx.request.body});

    ctx.send({ok: true});
  },

  find: async (ctx) => {
    const data = await zenapi.plugins['upload'].services.upload.fetchAll(ctx.query);

    // Send 200 `ok`
    ctx.send(data.map((file) => {
      // if is local server upload, add backend host as prefix
      if (file.url[0] === '/') {
        file.url = zenapi.config.url + file.url;
      }

      return file;
    }));
  },

  findOne: async (ctx) => {
    const data = await zenapi.plugins['upload'].services.upload.fetch(ctx.params);

    data.url = zenapi.config.url + data.url;

    // Send 200 `ok`
    ctx.send(data);
  },

  count: async (ctx) => {
    const data = await zenapi.plugins['upload'].services.upload.count(ctx.query);

    // Send 200 `ok`
    ctx.send({
      count: data
    });
  },

  destroy: async (ctx) => {
    const config = await zenapi.store({
      environment: zenapi.config.environment,
      type: 'plugin',
      name: 'upload'
    }).get({key: 'provider'});

    const data = await zenapi.plugins['upload'].services.upload.remove(ctx.params, config);

    // Send 200 `ok`
    ctx.send(data);
  },

  search: async (ctx) => {
    const data = await zenapi.query('file', 'upload').search(ctx.params);

    ctx.send(data);
  },
};
