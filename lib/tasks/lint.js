'use strict';

const eslint = require('gulp-eslint');
const tslint = require('gulp-tslint');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const isVerbose = require('../utils').isVerbose;


const configure = function configure (gulp, opts) {
  gulp.task('eslint', function () {
    let opts = {
      fix: process.argv.includes('--fix'),
    };
    if (process.argv.includes('--lax-lint') || process.argv.includes('-ll')) {
      // when running tests, we want to be able to use exclusive tests
      // and console logging
      opts.rules = {
        'no-console': 0,
        'mocha/no-exclusive-tests': 0,
      };
    }
    return gulp
      .src(['**/*.js', '!node_modules/**', '!build/**'])
      .pipe(gulpIf(isVerbose(), debug()))
      .pipe(eslint(opts))
      .pipe(eslint.format())
      .pipe(eslint.failAfterError())
      .pipe(gulpIf((file) => file.eslint && file.eslint.fixed, gulp.dest(process.cwd())));
  });

  gulp.task('tslint', function () {
    return gulp
      .src(['**/*.ts', '!node_modules/**', '!build/**'])
      .pipe(gulpIf(isVerbose(), debug()))
      .pipe(tslint({}))
      .pipe(tslint.report())
      .pipe(eslint.failAfterError());
  });

  let lintTasks = [];
  if (opts.tslint) {
    lintTasks.push('tslint');
  }
  if (opts.eslint) {
    lintTasks.push('eslint');
  }
  if (lintTasks.length) {
    gulp.task('lint', gulp.series(lintTasks));
  }
};

module.exports = {
  configure,
};
