/* eslint promise/prefer-await-to-then: 0 */
/* eslint promise/prefer-await-to-callbacks: 0 */
"use strict";

let mocha = require('gulp-mocha'),
    Q = require('q'),
    globby = require('globby'),
    Transpiler = require('../index').Transpiler,
    eslint = require('gulp-eslint'),
    vinylPaths = require('vinyl-paths'),
    del = require('del'),
    _ = require('lodash'),
    AndroidEmulator = require('appium-ci').AndroidEmulator,
    androidTools = require('appium-ci').androidTools,
    iosTools = require('appium-ci').iosTools,
    spawn = require('child_process').spawn,
    exec = Q.denodeify(require('child_process').exec),
    path = require('path');


if (process.env.TRAVIS || process.env.CI) {
  process.env.REAL_DEVICE = 0;
}

let DEFAULT_OPTS = {
  files: ["*.js", "lib/**/*.js", "test/**/*.js", "!gulpfile.js"],
  transpile: true,
  transpileOut: "build",
  babelOpts: {},
  linkBabelRuntime: true,
  watch: true,
  watchE2E: false,
  test: {
    files: ['${testDir}/**/*-specs.js', '!${testDir}/**/*-e2e-specs.js']
  },
  coverage: {
    files: ['./test/**/*-specs.js', '!./test/**/*-e2e-specs.js'],
    verbose: true
  },
  'coverage-e2e': {
    files: ['./test/**/*-e2e-specs.js'],
    verbose: true
  },
  e2eTest: {
    files: '${testDir}/**/*-e2e-specs.js',
    forceExit: process.env.TRAVIS || process.env.CI
  },
  testReporter: (process.env.TRAVIS || process.env.CI) ? 'spec' : 'nyan',
  testTimeout: 8000,
  buildName: null,
  extraPrepublishTasks: [],
  eslint: true,
};

let DEFAULT_ANDROID_E2ETEST_OPTS = {
  "android-emu": true,
  "android-avd": process.env.ANDROID_AVD || "NEXUS_S_18_X86"
};

// string interpolation
let interpolate = function (s, opts) {
  return _.keys(opts).reduce(function (s, k) {
    return s.replace(new RegExp('\\$\\{\\s*' + k + '\\s*\\}', 'g'), opts[k]);
  }, s);
};

let boilerplate = function (gulp, opts) {
  let spawnWatcher = require('../index').spawnWatcher.use(gulp);
  let runSequence = Q.denodeify(require('run-sequence').use(gulp));
  opts = _.cloneDeep(opts);
  _.defaults(opts, DEFAULT_OPTS);

  // re-defaulting when e2eTest.android=true
  if (opts.e2eTest.android) {
    _.defaults(opts.e2eTest, DEFAULT_OPTS.e2eTest);
    _.defaults(opts.e2eTest, DEFAULT_ANDROID_E2ETEST_OPTS);
  }
  // re-defaulting when e2eTest.ios=true
  if (opts.e2eTest.ios) {
    _.defaults(opts.e2eTest, DEFAULT_OPTS.e2eTest);
  }
  process.env.APPIUM_NOTIF_BUILD_NAME = opts.buildName;

  gulp.task('clean', function () {
    if (opts.transpile) {
      return gulp.src(opts.transpileOut, {read: false})
                 .pipe(vinylPaths(del));
    }
  });

  let testDeps = [];
  let testTasks = [];
  let rootDir = '.';
  if (opts.transpile) {
    testDeps.push('transpile');
    rootDir = opts.transpileOut;
  }
  let fileAliases = {rootDir, testDir: `${rootDir}/test`, libDir: `${rootDir}/lib`};

  if (opts.test) {
    let testFiles = _.flatten([opts.test.files || opts.testFiles]).map(function (f) {
      return interpolate(f, fileAliases);
    });
    gulp.task('unit-test', testDeps, function () {
      let isForceLogMode = parseInt(process.env._FORCE_LOGS, 10) === 1;
      let reporter = isForceLogMode ? 'spec' :
                     process.env.REPORTER ? process.env.REPORTER :
                     opts.testReporter;
      let mochaOpts = {
        reporter,
        timeout: opts.testTimeout,
        'require': opts.testRequire || []
      };
      // set env so our code knows when it's being run in a test env
      process.env._TESTING = 1;
      return gulp
       .src(testFiles, {read: false})
       .pipe(mocha(mochaOpts))
       .once('error', spawnWatcher.handleError);
    });
    testTasks.push('unit-test');
  }

  let doCoverage = function (taskName, filePatterns, targetDir) {
    let covTestFiles = _.flatten([filePatterns]).map(function (f) {
      return interpolate(f, fileAliases);
    });
    gulp.task(taskName, function () {
      return exec('rm -rf ./build').then(function () {
        return exec('npm bin').then(function (npmBin) {
          if (Array.isArray(npmBin)) {
            npmBin = npmBin[0];
          }
          npmBin = npmBin.trim();
          return globby(covTestFiles).then(function (files) {
            let deferred = Q.defer();
            let bins = {};
            _.each(['istanbul', '_mocha'], function (k) { bins[k] = path.resolve(npmBin, k); });
            let bin = bins.istanbul;
            let args = ['cover', '--dir', targetDir, bins._mocha, '--', '--reporter', 'dot', '--compilers', 'js:babel-core/register']
              .concat(files);
            let env = _.clone(process.env);
            env.NO_PRECOMPILE=1;
            env._TESTING=1;
            console.log("running command -->", bin, args.join(' ')); // eslint-disable-line no-console
            let proc = spawn(bin, args, {stdio: opts.coverage.verbose ? 'inherit' : 'ignore', env});
            proc.on('close', function (code) {
              if (code === 0) {
                deferred.resolve();
              } else {
                deferred.reject(new Error('Coverage command exit code: ' + code));
              }
            });
            return deferred.promise;
          });
        });
      }).catch(spawnWatcher.handleError);
    });
  };
  if (opts.coverage) {
    doCoverage('coverage', opts.coverage.files, 'coverage');
    gulp.task('coveralls', ['coverage'], function () {
      return exec('npm bin').then(function (npmBin) {
        if (Array.isArray(npmBin)) {
          npmBin = npmBin[0];
        }
        npmBin = npmBin.trim();
        let bin = path.resolve(npmBin, 'coveralls');
        return exec('cat ./coverage/lcov.info | ' + bin).catch(spawnWatcher.handleError);
      });
    });
  }
  if (opts['coverage-e2e']) {
    doCoverage('coverage-e2e', opts['coverage-e2e'].files, 'coverage-e2e');
  }
  if (opts.e2eTest) {
    let e2eTestFiles = _.flatten([opts.e2eTest.files || opts.e2eTestFiles]).map(function (f) {
      return interpolate(f, fileAliases);
    });
    gulp.task('e2e-test', testDeps,  function () {
      let isForceLogMode = parseInt(process.env._FORCE_LOGS, 10) === 1;
      let mochaOpts = {
        reporter: isForceLogMode ? 'spec' : opts.testReporter,
        timeout: opts.testTimeout
      };
      // set env so our code knows when it's being run in a test env
      process.env._TESTING = 1;

      let mochaCmd = function () {
        return Q.Promise(function (resolve, reject) {
          gulp
            .src(e2eTestFiles, {read: false})
            .pipe(mocha(mochaOpts))
            .once('error', function (err) {
              reject(err);
            })
            .once('end', function () {
              resolve.apply(null, arguments);
            });
        });
      };

      let startupSeq = [];
      let cleanupSeq = [];
      let cleanupWarn = function (err) { console.warn('Error during cleanup, ignoring:', err); }; // eslint-disable-line no-console
      if (opts.e2eTest.android) {
        if (opts.e2eTest["android-emu"]) {
          let emu = new AndroidEmulator(opts.e2eTest['android-avd']);
          startupSeq = [
            function () { return androidTools.killAll(); },
            function () { return new Q(emu.start()); },
            function () { return emu.waitTillReady();}
          ];
          cleanupSeq = cleanupSeq.concat([
            function () { return emu.stop(); },
            function () { return androidTools.killAll().catch(cleanupWarn); }
          ]);
        } else {
          startupSeq = [
            function () { return androidTools.killAll(); },
          ];
          cleanupSeq = cleanupSeq.concat([
            function () { return androidTools.killAll().catch(cleanupWarn); }
          ]);
        }
      }
      if (opts.e2eTest.ios) {
        let xCodeVersion = opts.e2eTest.xCodeVersion || '6.1.1';
        startupSeq = [
          function () { return iosTools.killAll(); },
          function () { return iosTools.configureXcode(xCodeVersion); },
          function () { return iosTools.resetSims(); },
        ];
        cleanupSeq = cleanupSeq.concat([
          function () { return iosTools.killAll().catch(cleanupWarn); }
        ]);
      }

      // go through the steps to run the test
      startupSeq.reduce((step, sequence) => sequence.then(step), new Q())
        .then(mochaCmd)
        .then(function () {
          return cleanupSeq.reduce((step, sequence) => sequence.then(step), new Q())
            .fin(function () {
              if (opts.e2eTest.forceExit) {
                process.exit(0);
              }
            });
        }).catch(function () {
          return cleanupSeq.reduce((step, sequence) => sequence.then(step), new Q())
            .fin(function () {
              if (opts.e2eTest.forceExit) {
                process.exit(1);
              }
            });
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
      let transpiler = new Transpiler(opts);
      return gulp.src(opts.files, {base: './'})
        .pipe(transpiler.stream())
        .on('error', spawnWatcher.handleError)
        .pipe(gulp.dest(opts.transpileOut));
    });

    gulp.task('prepublish', function () {
      let tasks = ['clean', 'transpile'].concat(opts.extraPrepublishTasks);
      return runSequence.apply(this, tasks);
    });
  }

  gulp.task('eslint', function () {
    return gulp.src(['**/*.js', '!node_modules/**', '!build/**'])
      .pipe(eslint())
      .pipe(eslint.format())
      .pipe(eslint.failAfterError());
  });

  let lintTasks = [];
  if (opts.eslint) {
    opts.lint = true;
    lintTasks.push('eslint');
  }

  let defaultSequence = [];
  if (opts.transpile) {
    defaultSequence.push('clean');
  }
  if (opts.lint) {
    gulp.task('lint', lintTasks);
    defaultSequence.push('lint');
  }
  if (opts.transpile && !opts.test) {
    defaultSequence.push('transpile');
  }
  if (opts.postTranspile) {
    defaultSequence = defaultSequence.concat(opts.postTranspile);
  }
  if (opts.test) {
    if (opts.watchE2E) {
      defaultSequence.push('test');
    } else if (_.includes(testTasks, 'unit-test')) {
      defaultSequence.push('unit-test');
    }
  }
  if (opts.extraDefaultTasks) {
    defaultSequence = defaultSequence.concat(opts.extraDefaultTasks);
  }

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
  use (gulp) {
    return function (opts) {
      boilerplate(gulp, opts);
    };
  }
};
