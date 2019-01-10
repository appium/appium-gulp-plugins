/* eslint promise/prefer-await-to-then: 0 */
'use strict';

const gulp = require('gulp');
const mocha = require('gulp-mocha');
const spawnWatcher = require('../../index').spawnWatcher.use(gulp);
const isVerbose = require('../../index').isVerbose;
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');


gulp.task('_test-es7-mocha', function () {
  return gulp.src('build/test/a-specs.js')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});

gulp.task('test-es7-mocha', gulp.series('transpile-es7-fixtures', '_test-es7-mocha'));

gulp.task('_test-es7-mocha-throw', function () {
  return gulp.src('build/test/a-throw-specs.js')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});

gulp.task('test-es7-mocha-throw', gulp.series('transpile-es7-fixtures', '_test-es7-mocha-throw'));
