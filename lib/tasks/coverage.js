/* eslint promise/prefer-await-to-then: 0 */
/* eslint promise/prefer-await-to-callbacks: 0 */
"use strict";

const B = require('bluebird');
const globby = require('globby');
const _ = require('lodash');
const cp = require('child_process');
const spawn = cp.spawn;
const exec = B.promisify(cp.exec);
const path = require('path');
const utils = require('../utils');
const log = require('fancy-log');


const configure = function configure (gulp, opts, env) {
  let npmBin;
  gulp.task('npm-bin', function () {
    if (npmBin) {
      log(`Already have npm bin: ${npmBin}`);
      return B.resolve();
    }
    return exec('npm bin').then(function (bin) {
      if (Array.isArray(bin)) {
        bin = bin[0];
      }
      npmBin = bin.trim();
      log(`Determined npm bin: ${npmBin}`);
    });
  });
  const doCoverage = function doCoverage (taskName, filePatterns, targetDir) {
    const covTestFiles = utils.translatePaths([filePatterns], env.fileAliases);
    gulp.task(`_${taskName}`, function () {
      return globby(covTestFiles).then(function (files) {
        const bins = ['nyc', '_mocha'].reduce(function (bins, item) {
          bins[item] = path.resolve(npmBin, item);
          return bins;
        }, {});
        const args = ['--reporter=lcov', '--reporter=text-summary', `--report-dir=${targetDir}`,
          bins._mocha, '--reporter=dot', ...files];
        let env = _.clone(process.env);
        env.NO_PRECOMPILE = 1;
        env._TESTING = 1;
        env.NODE_ENV = 'coverage';
        log(`running command --> ${bins.nyc} ${args.join(' ')}`);
        return new B(function (resolve, reject) {
          const proc = spawn(bins.nyc, args, {stdio: opts.coverage.verbose ? 'inherit' : 'ignore', env});
          proc.on('close', function (code) {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Coverage command exit code: ${code}`));
            }
          });
          proc.on('error', function (err) {
            reject(new Error(`Coverage error: ${err}`));
          });
        });
      });
    });
    gulp.task(taskName, gulp.series('clean', 'npm-bin', `_${taskName}`));
  };

  if (opts.coverage) {
    doCoverage('coverage', opts.coverage.files, 'coverage');
    gulp.task('_coveralls', function () {
      const bin = path.resolve(npmBin, 'coveralls');
      return exec(`cat ./coverage/lcov.info | ${bin}`).catch(env.spawnWatcher.handleError);
    });
    gulp.task('coveralls', gulp.series('npm-bin', 'coverage', '_coveralls'));
  }
  if (opts['coverage-e2e']) {
    doCoverage('coverage-e2e', opts['coverage-e2e'].files, 'coverage-e2e');
  }
};

module.exports = {
  configure,
};