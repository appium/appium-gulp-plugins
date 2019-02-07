'use strict';

const gulp = require('gulp');
const mocha = require('gulp-mocha');
const { isVerbose, spawnWatcher } = require('../..');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');


gulp.task('test-ts-mocha:run', function () {
  return gulp.src('build/test/b-specs.js')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});

gulp.task('test-ts-mocha', gulp.series('transpile-ts-fixtures', 'test-ts-mocha:run'));

gulp.task('test-ts-mocha-throw:run', function () {
  return gulp.src('build/test/b-throw-specs.js')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});

gulp.task('test-ts-mocha-throw', gulp.series('transpile-ts-fixtures', 'test-ts-mocha-throw:run'));
