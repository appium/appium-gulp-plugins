"use strict";

var gulp = require('gulp'),
    Q = require('q'),
    del = Q.denodeify(require('del')),
    jshint = require('gulp-jshint'),
    jscs = require('gulp-jscs'),
    Transpiler = require('./index').Transpiler,
    mocha = require('gulp-mocha'),
    spawnWatcher = require('./index').spawnWatcher.use(gulp),
    runSequence = Q.denodeify(require('run-sequence').use(gulp));

var argv = require('yargs').count('flow').argv;

gulp.task('jscs', function () {
  return gulp
   .src(['*.js', 'lib/**/*.js', 'test/*.js'])
   .pipe(jscs())
   .on('error', spawnWatcher.handleError);
});

gulp.task('jshint', function () {
  return gulp
   .src(['*.js', 'lib/**/*.js', 'test/**/*.js'])
   .pipe(jshint())
   .pipe(jshint.reporter('jshint-stylish'))
   .pipe(jshint.reporter('fail'))
   .on('error', spawnWatcher.handleError);
});

gulp.task('lint',['jshint','jscs']);

gulp.task('del-build', function () {
  return del(['build']);
});

gulp.task('transpile-es7-fixtures', ['del-build'] , function () {
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

gulp.task('test', function () {
  return gulp.src(['test/**/*-specs.js', '!test/fixtures'])
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});

gulp.task('once', function () {
  return runSequence('lint', 'test');
});

spawnWatcher.clear(false);
spawnWatcher.configure('watch', ['index.js', 'lib/**/*.js','test/**/*.js','!test/fixtures'], function () {
  return runSequence('lint', 'test');
});

gulp.task('default', ['watch']);
