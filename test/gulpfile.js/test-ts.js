/* eslint promise/prefer-await-to-then: 0 */
'use strict';

const gulp = require('gulp');
const mocha = require('gulp-mocha');
const spawnWatcher = require('../../index').spawnWatcher.use(gulp);
const isVerbose = require('../../index').isVerbose;
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');


gulp.task('_test-ts-mocha', function () {
  return gulp.src('build/test/b-specs.js')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});

gulp.task('test-ts-mocha', gulp.series('transpile-ts-fixtures', '_test-ts-mocha'));

gulp.task('_test-ts-mocha-throw', function () {
  return gulp.src('build/test/b-throw-specs.js')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});

gulp.task('test-ts-mocha-throw', gulp.series('transpile-ts-fixtures', '_test-ts-mocha-throw'));
