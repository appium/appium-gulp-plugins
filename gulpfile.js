var gulp = require('gulp'),
    Q = require('q'),
    del = Q.denodeify(require('del')),
    transpile = require('./index').gulpTranspile,
    mocha = require('gulp-mocha');

gulp.task('del-build', function (cb) {
  return del(['build']);
});

gulp.task('transpile-es7-fixtures', ['del-build'] , function () {
  return gulp.src('test/fixtures/es7/**/*.js')
    .pipe(transpile())
    .pipe(gulp.dest('build'));
});

gulp.task('test-es7-mocha', ['transpile-es7-fixtures'] , function () {
  process.env.SKIP_TRACEUR_RUNTIME = true;
  return gulp.src('build/test/a-specs.js')
    .pipe(mocha());
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

