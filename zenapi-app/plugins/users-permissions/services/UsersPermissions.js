'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const request = require('request');

/**
 * UsersPermissions.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

module.exports = {
  createRole: async (params) => {
    if (!zenapi.plugins['content-manager']) {
      return new Error('This feature requires to install the Content Manager plugin');
    }

    if (!params.type) {
      params.type = _.snakeCase(_.deburr(_.toLower(params.name)));
    }

    const role = await zenapi.query('role', 'users-permissions').create(_.omit(params, ['users', 'permissions']));

    const arrayOfPromises = Object.keys(params.permissions).reduce((acc, type) => {
      Object.keys(params.permissions[type].controllers).forEach(controller => {
        Object.keys(params.permissions[type].controllers[controller]).forEach(action => {
          acc.push(zenapi.query('permission', 'users-permissions').addPermission({
            role: role._id || role.id,
            type,
            controller,
            action: action.toLowerCase(),
            ...params.permissions[type].controllers[controller][action]
          }));
        });
      });

      return acc;
    }, []);

    // Use Content Manager business logic to handle relation.
    arrayOfPromises.push(zenapi.plugins['content-manager'].services['contentmanager'].edit({
      id: role._id || role.id,
      model: 'role'
    }, {
      users: params.users
    }, 'users-permissions'));

    return await Promise.all(arrayOfPromises);
  },

  deleteRole: async (roleID, publicRoleID) => {
    const role = await zenapi.query('role', 'users-permissions').findOne({ id: roleID }, ['users', 'permissions']);

    if (!role) {
      throw new Error('Cannot found this role');
    }

    if (role.type === 'root') {
      return new Error(`You cannot delete the root admin role.`);
    }

    // Move users to guest role.
    const arrayOfPromises = role.users.reduce((acc, user) => {
      acc.push(zenapi.query('user', 'users-permissions').update({
        id: user._id || user.id
      }, {
        role: publicRoleID
      }));

      return acc;
    }, []);

    // Remove permissions related to this role.
    role.permissions.forEach(permission => {
      arrayOfPromises.push(zenapi.query('permission', 'users-permissions').delete({
        id: permission._id || permission.id
      }));
    });

    // Delete the role.
    arrayOfPromises.push(zenapi.query('role', 'users-permissions').delete({
      id: roleID
    }));

    return await Promise.all(arrayOfPromises);
  },

  getPlugins: (plugin, lang = 'en') => {
    return new Promise((resolve) => {
      resolve([]);
    });
  },

  getActions: (plugins = [], withInfo = true) => {
    const generateActions = (data) => (
      Object.keys(data).reduce((acc, key) => {
        if (_.isFunction(data[key])) {
          acc[key] = { enabled: false, policy: '' };
        }

        return acc;
      }, {}));

    const appControllers = Object.keys(zenapi.api || {})
      .filter(key => !!zenapi.api[key].controllers)
      .reduce((acc, key) => {
        Object.keys(zenapi.api[key].controllers).forEach((controller) => {
          acc.controllers[controller] = generateActions(zenapi.api[key].controllers[controller]);
        });

        return acc;
      }, { controllers: {} });

    const pluginsPermissions = Object.keys(zenapi.plugins).reduce((acc, key) => {
      const initialState = {
        controllers: {}
      };

      if (withInfo) {
        initialState.information = plugins.find(plugin => plugin.id === key) || {};
      }

      acc[key] = Object.keys(zenapi.plugins[key].controllers).reduce((obj, k) => {
        obj.controllers[k] = generateActions(zenapi.plugins[key].controllers[k]);

        return obj;

      }, initialState);

      return acc;
    }, {});

    const permissions = {
      application: {
        controllers: appControllers.controllers,
      },
    };

    return _.merge(permissions, pluginsPermissions);
  },

  getRole: async (roleID, plugins) => {
    const role = await zenapi.query('role', 'users-permissions').findOne({ id: roleID }, ['users', 'permissions']);

    if (!role) {
      throw new Error('Cannot found this role');
    }

    // Group by `type`.
    role.permissions = role.permissions.reduce((acc, permission) => {
      _.set(acc, `${permission.type}.controllers.${permission.controller}.${permission.action}`, {
        enabled: _.toNumber(permission.enabled) == true,
        policy: permission.policy
      });

      if (permission.type !== 'application' && !acc[permission.type].information) {
        acc[permission.type].information = plugins.find(plugin => plugin.id === permission.type) || {};
      }

      return acc;
    }, {});

    return role;
  },

  getRoles: async () => {
    const roles = await zenapi.query('role', 'users-permissions').find({ _sort: 'name' }, []);

    for (let i = 0; i < roles.length; ++i) {
      roles[i].id = roles[i].id || roles[i]._id;

      roles[i].nb_users = await zenapi.query('user', 'users-permissions').count({ 'role': roles[i].id });
    }

    return roles;
  },

  getRoutes: async () => {
    const routes = Object.keys(zenapi.api || {}).reduce((acc, current) => {
      return acc.concat(_.get(zenapi.api[current].config, 'routes', []));
    }, []);
    const clonedPlugins = _.cloneDeep(zenapi.plugins);
    const pluginsRoutes = Object.keys(clonedPlugins || {}).reduce((acc, current) => {
      const routes = _.get(clonedPlugins, [current, 'config', 'routes'], [])
        .reduce((acc, curr) => {
          const prefix = curr.config.prefix;
          const path = prefix !== undefined ? `${prefix}${curr.path}` : `/${current}${curr.path}`;
          _.set(curr, 'path', path);

          return acc.concat(curr);
        }, []);

      acc[current] = routes;

      return acc;
    }, {});

    return _.merge({ application: routes }, pluginsRoutes);
  },

  updatePermissions: async function (cb) {
    // fetch all the current permissions from the database, and format them into an array of actions.
    const databasePermissions = await zenapi.query('permission', 'users-permissions').find({ _limit: -1 });
    const actions = databasePermissions
      .map(permission => `${permission.type}.${permission.controller}.${permission.action}`);

    // Aggregate first level actions.
    const appActions = Object.keys(zenapi.api || {}).reduce((acc, api) => {
      Object.keys(_.get(zenapi.api[api], 'controllers', {}))
        .forEach(controller => {
          const actions = Object.keys(zenapi.api[api].controllers[controller])
            .filter(action => _.isFunction(zenapi.api[api].controllers[controller][action]))
            .map(action => `application.${controller}.${action.toLowerCase()}`);

          acc = acc.concat(actions);
        });

      return acc;
    }, []);

    // Aggregate plugins' actions.
    const pluginsActions = Object.keys(zenapi.plugins).reduce((acc, plugin) => {
      Object.keys(zenapi.plugins[plugin].controllers)
        .forEach(controller => {
          const actions = Object.keys(zenapi.plugins[plugin].controllers[controller])
            .filter(action => _.isFunction(zenapi.plugins[plugin].controllers[controller][action]))
            .map(action => `${plugin}.${controller}.${action.toLowerCase()}`);

          acc = acc.concat(actions);
        });

      return acc;
    }, []);

    // Merge array into one.
    const currentActions = appActions.concat(pluginsActions);
    // Count permissions available.
    const permissions = databasePermissions.length;

    // Compare to know if actions have been added or removed from controllers.
    if (!_.isEqual(actions, currentActions) || permissions < 1) {
      const splitted = (str) => {
        const [type, controller, action] = str.split('.');

        return { type, controller, action };
      };

      const defaultPolicy = (obj, role) => {
        const isCallback = obj.action === 'callback' && obj.controller === 'auth' && obj.type === 'users-permissions' && role.type === 'public';
        const isConnect = obj.action === 'connect' && obj.controller === 'auth' && obj.type === 'users-permissions';
        const isPassword = obj.action === 'forgotpassword' && obj.controller === 'auth' && obj.type === 'users-permissions' && role.type === 'public';
        const isRegister = obj.action === 'register' && obj.controller === 'auth' && obj.type === 'users-permissions' && role.type === 'public';
        const isConfirmation = obj.action === 'emailconfirmation' && obj.controller === 'auth' && obj.type === 'users-permissions' && role.type === 'public';
        const isNewPassword = obj.action === 'changepassword' && obj.controller === 'auth' && obj.type === 'users-permissions' && role.type === 'public';
        const isInit = obj.action === 'init' && obj.controller === 'userspermissions';
        const isMe = obj.action === 'me' && obj.controller === 'user' && obj.type === 'users-permissions';
        const isReload = obj.action === 'autoreload';
        const enabled = isCallback || isRegister || role.type === 'root' || isInit || isPassword || isNewPassword || isMe || isReload || isConnect || isConfirmation;

        return Object.assign(obj, { enabled, policy: '' });
      };

      // Retrieve roles
      const roles = await zenapi.query('role', 'users-permissions').find();

      // We have to know the difference to add or remove
      // the permissions entries in the database.
      const toRemove = _.difference(actions, currentActions).map(splitted);
      const toAdd = (permissions < 1 ? currentActions : _.difference(currentActions, actions))
        .map(splitted);

      // Execute request to update entries in database for each role.
      await Promise.all(
        roles.map(role =>
          Promise.all(
            toAdd
              .map(action => defaultPolicy(action, role))
              .map(action => zenapi.query('permission', 'users-permissions')
                .addPermission(Object.assign(action, { role: role.id || role._id }))
              )
          )
        ).concat([
          Promise.all(toRemove.map(action => zenapi.query('permission', 'users-permissions').removePermission(action)))
        ])
      );

      return this.writeActions(currentActions, cb);
    }

    cb();
  },

  removeDuplicate: async function () {
    const primaryKey = zenapi.query('permission', 'users-permissions').primaryKey;

    // Retrieve permissions by creation date (ID or ObjectID).
    const permissions = await zenapi.query('permission', 'users-permissions').find({
      _sort: `${primaryKey}`,
      _limit: -1
    });

  

    const value = permissions.reduce((acc, permission) => {
      const index = acc.toKeep.findIndex(element => element === `${permission.type}.controllers.${permission.controller}.${permission.action}.${permission.role[primaryKey]}`);

      if (index === -1) {
        acc.toKeep.push(`${permission.type}.controllers.${permission.controller}.${permission.action}.${permission.role[primaryKey]}`);
      } else {
        acc.toRemove.push(permission[primaryKey]);
      }

      return acc;
    }, {
      toKeep: [],
      toRemove: []
    });

    return zenapi.query('permission', 'users-permissions').deleteMany({
      [primaryKey]: value.toRemove
    });
  },

  initialize: async function (cb) {
    const roles = await zenapi.query('role', 'users-permissions').count();

    // It has already been initialized.
    if (roles > 0) {
      return await this.updatePermissions(async () => {
        await this.removeDuplicate();
        cb();
      });
    }

    // Create two first default roles.
    await Promise.all([
      zenapi.query('role', 'users-permissions').create({
        name: 'Administrator',
        description: 'These users have all access in the project.',
        type: 'root'
      }),
      zenapi.query('role', 'users-permissions').create({
        name: 'Authenticated',
        description: 'Default role given to authenticated user.',
        type: 'authenticated'
      }),
      zenapi.query('role', 'users-permissions').create({
        name: 'Public',
        description: 'Default role given to unauthenticated user.',
        type: 'public'
      })
    ]);

    await this.updatePermissions(cb);
  },

  updateRole: async function (roleID, body) {
    const [role, root, authenticated] = await Promise.all([
      this.getRole(roleID, []),
      zenapi.query('role', 'users-permissions').findOne({ type: 'root' }, []),
      zenapi.query('role', 'users-permissions').findOne({ type: 'authenticated' }, [])
    ]);

    const arrayOfPromises = Object.keys(body.permissions).reduce((acc, type) => {
      Object.keys(body.permissions[type].controllers).forEach(controller => {
        Object.keys(body.permissions[type].controllers[controller]).forEach(action => {
          const bodyAction = body.permissions[type].controllers[controller][action];
          const currentAction = _.get(role.permissions, `${type}.controllers.${controller}.${action}`, {});

          if (_.differenceWith([bodyAction], [currentAction]).length > 0) {
            acc.push(zenapi.query('permission', 'users-permissions').update({
              role: roleID,
              type,
              controller,
              action: action.toLowerCase()
            }, bodyAction));
          }
        });
      });

      return acc;
    }, []);

    arrayOfPromises.push(zenapi.query('role', 'users-permissions').update({
      id: roleID,
    }, _.pick(body, ['name', 'description'])));

    // stringify mongoDB _id for add/remove matching
    if (role._id ? '_id' : 'id' === '_id') {
      role.users.reduce((acc, user) => {
        const key = role._id ? '_id' : 'id';
        user[key] = user[key].toString();
        acc.push(user);
        return acc;
      }, []);
    }

    // Add user to this role.
    _.differenceBy(body.users, role.users, role._id ? '_id' : 'id')
      .filter(user => user.role !== `${root._id || root.id}`.toString())
      .forEach(user => {
        arrayOfPromises.push(this.updateUserRole(user, roleID));
      });

    // Remove user to this role and link him to authenticated.
    _.differenceBy(role.users, body.users, role._id ? '_id' : 'id')
      .filter(user => user.role !== `${root._id || root.id}`.toString())
      .forEach(user => {
        arrayOfPromises.push(this.updateUserRole(user, authenticated._id || authenticated.id));
      });

    return Promise.all(arrayOfPromises);
  },

  updateUserRole: async (user, role) => {
    return zenapi.query('user', 'users-permissions').update({
      id: user._id || user.id
    }, {
      role: role.toString()
    });
  },

  writeActions: (data, cb) => {
    const actionsPath = path.join(zenapi.config.appPath, 'plugins', 'users-permissions', 'config', 'actions.json');

    try {
      // Disable auto-reload.
      zenapi.reload.isWatching = false;
      if (!zenapi.config.currentEnvironment.server.production) {
        // Rewrite actions.json file.
        fs.writeFileSync(actionsPath, JSON.stringify({ actions: data }), 'utf8');
      }
      // Set value to AST to avoid restart.
      _.set(zenapi.plugins['users-permissions'], 'config.actions', data);
      // Disable auto-reload.
      zenapi.reload.isWatching = true;

      cb();
    } catch(err) {
      zenapi.log.error(err);
    }
  },

  template: (layout, data) => {
    const compiledObject = _.template(layout);
    return compiledObject(data);
  }
};
