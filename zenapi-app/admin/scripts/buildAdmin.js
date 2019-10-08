const shell = require('shelljs');
const path = require('path');

const pwd = shell.pwd();

const silent = process.env.npm_config_debug !== 'true';
const isDevelopmentMode = path.resolve(pwd.stdout).indexOf('zenapi-admin') !== -1;
const appPath = isDevelopmentMode ? path.resolve(process.env.PWD, '..') : path.resolve(pwd.stdout, '..');
const admin = path.resolve(appPath, 'admin');

// Setup Admin to Build
shell.echo('📦  Setup Admin Build Support...');
let inst = null; 
try{
  shell.cd(path.resolve(admin, 'node_modules', 'zenapi-helper-plugin'));
  inst = shell.exec('npm install', {silent});

  if (inst.stderr && inst.code !== 0) {
    console.error(inst.stderr);
    process.exit(1);
  } else {
    shell.echo('✅  Setup Admin: Success');
    shell.echo('');
  }
}catch(err){
  shell.echo('[ERROR]  Setup Admin: Failed: ', err);
}

// Build

shell.echo('🏗  Building the admin...');

shell.cd(path.resolve(appPath, 'admin'));
const build = shell.exec('npm run build:dev', {silent});

if (build.stderr && build.code !== 0) {
  console.error(build.stderr);
  process.exit(1);
}

shell.echo('✅  Success');
shell.echo('');