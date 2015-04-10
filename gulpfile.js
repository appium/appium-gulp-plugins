"use strict";

var gulp = require('gulp'),
    Transpiler = require('./index').Transpiler,
    boilerplate = require('./index').boilerplate,
    mocha = require('gulp-mocha'),
    spawnWatcher = require('./index').spawnWatcher.use(gulp),
    boilerplate = require('./index').boilerplate.use(gulp);

var argv = require('yargs').count('flow').argv;

boilerplate({
  testFiles: ['test/**/*-specs.js', '!test/fixtures'],
  transpile: false,
  jscs: false,
  testReporter: 'spec',
  files: ["index.js", "lib/**/*.js", "test/**/*.js", "!test/fixtures"],
  buildName: "Appium Gulp Plugins"
});

gulp.task('transpile-es7-fixtures', ['clean'] , function () {
  var transpiler = new Transpiler(argv.flow ? {flow: true} : null);
  return gulp.src('test/fixtures/es7/**/*.js')
    .pipe(transpiler.stream())
    .on('error', spawnWatcher.handleError)
    .pipe(gulp.dest('build'));
});

gulp.task('test-es7-mocha', ['transpile-es7-fixtures'] , function () {
  return gulp.src('build/test/a-specs.js')
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});

gulp.task('test-es7-mocha-throw', ['transpile-es7-fixtures'] , function () {
  return gulp.src('build/test/a-throw-specs.js')
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});
