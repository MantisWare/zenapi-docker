const fs = require('fs-extra');
const path = require('path');

// Find all plugins
try {
  const startCWD = process.cwd();
  const plugins = fs.readdirSync(path.resolve(startCWD,'plugins'), 'utf8');

  // Plugins First
  plugins.filter(pl => pl.indexOf('.') <= -1).forEach(pkg => {
    try{
      // Link Path
      const linkPath = path.resolve(startCWD, 'plugins', pkg);

      let linkTarget = fs.readlinkSync(linkPath, 'utf8');

      if(linkTarget){
        console.log('Creating: ', pkg);
        // delete symlink
        fs.unlinkSync(linkPath);
        // copy
        fs.copySync(linkTarget, linkPath);
      }
    } catch(err){
      console.log('Skipping ', pkg);
    }
  });

  // Then Admin
  try{
    // Link Path
    const linkAdminPath = path.resolve(startCWD, 'admin');

    let linkAdminTarget = fs.readlinkSync(linkAdminPath, 'utf8');

    if(linkAdminTarget){
      console.log('Creating: Admin');
      // delete symlink
      fs.unlinkSync(linkAdminPath);
      // copy
      fs.copySync(linkAdminTarget, linkAdminPath);
    }
  } catch(err){
    console.log('Skipping Admin');
  }

  console.log('You are now independant.');

}catch(err){
  console.error(err);
}