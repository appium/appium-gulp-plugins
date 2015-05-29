"use strict";
var mocha = require('gulp-mocha'),
    Q = require('q'),
    Transpiler = require('../index').Transpiler,
    jshint = require('gulp-jshint'),
    jscs = require('gulp-jscs'),
    vinylPaths = require('vinyl-paths'),
    del = require('del'),
    _ = require('lodash');

var DEFAULT_OPTS = {
  files: ["*.js", "lib/**/*.js", "test/**/*.js", "!gulpfile.js"],
  transpile: true,
  transpileOut: "build",
  babelOpts: {},
  linkBabelRuntime: true,
  jscs: true,
  jshint: true,
  watch: true,
  test: true,
  testFiles: null,
  e2eTest: true,
  e2eTestFiles: null,
  testReporter: ( process.env.TRAVIS || process.env.CI ) ? 'spec' : 'nyan',
  testTimeout: 8000,
  buildName: null,
};

var boilerplate = function (gulp, opts) {
  var spawnWatcher = require('../index').spawnWatcher.use(gulp);
  var runSequence = Q.denodeify(require('run-sequence').use(gulp));
  var defOpts = _.clone(DEFAULT_OPTS);
  _.extend(defOpts, opts);
  opts = defOpts;

  process.env.APPIUM_NOTIF_BUILD_NAME = opts.buildName;

  gulp.task('clean', function () {
    if (opts.transpile) {
      return gulp.src(opts.transpileOut, {read: false})
                 .pipe(vinylPaths(del));
    }
  });

  var testDeps = [];
  var testDir = 'test';
  if (opts.transpile) {
    testDeps.push('transpile');
    testDir = opts.transpileOut + '/test';
  }

  if (opts.test) {
    var testFiles = opts.testFiles ? opts.testFiles :
      [testDir + '/**/*-specs.js', '!' + testDir + '/**/*-e2e-specs.js'];
    gulp.task('test', testDeps,  function () {
      var isForceLogMode = parseInt(process.env._FORCE_LOGS, 10) === 1;
      var mochaOpts = {
        reporter: isForceLogMode ? 'spec' : opts.testReporter,
        timeout: opts.testTimeout
      };
      // set env so our code knows when it's being run in a test env
      process.env._TESTING = 1;
      var testProc = gulp
       .src(testFiles, {read: false})
       .pipe(mocha(mochaOpts))
       .on('error', spawnWatcher.handleError);
      return testProc;
    });
  }

  if (opts.e2eTest) {
    var e2eTestFiles = opts.e2eTestFiles ? opts.e2eTestFiles :
      testDir + '/**/*-e2e-specs.js';
    gulp.task('e2e-test', testDeps,  function () {
      var isForceLogMode = parseInt(process.env._FORCE_LOGS, 10) === 1;
      var mochaOpts = {
        reporter: isForceLogMode ? 'spec' : opts.testReporter,
        timeout: opts.testTimeout
      };
      // set env so our code knows when it's being run in a test env
      process.env._TESTING = 1;
      var testProc = gulp
       .src(e2eTestFiles, {read: false})
       .pipe(mocha(mochaOpts))
       .on('error', spawnWatcher.handleError);
      return testProc;
    });
  }

  if (opts.transpile) {
    gulp.task('transpile', function () {
      var transpiler = new Transpiler(opts.babelOpts);
      return gulp.src(opts.files, {base: './'})
        .pipe(transpiler.stream())
        .on('error', spawnWatcher.handleError)
        .pipe(gulp.dest(opts.transpileOut));
    });

    gulp.task('prepublish', function () {
      return runSequence('clean', 'transpile');
    });
  }

  var lintTasks = [];
  if (opts.jscs) {
    gulp.task('jscs', function () {
      return gulp
       .src(opts.files)
       .pipe(jscs())
       .on('error', spawnWatcher.handleError);
    });
    lintTasks.push('jscs');
  }

  if (opts.jshint) {
    gulp.task('jshint', function () {
      return gulp
       .src(opts.files)
       .pipe(jshint())
       .pipe(jshint.reporter('jshint-stylish'))
       .pipe(jshint.reporter('fail'))
       .on('error', spawnWatcher.handleError);
    });
    lintTasks.push('jshint');
  }

  if (opts.jscs || opts.jshint) {
    opts.lint = true;
    gulp.task('lint', lintTasks);
  }

  var defaultSequence = [];
  if (opts.transpile) defaultSequence.push('clean');
  if (opts.lint) defaultSequence.push('lint');
  if (opts.transpile && !opts.test) defaultSequence.push('transpile');
  if (opts.test) defaultSequence.push('test');
  if (opts.extraDefaultTasks) defaultSequence = defaultSequence.concat(opts.extraDefaultTasks);

  if (opts.watch) {
    spawnWatcher.clear(false);
    spawnWatcher.configure('watch', opts.files, function () {
      return runSequence.apply(null, defaultSequence);
    });
  }

  gulp.task('once', function () {
    return runSequence.apply(null, defaultSequence);
  });

  gulp.task('default', [opts.watch ? 'watch' : 'once']);
};

module.exports = {
  use: function (gulp) {
    return function (opts) {
      boilerplate(gulp, opts);
    };
  }
};
