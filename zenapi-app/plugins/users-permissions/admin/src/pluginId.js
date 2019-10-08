const pluginPkg = require('../../package.json');
const pluginId = pluginPkg.name.replace(
  /^zenapi-plugin-/i,
  ''
);

module.exports = pluginId;
