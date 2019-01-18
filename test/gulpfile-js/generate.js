'use strict';

const gulp = require('gulp');
const {
  Transpiler, TsTranspiler, spawnWatcher, isVerbose,
} = require('../../index');
const _ = require('lodash');
const B = require('bluebird');
const rimraf = B.promisify(require('rimraf'));
const exec = B.promisify(require('child_process').exec);
const glob = B.promisify(require('glob'));
const assert = require('assert');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');


const spawnWatch = spawnWatcher.use(gulp);

gulp.task('generate-lots-of-files', async function () {
  await rimraf('test/generated/es7 test/generated/ts build/generated');
  await exec('mkdir -p test/generated/es7');
  await exec('mkdir -p test/generated/ts');
  await B.all([
    ...(
      _.times(24).map(function (i) {
        return exec(`cp test/fixtures/es7/lib/a.es7.js test/generated/es7/a${i + 1}.es7.js`);
      })
    ),
    ...(
      _.times(24).map(function (i) {
        return exec(`cp test/fixtures/ts/lib/b.ts test/generated/ts/b${i + 1}.ts`);
      })
    ),
  ]);
});

gulp.task('transpile-lots-of-es7-files', function () {
  let transpiler = new Transpiler();
  return gulp.src('test/generated/es7/**/*.js')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(transpiler.stream())
    .on('error', spawnWatch.handleError)
    .pipe(gulp.dest('build/generated'));
});

gulp.task('transpile-lots-of-ts-files', function () {
  let transpiler = new TsTranspiler();
  return gulp.src('test/generated/ts/**/*.ts')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(transpiler.stream())
    .on('error', spawnWatch.handleError)
    .pipe(gulp.dest('build/generated'));
});

gulp.task('transpile-lots-of-files',
  gulp.series('generate-lots-of-files', 'transpile-lots-of-es7-files', 'transpile-lots-of-ts-files')
);

gulp.task('test-transpile-lots-of-es7-files', async function testTranspileLotsOfFiles () {
  let files = await glob('test/generated/es7/**/*.js');
  const numOfFiles = files.length;
  assert(numOfFiles > 16);

  files = await glob('build/generated/a*.js');
  assert(files.length === numOfFiles);

  files = await glob('build/generated/*.es7.js');
  assert(files.length === 0);
});

gulp.task('test-transpile-lots-of-ts-files', async function testTranspileLotsOfFiles () {
  let files = await glob('test/generated/ts/**/*.ts');
  const numOfFiles = files.length;
  assert(numOfFiles > 16);

  files = await glob('build/generated/b*.js');
  assert(files.length === numOfFiles);

  files = await glob('build/generated/*.ts');
  assert(files.length === 0);
});

gulp.task('test-transpile-lots-of-files',
  gulp.series('transpile-lots-of-files', 'test-transpile-lots-of-es7-files', 'test-transpile-lots-of-ts-files')
);
