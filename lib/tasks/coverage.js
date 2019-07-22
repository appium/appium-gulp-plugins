'use strict';

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
  gulp.task('npm-bin', async function getNpmBin () {
    if (npmBin) {
      return B.resolve();
    }
    let bin = await exec('npm bin');
    if (Array.isArray(bin)) {
      bin = bin[0];
    }
    npmBin = bin.trim(); // eslint-disable-line require-atomic-updates
    log(`Determined npm bin: ${npmBin}`);
  });

  const doCoverage = function doCoverage (taskName, filePatterns, targetDir) {
    const subTaskName = `${taskName}:run`;
    const covTestFiles = utils.translatePaths([filePatterns], env.fileAliases);
    gulp.task(subTaskName, async function doSubTask () {
      const files = await globby(covTestFiles);
      const bins = ['nyc', '_mocha'].reduce(function getFullPaths (bins, item) {
        bins[item] = path.resolve(npmBin, item);
        return bins;
      }, {});
      const args = [
        '--reporter=lcov',
        '--reporter=text-lcov',
        `--report-dir=${targetDir}`,
        '--exclude-after-remap=false',
        bins._mocha,
        '--reporter=dot',
        ...files,
        '--exit',
      ];
      let env = _.clone(process.env);
      env.NO_PRECOMPILE = 1;
      env._TESTING = 1;
      env.NODE_ENV = 'coverage';
      log(`Running command: ${bins.nyc} ${args.join(' ')}`);
      return new B(function runCmd (resolve, reject) {
        const proc = spawn(bins.nyc, args, {
          env,
          stdio: opts.coverage.verbose ? 'inherit' : 'ignore',
        });
        proc.on('close', function onClose (code) {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Coverage command exit code: ${code}`));
          }
        });
        proc.on('error', function onError (err) {
          reject(new Error(`Coverage error: ${err}`));
        });
      });
    });
    gulp.task(taskName, gulp.series('clean', 'transpile', 'npm-bin', subTaskName));
  };

  if (opts.coverage) {
    doCoverage('coverage', opts.coverage.files, 'coverage');
    gulp.task('coveralls:run', function coverallsRun () {
      const bin = path.resolve(npmBin, 'coveralls');
      return exec(`cat ./coverage/lcov.info | ${bin}`).catch(env.spawnWatcher.handleError);
    });
    gulp.task('coveralls', gulp.series('coverage', 'coveralls:run'));
  }
  if (opts['coverage-e2e']) {
    doCoverage('coverage-e2e', opts['coverage-e2e'].files, 'coverage-e2e');
  }
};

module.exports = {
  configure,
};
