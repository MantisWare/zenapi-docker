# Zenapi Content Manager

## Description

This plugin allows you to manage your data through a UI.

## Contributing

NB: Please refers to the contributing section of the [monorepo](https://github.com/tysflotv/zenapi)

1. Create a new Zenapi application: `zenapi new myApp`.
2. Go to your new Zenapi app `cd myApp`.
3. Create a symlink to the monorepo plugin's folder `ln -s /path/to/zenapi/monorepo/packages/zenapi-plugin-content-manager ./plugins/content-manager`
3. Copy the layout SASS variables folder into your project from `admin/public/app/styles/variables` to `plugins/content-manager/public/app/styles/variables`
4. Start your app `zenapi start` (Don't forget to return to the root of your app's directory).


ln -s -f ./admin/public/app/styles/variables/variables.scss ./plugins/content-manager/public/app/styles/variables/variables.scss
