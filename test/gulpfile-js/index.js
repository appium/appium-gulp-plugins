/* eslint promise/prefer-await-to-then: 0 */
'use strict';

const gulp = require('gulp');
const Transpiler = require('../../index').Transpiler;
const TsTranspiler = require('../../index').TsTranspiler;
const spawnWatcher = require('../../index').spawnWatcher.use(gulp);
const isVerbose = require('../../index').isVerbose;
const vinylPaths = require('vinyl-paths');
const del = require('del');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');


gulp.task('clean-fixtures', function () {
  return gulp
    .src('build', {read: false, allowEmpty: true})
    .pipe(vinylPaths(del));
});

gulp.task('transpile-es7-fixtures', function () {
  let transpiler = new Transpiler();
  return gulp
    .src('test/fixtures/es7/**/*.js')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(transpiler.stream())
    .on('error', spawnWatcher.handleError)
    .pipe(gulp.dest('build'));
});

gulp.task('transpile-ts-fixtures', function () {
  let transpiler = new TsTranspiler();
  return gulp
    .src('test/fixtures/ts/**/*.ts')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(transpiler.stream())
    .on('error', spawnWatcher.handleError)
    .pipe(gulp.dest('build'));
});

gulp.task('transpile-fixtures', gulp.series('clean-fixtures', 'transpile-es7-fixtures', 'transpile-ts-fixtures'));

require('./test-es7');
require('./test-ts');
require('./generate');
