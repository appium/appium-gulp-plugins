const _ = require('lodash');


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

module.exports = {
  interpolate,
  translatePaths,
  isVerbose,
  getTestReporter,
};