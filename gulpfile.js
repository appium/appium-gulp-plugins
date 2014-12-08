var gulp = require('gulp'),
    Q = require('q'),
    del = Q.denodeify(require('del')),
    transpile = require('./index').gulpTranspile,
    mocha = require('gulp-mocha'),
    spawnWatcher = require('./index').spawnWatcher.use(gulp),
    runSequence = Q.denodeify(require('run-sequence').use(gulp));

gulp.task('del-build', function (cb) {
  return del(['build']);
});

gulp.task('transpile-es7-fixtures', ['del-build'] , function () {
  return gulp.src('test/fixtures/es7/**/*.js')
    .pipe(transpile())
    .on('error', spawnWatcher.handleError)
    .pipe(gulp.dest('build'));
});

gulp.task('test-es7-mocha', ['transpile-es7-fixtures'] , function () {
  process.env.SKIP_TRACEUR_RUNTIME = true;
  return gulp.src('build/test/a-specs.js')
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});

gulp.task('test-es7-mocha-throw', ['transpile-es7-fixtures'] , function () {
  process.env.SKIP_TRACEUR_RUNTIME = true;
  return gulp.src('build/test/a-throw-specs.js')
    .pipe(mocha());
});

gulp.task('test', function() {
  return gulp.src(['test/**/*-specs.js', '!test/fixtures'])
    .pipe(mocha());
});

//spawnWatcher.clear(false);
spawnWatcher.configure('watch', ['lib/**/*.js','test/**/*.js','!test/fixtures'], function() {
  return runSequence('test');
});

