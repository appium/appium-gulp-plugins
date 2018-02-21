"use strict";

const mocha = require('gulp-mocha');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const utils = require('../utils');


const isVerbose = utils.isVerbose;

const configure = function configure (gulp, opts, env) {
  const testFiles = utils.translatePaths([opts.test.files || opts.testFiles], env.fileAliases);
  gulp.task('_unit-test', function () {
    const mochaOpts = {
      reporter: utils.getTestReporter(opts),
      timeout: opts.testTimeout,
    };
    // set env so our code knows when it's being run in a test env
    process.env._TESTING = 1;
    return gulp
      .src(testFiles, {read: false})
      .pipe(gulpIf(isVerbose(), debug()))
      .pipe(mocha(mochaOpts))
      .once('error', function () {
        env.spawnWatcher.handleError();
      });
  });
  gulp.task('unit-test', gulp.series(...env.testDeps, '_unit-test'));
};

module.exports = {
  configure,
};