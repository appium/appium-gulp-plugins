'use strict';

const _ = require('lodash');
const { exec } = require('child_process');
const B = require('bluebird');


// string interpolation
const interpolate = function interpolate (s, opts) {
  return _.keys(opts).reduce(function (s, k) {
    return s.replace(new RegExp(`\\$\\{\\s*${k}\\s*\\}`, 'g'), opts[k]);
  }, s);
};

const translatePaths = function translatePaths (files, fileAliases) {
  if (!_.isArray(files)) {
    files = [files];
  }
  return _.flatten(files).map(function (f) {
    return interpolate(f, fileAliases);
  });
};

const isVerbose = function isVerbose () {
  return process.env.VERBOSE === '1';
};

const getTestReporter = function getTestReporter (opts) {
  const isForceLogMode = parseInt(process.env._FORCE_LOGS, 10) === 1;
  return isForceLogMode ? 'spec' : (process.env.REPORTER ? process.env.REPORTER : opts.testReporter);
};

const pExec = function pExec (cmd, args, opts = {}) {
  return new B(function (resolve, reject) {
    exec(`${cmd} ${args.join(' ')}`, opts, function (err, stdout, stderr) { // eslint-disable-line promise/prefer-await-to-callbacks
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return reject;
      }
      resolve({
        stdout,
        stderr,
      });
    });
  });
};

module.exports = {
  interpolate,
  translatePaths,
  isVerbose,
  getTestReporter,
  exec: pExec,
};
