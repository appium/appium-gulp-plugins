'use strict';

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


const { isVerbose } = utils;

const DEFAULT_XCODE_VERSION = '9.2';

const configure = function configure (gulp, opts, env) {
  const e2eTestFiles = utils.translatePaths([opts.e2eTest.files || opts.e2eTestFiles], env.fileAliases);
  gulp.task('e2e-test:run', async function e2eTestRun () {
    const mochaOpts = {
      reporter: utils.getTestReporter(opts),
      timeout: opts.testTimeout,
      'require': opts.testRequire || [],
      exit: true,
      traceWarnings: opts.e2eTest.traceWarnings,
      traceDeprecation: opts.e2eTest.traceWarnings,
    };
    // set env so our code knows when it's being run in a test env
    process.env._TESTING = 1;

    const mochaCmd = function () {
      return new B(function runCmd (resolve, reject) {
        gulp
          .src(e2eTestFiles, {read: true, allowEmpty: true})
          .pipe(gulpIf(isVerbose(), debug()))
          .pipe(mocha(mochaOpts))
          .on('error', function onError (err) {
            reject(err);
          })
          .once('_result', function onResult (...args) {
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
          function killAllEmus () { return androidTools.killAll(); },
          function startNewEmu () { return new B(emu.start()); },
          function waitForEmu () { return emu.waitTillReady(); }
        ];
        cleanupSeq = cleanupSeq.concat([
          function stopEmu () { return emu.stop(); },
          function killAllEmus () { return androidTools.killAll().catch(cleanupWarn); }
        ]);
      } else {
        startupSeq = [
          function killAllEmus () { return androidTools.killAll(); },
        ];
        cleanupSeq = cleanupSeq.concat([
          function killAllEmus () { return androidTools.killAll().catch(cleanupWarn); }
        ]);
      }
    }
    if (opts.e2eTest.ios) {
      const xCodeVersion = opts.e2eTest.xCodeVersion || DEFAULT_XCODE_VERSION;
      startupSeq = [
        function killAllSims () { return iosTools.killAll(); },
        function configureXcode () { return iosTools.configureXcode(xCodeVersion); },
        function resetSim () { return iosTools.resetSims(); },
      ];
      cleanupSeq = cleanupSeq.concat([
        function killAllSims () { return iosTools.killAll().catch(cleanupWarn); }
      ]);
    }

    try {
      // go through the steps to run the test
      await B.each(startupSeq, async (step) => await step());
      const files = await globby(e2eTestFiles);
      // gulp-mocha has an issue where, if there are no files passed from gulp.src,
      // it will just run everything it finds
      if (!files.length) {
        log(`No e2e test files found using '${e2eTestFiles}'`);
        return;
      }
      await mochaCmd();
      await B.each(cleanupSeq, async (step) => await step());
    } catch (err) {
      try {
        await B.each(cleanupSeq, async (step) => await step());
      } finally {
        env.spawnWatcher.handleError(err);
      }
    } finally {
      if (opts.e2eTest.forceExit) {
        process.exit(0);
      }
    }
  });
  gulp.task('e2e-test', gulp.series(env.testDeps, 'e2e-test:run'));
};

module.exports = {
  configure,
};
