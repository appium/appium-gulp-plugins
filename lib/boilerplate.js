/* eslint promise/prefer-await-to-then: 0 */
/* eslint promise/prefer-await-to-callbacks: 0 */
"use strict";

const _ = require('lodash');
const tasks = require('./tasks/');


if (process.env.TRAVIS || process.env.CI) {
  process.env.REAL_DEVICE = 0;
}

const DEFAULT_OPTS = {
  files: ['*.js', 'lib/**/*.js', 'test/**/*.js', '!gulpfile.js'],
  transpile: true,
  transpileOut: 'build',
  babelOpts: {},
  linkBabelRuntime: true,
  watch: true,
  watchE2E: false,
  test: {
    files: ['${testDir}/**/*-specs.js', '!${testDir}/**/*-e2e-specs.js'],
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
    files: ['${testDir}/**/*-e2e-specs.js'],
    forceExit: false,
  },
  testReporter: (process.env.TRAVIS || process.env.CI) ? 'spec' : 'nyan',
  testTimeout: 20000,
  buildName: null,
  extraPrepublishTasks: [],
  eslint: true,
  eslintOnWatch: false,
};

const DEFAULT_ANDROID_E2ETEST_OPTS = {
  'android-emu': true,
  'android-avd': process.env.ANDROID_AVD || 'NEXUS_S_18_X86',
};

const boilerplate = function (gulp, opts) {
  const spawnWatcher = require('../index').spawnWatcher.use(gulp);

  opts = _.merge({}, DEFAULT_OPTS, opts);

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

  const rootDir = opts.transpile ? opts.transpileOut : '.';
  const fileAliases = {
    rootDir,
    testDir: `${rootDir}/test`,
    libDir: `${rootDir}/lib`,
  };

  // configure the individual tasks
  tasks.configure(gulp, opts, {
    fileAliases,
    spawnWatcher,
  });

  // conpute and define the default sequence of tasks
  let defaultSequence = [];
  if (opts.transpile) {
    defaultSequence.push('clean');
  }
  if (opts.eslint || opts.lint) {
    defaultSequence.push('lint');
  }
  if (opts.transpile && !opts.test) {
    defaultSequence.push('transpile');
  }
  if (opts.postTranspile) {
    defaultSequence.push(...opts.postTranspile);
  }
  if (opts.test) {
    if (opts.watchE2E) {
      defaultSequence.push('test');
    } else {
      defaultSequence.push('unit-test');
    }
  }
  if (opts.extraDefaultTasks) {
    defaultSequence.push(...opts.extraDefaultTasks);
  }

  if (opts.watch) {
    const watchSequence = opts.eslintOnWatch ?
      defaultSequence :
      defaultSequence.filter(function (step) {
        return step !== 'lint';
      });
    spawnWatcher.clear(false);
    spawnWatcher.configure('watch', opts.files, watchSequence);
  }

  gulp.task('once', gulp.series(...defaultSequence));

  gulp.task('default', gulp.series(opts.watch ? 'watch' : 'once'));
};


module.exports = {
  DEFAULTS: _.cloneDeep(DEFAULT_OPTS),
  use (gulp) {
    return function (opts) {
      boilerplate(gulp, opts);
    };
  }
};
