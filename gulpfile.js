/* eslint promise/prefer-await-to-then: 0 */
"use strict";

const gulp = require('gulp');
const Transpiler = require('./index').Transpiler;
const mocha = require('gulp-mocha');
const spawnWatcher = require('./index').spawnWatcher.use(gulp);
const boilerplate = require('./index').boilerplate.use(gulp);
const _ = require('lodash');
const B = require('bluebird');
const rimraf = B.promisify(require('rimraf'));
const exec = B.promisify(require('child_process').exec);
const glob = B.promisify(require('glob'));
const assert = require('assert');
const vinylPaths = require('vinyl-paths');
const del = require('del');


gulp.task('generate-lots-of-files', function () {
  return rimraf('test/generated/es7 build/generated').then(function () {
    return exec('mkdir -p test/generated/es7');
  }).then(function () {
    return B.all(
      _.times(24).map(function (i) {
        return exec(`cp test/fixtures/es7/lib/a.es7.js test/generated/es7/a${i + 1}.es7.js`);
      }));
  });
});

gulp.task('_transpile-lots-of-files', function () {
  let transpiler = new Transpiler();
  return gulp.src('test/generated/es7/**/*.js')
    .pipe(transpiler.stream())
    .on('error', spawnWatcher.handleError)
    .pipe(gulp.dest('build/generated'));
});

gulp.task('transpile-lots-of-files', gulp.series('generate-lots-of-files', '_transpile-lots-of-files'));

gulp.task('_test-transpile-lots-of-files', function testTranspileLotsOfFiles () {
  let numOfFiles;
  return glob('test/generated/es7/**/*.js').then(function (files) {
    numOfFiles = files.length;
    assert(numOfFiles > 16);
    return glob('build/generated/*.js');
  }).then(function (files) {
    assert(files.length === numOfFiles);
    return glob('build/generated/*.es7.js');
  }).then(function (files) {
    assert(files.length === 0);
  });
});

gulp.task('test-transpile-lots-of-files', gulp.series('transpile-lots-of-files', '_test-transpile-lots-of-files'));

gulp.task('clean-es7-fixtures', function () {
  return gulp
    .src('build', {read: false, allowEmpty: true})
    .pipe(vinylPaths(del));
});

gulp.task('_transpile-es7-fixtures', function () {
  let transpiler = new Transpiler();
  return gulp
    .src('test/fixtures/es7/**/*.js')
    .pipe(transpiler.stream())
    .on('error', spawnWatcher.handleError)
    .pipe(gulp.dest('build'));
});

gulp.task('transpile-es7-fixtures', gulp.series('clean-es7-fixtures', '_transpile-es7-fixtures'));

gulp.task('_test-es7-mocha', function () {
  return gulp.src('build/test/a-specs.js')
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});

gulp.task('test-es7-mocha', gulp.series('transpile-es7-fixtures', '_test-es7-mocha'));

gulp.task('_test-es7-mocha-throw', function () {
  return gulp.src('build/test/a-throw-specs.js')
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});

gulp.task('test-es7-mocha-throw', gulp.series('transpile-es7-fixtures', '_test-es7-mocha-throw'));

boilerplate({
  transpile: true,
  files: ['index.js', 'lib/**/*.js', 'test/**/*.js', '!test/fixtures/**', '!test/generated/**'],
  test: {
    files: ['${testDir}/**/*-specs.js', '!${testDir}/fixtures', '!${testDir}/**/*-e2e-specs.js'],
  },
  coverage: {
    files: ['test/**/*-specs.js', '!test/fixtures', '!test/**/*-e2e-specs.js', '!test/generated'],
    verbose: true,
  },
  buildName: 'Appium Gulp Plugins',
  extraDefaultTasks: ['e2e-test', 'test-transpile-lots-of-files', 'coverage'],
  testReporter: 'dot',
});