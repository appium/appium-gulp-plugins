'use strict';

const xcode = require('appium-xcode');
const path = require('path');
const log = require('fancy-log');
const cp = require('child_process');
const fs = require('fs');
const _rimraf = require('rimraf');
const B = require('bluebird');
const _ = require('lodash');


const MAX_BUFFER_SIZE = 524288;

const rimraf = B.promisify(_rimraf);
const renameFile = B.promisify(fs.rename, {context: fs});
const exec = B.promisify(cp.exec, {context: cp});

function configure (gulp, opts) {
  if (_.isEmpty(opts.iosApps)) {
    // nothing to do
    return;
  }

  // extract the paths from the enclosing package configuration
  const relativeLocations = opts.iosApps.relativeLocations;

  // figure out where things will go in the end
  const SDKS = {
    iphonesimulator: {
      name: 'iphonesimulator',
      buildPath: path.resolve('build', 'Release-iphonesimulator', opts.iosApps.appName),
      finalPath: relativeLocations.iphonesimulator
    },
    iphoneos: {
      name: 'iphoneos',
      buildPath: path.resolve('build', 'Release-iphoneos', opts.iosApps.appName),
      finalPath: relativeLocations.iphoneos
    }
  };

  // the sdks against which we will build
  let sdks = ['iphonesimulator'];
  if (process.env.IOS_REAL_DEVICE || process.env.REAL_DEVICE) {
    sdks.push('iphoneos');
  }

  let sdkVer;
  async function getIOSSDK () {
    if (!sdkVer) {
      try {
        sdkVer = await xcode.getMaxIOSSDK();
      } catch (err) {
        log(`Unable to get max iOS SDK: ${err.message}`);
        throw err;
      }
    }
    return sdkVer;
  }

  async function cleanApp (appRoot, sdk) {
    log(`Cleaning app for ${sdk} at app root '${appRoot}'`);
    try {
      const cmd = `xcodebuild -sdk ${sdk} clean`;
      await exec(cmd, {cwd: appRoot, maxBuffer: MAX_BUFFER_SIZE});
    } catch (err) {
      log(`Failed cleaning app: ${err.message}`);
      throw err;
    }
  }

  gulp.task('ios-apps:clean', async function cleanAll () {
    log('Cleaning all sdks');
    const sdkVer = await getIOSSDK();
    for (const sdk of sdks) {
      await cleanApp('.', sdk + sdkVer);
    }

    log('Deleting all apps');
    const apps = [
      SDKS.iphonesimulator.buildPath,
      SDKS.iphonesimulator.finalPath,
      SDKS.iphoneos.buildPath,
      SDKS.iphoneos.finalPath,
    ];
    for (const app of apps) {
      log(`Deleting app '${app}'`);
      await rimraf(app);
    }
  });

  async function buildApp (appRoot, sdk) {
    log(`Building app for ${sdk} at app root '${appRoot}'`);
    try {
      let cmd = `xcodebuild -sdk ${sdk}`;
      if (process.env.XCCONFIG_FILE) {
        cmd = `${cmd} -xcconfig ${process.env.XCCONFIG_FILE}`;
      }

      await exec(cmd, {cwd: appRoot, maxBuffer: MAX_BUFFER_SIZE});
    } catch (err) {
      log(`Failed building app: ${err.message}`);
      throw err;
    }
  }

  gulp.task('ios-apps:build', async function buildAll () {
    log('Building all apps');
    const sdkVer = await getIOSSDK();
    for (const sdk of sdks) {
      await buildApp('.', sdk + sdkVer);
    }
  });

  gulp.task('ios-apps:rename', async function () {
    log('Renaming apps');
    for (const sdk of sdks) {
      log(`Renaming for ${sdk}`);
      await renameFile(SDKS[sdk].buildPath, SDKS[sdk].finalPath);
    }
  });

  gulp.task('ios-apps:install', gulp.series('ios-apps:clean', 'ios-apps:build', 'ios-apps:rename'));
}

module.exports = {
  configure,
};
