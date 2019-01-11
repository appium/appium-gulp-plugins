/* eslint promise/prefer-await-to-then: 0 */
'use strict';

const gulp = require('gulp');
const Transpiler = require('../../index').Transpiler;
const TsTranspiler = require('../../index').TsTranspiler;
const spawnWatcher = require('../../index').spawnWatcher.use(gulp);
const isVerbose = require('../../index').isVerbose;
const _ = require('lodash');
const B = require('bluebird');
const rimraf = B.promisify(require('rimraf'));
const exec = B.promisify(require('child_process').exec);
const glob = B.promisify(require('glob'));
const assert = require('assert');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');


gulp.task('generate-lots-of-files', function () {
  return rimraf('test/generated/es7 test/generated/ts build/generated').then(function () {
    return exec('mkdir -p test/generated/es7');
  }).then(function () {
    return exec('mkdir -p test/generated/ts');
  }).then(function () {
    return B.all([
      ..._.times(24).map(function (i) {
        return exec(`cp test/fixtures/es7/lib/a.es7.js test/generated/es7/a${i + 1}.es7.js`);
      }),
      ..._.times(24).map(function (i) {
        return exec(`cp test/fixtures/ts/lib/b.ts test/generated/ts/b${i + 1}.ts`);
      }),
    ]);
  });
});

gulp.task('transpile-lots-of-es7-files', function () {
  let transpiler = new Transpiler();
  return gulp.src('test/generated/es7/**/*.js')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(transpiler.stream())
    .on('error', spawnWatcher.handleError)
    .pipe(gulp.dest('build/generated'));
});

gulp.task('transpile-lots-of-ts-files', function () {
  let transpiler = new TsTranspiler();
  return gulp.src('test/generated/ts/**/*.ts')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(transpiler.stream())
    .on('error', spawnWatcher.handleError)
    .pipe(gulp.dest('build/generated'));
});

gulp.task('transpile-lots-of-files',
  gulp.series('generate-lots-of-files', 'transpile-lots-of-es7-files', 'transpile-lots-of-ts-files')
);

gulp.task('test-transpile-lots-of-es7-files', function testTranspileLotsOfFiles () {
  let numOfFiles;
  return glob('test/generated/es7/**/*.js').then(function (files) {
    numOfFiles = files.length;
    assert(numOfFiles > 16);
    return glob('build/generated/a*.js');
  }).then(function (files) {
    assert(files.length === numOfFiles);
    return glob('build/generated/*.es7.js');
  }).then(function (files) {
    assert(files.length === 0);
  });
});

gulp.task('test-transpile-lots-of-ts-files', function testTranspileLotsOfFiles () {
  let numOfFiles;
  return glob('test/generated/ts/**/*.ts').then(function (files) {
    numOfFiles = files.length;
    assert(numOfFiles > 16);
    return glob('build/generated/b*.js');
  }).then(function (files) {
    assert(files.length === numOfFiles);
    return glob('build/generated/*.ts');
  }).then(function (files) {
    assert(files.length === 0);
  });
});

gulp.task('test-transpile-lots-of-files',
  gulp.series('transpile-lots-of-files', 'test-transpile-lots-of-es7-files', 'test-transpile-lots-of-ts-files')
);
