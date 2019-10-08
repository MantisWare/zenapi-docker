const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

try {
  const startCWD = process.cwd();
  const plugins = fs.readdirSync(path.resolve(startCWD,'plugins'), 'utf8');

  // Zenapi Dep links for Plugins
  shell.echo('Linking Plugins: ');
  plugins.filter(pl => pl.indexOf('.') <= -1).forEach(pkg => {

    const pkgPath = path.resolve(startCWD, 'plugins', pkg, 'package.json');
    try{
      const pluginJSON = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      shell.cd(path.resolve(startCWD, 'plugins', pkg));

      shell.echo('- 📦 ' + pkg);

      // Link Zenapi Dep
      Object.keys(pluginJSON.dependencies || []).filter(dependency => dependency.indexOf('zenapi-') !== -1).forEach(dependency => {
        shell.exec(`npm link ${dependency}`, {silent:true});
      });

      // Link Zenapi DevDep
      if (pluginJSON.devDependencies) {
        Object.keys(pluginJSON.devDependencies || []).filter(devDependency => devDependency.indexOf('zenapi-') !== -1).forEach(devDependency => {
          shell.exec(`npm link ${devDependency}`, {silent:true});
        });
      }

    } catch(err){
      console.log('Skipping dir ' + pkg + ' ' + pkgPath);
      console.error(err);
    }

  });

  // Zenapi Dep Link for Admin
  const adminJSON = JSON.parse(fs.readFileSync(path.resolve(startCWD, 'admin', 'package.json'), 'utf8'));

  shell.cd(path.resolve(startCWD, 'admin'));

  shell.echo('⏳ Linking admin dependencies.');

  // Link Zenapi Dep
  Object.keys(adminJSON.dependencies || []).filter(dependency => dependency.indexOf('zenapi-') !== -1).forEach(dependency => {
    shell.exec(`npm link ${dependency}`, {silent:true});
  });

  // Link Zenapi DevDep
  if (adminJSON.devDependencies) {
    Object.keys(adminJSON.devDependencies || []).filter(devDependency => devDependency.indexOf('zenapi-') !== -1).forEach(devDependency => {
      shell.exec(`npm link ${devDependency}`, {silent:true});
    });
  }

  // Zenapi Dep Link
  const prjJSON = JSON.parse(fs.readFileSync(path.resolve(startCWD, 'package.json'), 'utf8'));

  shell.cd(path.resolve(startCWD));

  shell.echo('⏳ Linking main dependencies.');

  // Link Zenapi
  shell.exec(`npm link zenapi`, {silent:true});

  // Link Zenapi Dep
  Object.keys(prjJSON.dependencies || []).filter(dependency => dependency.indexOf('zenapi-') !== -1).forEach(dependency => {
    shell.exec(`npm link ${dependency}`, {silent:true});
  });

  // Link Zenapi DevDep
  if (prjJSON.devDependencies) {
    Object.keys(adminJSON.devDependencies || []).filter(devDependency => devDependency.indexOf('zenapi-') !== -1).forEach(devDependency => {
      shell.exec(`npm link ${devDependency}`, {silent:true});
    });
  }

  shell.echo('✅  Completed');

} catch (error) {
  console.error(error);
}
