/* eslint promise/prefer-await-to-then: 0 */
/* eslint promise/prefer-await-to-callbacks: 0 */
"use strict";

const mocha = require('gulp-mocha');
const B = require('bluebird');
const AndroidEmulator = require('appium-ci').AndroidEmulator;
const androidTools = require('appium-ci').androidTools;
const iosTools = require('appium-ci').iosTools;
const globby = require('globby');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const log = require('fancy-log');
const utils = require('../utils');


const isVerbose = utils.isVerbose;

const DEFAULT_XCODE_VERSION = '9.2';

const configure = function configure (gulp, opts, env) {
  const e2eTestFiles = utils.translatePaths([opts.e2eTest.files || opts.e2eTestFiles], env.fileAliases);
  gulp.task('_e2e-test', function () {
    const mochaOpts = {
      reporter: utils.getTestReporter(opts),
      timeout: opts.testTimeout,
      'require': opts.testRequire || [],
    };
    // set env so our code knows when it's being run in a test env
    process.env._TESTING = 1;

    const mochaCmd = function () {
      return new B(function (resolve, reject) {
        gulp
          .src(e2eTestFiles, {read: true, allowEmpty: true})
          .pipe(gulpIf(isVerbose(), debug()))
          .pipe(mocha(mochaOpts))
          .on('error', function (err) {
            reject(err);
          })
          .once('_result', function (...args) {
            resolve(...args);
          });
      });
    };

    let startupSeq = [];
    let cleanupSeq = [];
    let cleanupWarn = function (err) {
      log(`Error during cleanup, ignoring: ${err}`);
    };
    if (opts.e2eTest.android) {
      if (opts.e2eTest['android-emu']) {
        let emu = new AndroidEmulator(opts.e2eTest['android-avd']);
        startupSeq = [
          function () { return androidTools.killAll(); },
          function () { return new B(emu.start()); },
          function () { return emu.waitTillReady(); }
        ];
        cleanupSeq = cleanupSeq.concat([
          function () { return emu.stop(); },
          function () { return androidTools.killAll().catch(cleanupWarn); }
        ]);
      } else {
        startupSeq = [
          function () { return androidTools.killAll(); },
        ];
        cleanupSeq = cleanupSeq.concat([
          function () { return androidTools.killAll().catch(cleanupWarn); }
        ]);
      }
    }
    if (opts.e2eTest.ios) {
      let xCodeVersion = opts.e2eTest.xCodeVersion || DEFAULT_XCODE_VERSION;
      startupSeq = [
        function () { return iosTools.killAll(); },
        function () { return iosTools.configureXcode(xCodeVersion); },
        function () { return iosTools.resetSims(); },
      ];
      cleanupSeq = cleanupSeq.concat([
        function () { return iosTools.killAll().catch(cleanupWarn); }
      ]);
    }

    // go through the steps to run the test
    return startupSeq.reduce((step, promise) => promise.then(step), B.resolve())
      .then(function () {
        return globby(e2eTestFiles);
      })
      .then(function (files) {
        // gulp-mocha has an issue where, if there are no files passed from gulp.src,
        // it will just run everything it finds
        if (!files.length) {
          return;
        }
        return mochaCmd();
      })
      .then(function () {
        return cleanupSeq.reduce((step, promise) => promise.then(step), B.resolve())
          .finally(function () {
            if (opts.e2eTest.forceExit) {
              process.exit(0);
            }
          });
      }).catch(function () {
        return cleanupSeq.reduce((step, promise) => promise.then(step), B.resolve())
          .finally(function () {
            if (opts.e2eTest.forceExit) {
              process.exit(1);
            }
          });
      });
  });
  gulp.task('e2e-test', gulp.series(...env.testDeps, '_e2e-test'));
};

module.exports = {
  configure,
};