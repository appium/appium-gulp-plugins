"use strict";

const eslint = require('gulp-eslint');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const isVerbose = require('../utils').isVerbose;


const configure = function configure (gulp, opts) {
  gulp.task('eslint', function () {
    return gulp
      .src(['**/*.js', '!node_modules/**', '!build/**'])
      .pipe(gulpIf(isVerbose(), debug()))
      .pipe(eslint({
        fix: process.argv.includes('--fix'),
      }))
      .pipe(eslint.format())
      .pipe(eslint.failAfterError())
      .pipe(gulpIf((file) => file.eslint && file.eslint.fixed, gulp.dest(process.cwd())));
  });

  let lintTasks = [];
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