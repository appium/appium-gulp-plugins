"use strict";
var mocha = require('gulp-mocha'),
    Q = require('q'),
    globby = Q.denodeify(require('globby')),
    Transpiler = require('../index').Transpiler,
    jshint = require('gulp-jshint'),
    jscs = require('gulp-jscs'),
    vinylPaths = require('vinyl-paths'),
    del = require('del'),
    _ = require('lodash'),
    promisePipe = require("promisepipe"),
    AndroidEmulator = require('appium-ci').AndroidEmulator,
    androidTools = require('appium-ci').androidTools,
    iosTools = require('appium-ci').iosTools,
    spawn = require('child_process').spawn,
    exec = Q.denodeify(require('child_process').exec),
    path = require('path');

var DEFAULT_OPTS = {
  files: ["*.js", "lib/**/*.js", "test/**/*.js", "!gulpfile.js"],
  transpile: true,
  transpileOut: "build",
  babelOpts: {},
  linkBabelRuntime: true,
  jscs: false,
  jshint: true,
  watch: true,
  watchE2E: false,
  test: {
    files: ['${testDir}/**/*-specs.js', '!${testDir}/**/*-e2e-specs.js']
  },
  coverage: {
    files: ['./test/**/*-specs.js', '!./test/**/*-e2e-specs.js'],
    verbose: true
   },
  e2eTest: {
    files: '${testDir}/**/*-e2e-specs.js',
    forceExit: process.env.TRAVIS || process.env.CI
  },
  testReporter: ( process.env.TRAVIS || process.env.CI ) ? 'spec' : 'nyan',
  testTimeout: 8000,
  buildName: null,
  extraPrepublishTasks: []
};

var DEFAULT_ANDROID_E2ETEST_OPTS = {
  "android-emu": true,
  "android-avd": process.env.ANDROID_AVD || "NEXUS_S_18_X86"
};

// string interpolation
var interpolate = function (s, opts) {
  return _.keys(opts).reduce(function (s, k) {
    return s.replace(new RegExp('\\$\\{\\s*' + k + '\\s*\\}', 'g') , opts[k]);
  } , s);
};

var boilerplate = function (gulp, opts) {
  var spawnWatcher = require('../index').spawnWatcher.use(gulp);
  var runSequence = Q.denodeify(require('run-sequence').use(gulp));
  opts = _.cloneDeep(opts);
  _.defaults(opts, DEFAULT_OPTS);

  // re-defaulting when e2eTest.android=true
  if(opts.e2eTest.android) {
    _.defaults(opts.e2eTest, DEFAULT_OPTS.e2eTest);
    _.defaults(opts.e2eTest, DEFAULT_ANDROID_E2ETEST_OPTS);
  }
  // re-defaulting when e2eTest.ios=true
  if(opts.e2eTest.ios) {
    _.defaults(opts.e2eTest, DEFAULT_OPTS.e2eTest);
  }
  process.env.APPIUM_NOTIF_BUILD_NAME = opts.buildName;

  gulp.task('clean', function () {
    if (opts.transpile) {
      return gulp.src(opts.transpileOut, {read: false})
                 .pipe(vinylPaths(del));
    }
  });

  var testDeps = [];
  var testTasks = [];
  var rootDir = '.';
  if (opts.transpile) {
    testDeps.push('transpile');
    rootDir = opts.transpileOut;
  }
  var fileAliases = {rootDir: rootDir, testDir: rootDir + '/test', libDir: rootDir + '/lib' };

  if (opts.test) {
    var testFiles = _.flatten([opts.test.files || opts.testFiles]).map(function (f) {
      return interpolate(f, fileAliases);
    });
    gulp.task('unit-test', testDeps,  function () {
      var isForceLogMode = parseInt(process.env._FORCE_LOGS, 10) === 1;
      var mochaOpts = {
        reporter: isForceLogMode ? 'spec' : opts.testReporter,
        timeout: opts.testTimeout,
        'require': opts.testRequire || []
      };
      // set env so our code knows when it's being run in a test env
      process.env._TESTING = 1;
      return gulp
       .src(testFiles, {read: false})
       .pipe(mocha(mochaOpts))
       .on('error', spawnWatcher.handleError);
    });
    testTasks.push('unit-test');
  }

  if (opts.coverage) {
    var covTestFiles = _.flatten([opts.coverage.files]).map(function (f) {
      return interpolate(f, fileAliases);
    });
    gulp.task('coverage', function () {
      return exec('rm -rf ./build').then(function () {
        return globby(covTestFiles).then(function (files) {
          var deferred = Q.defer();
          var bins = {};
          _.each(['isparta', '--report', 'text', '_mocha'], function (k) { bins[k] = path.resolve(__dirname, '../node_modules/.bin', k); });
          var bin = bins.isparta;
          var args = ['cover', bins._mocha, '--', '--require', __dirname + '/../babelhook', '--compilers', 'babel:babel-core/register' , '--reporter', 'dot']
            .concat(files);
          var env = _.clone(process.env);
          env.NO_PRECOMPILE=1;
          env._TESTING=1;
          console.log("running command -->", bin, args.join(' '));
          var proc = spawn(bin, args, {stdio: opts.coverage.verbose ? 'inherit' : 'ignore', env: env});
          proc.on('close', function (code) {
            if (code === 0) {
              deferred.resolve();
            } else {
              deferred.reject(new Error('Coverage command exit code: ' + code));
            }
          });
          return deferred.promise;
        });
      }).catch(spawnWatcher.handleError);
    });
    gulp.task('coveralls', ['coverage'], function () {
      var bin = path.resolve(__dirname, '../node_modules/.bin/coveralls');
      return exec('cat ./coverage/lcov.info | ' + bin).catch(spawnWatcher.handleError);
    });
  }

  if (opts.e2eTest) {
    var e2eTestFiles = _.flatten([opts.e2eTest.files || opts.e2eTestFiles]).map(function (f) {
      return interpolate(f, fileAliases);
    });
    gulp.task('e2e-test', testDeps,  function () {
      var isForceLogMode = parseInt(process.env._FORCE_LOGS, 10) === 1;
      var mochaOpts = {
        reporter: isForceLogMode ? 'spec' : opts.testReporter,
        timeout: opts.testTimeout
      };
      // set env so our code knows when it's being run in a test env
      process.env._TESTING = 1;
      var seq = [
        function () {
          return promisePipe(gulp
           .src(e2eTestFiles, {read: false})
           .pipe(mocha(mochaOpts)));
        }];
      if (opts.e2eTest.android) {
        if(opts.e2eTest["android-emu"]) {
          var emu = new AndroidEmulator(opts.e2eTest['android-avd']);
          seq = [
            function () { return androidTools.killAll(); },
            function () { return new Q(emu.start()); },
            function () { return emu.waitTillReady();}
          ].concat(seq).concat([
            function () { return emu.stop(); },
            function () { return androidTools.killAll(); }
          ]);
        } else {
          seq = [
            function () { return androidTools.killAll(); },
          ].concat(seq).concat([
            function () { return androidTools.killAll(); }
          ]);
        }
      }
      if (opts.e2eTest.ios) {
        var xCodeVersion = opts.e2eTest.xCodeVersion || '6.1.1';
        seq = [
          function () { return iosTools.killAll(); },
          function () { return iosTools.configureXcode(xCodeVersion); },
          function () { return iosTools.resetSims(); },
        ].concat(seq).concat([
          function () { return iosTools.killAll(); }
        ]);
      }
      return seq.reduce(function (p, np) {
        return p.then(np)
          .catch(function (err) {
          spawnWatcher.handleError(err);
          if(opts.e2eTest.forceExit) {
            process.exit(1);
          }
        });
      }, new Q())
        .fin(function() {
          if(opts.e2eTest.forceExit) {
            process.exit(0);
          }
        });
    });
    testTasks.push('e2e-test');
  }

  if (testTasks.length > 0) {
    gulp.task('test', function () {
      return runSequence.apply(null, testTasks);
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
      var tasks = ['clean', 'transpile'].concat(opts.extraPrepublishTasks);
      return runSequence.apply(this, tasks);
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
  if (opts.test) {
    if (opts.watchE2E) {
      defaultSequence.push('test');
    } else if (_.contains(testTasks, 'unit-test')) {
      defaultSequence.push('unit-test');
    }
  }
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
  DEFAULTS: _.cloneDeep(DEFAULT_OPTS),
  use: function (gulp) {
    return function (opts) {
      boilerplate(gulp, opts);
    };
  }
};
