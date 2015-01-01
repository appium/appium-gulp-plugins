"use strict";
var traceur = require('gulp-traceur'),
    replace = require('gulp-replace'),
    rename = require('gulp-rename'),
    _ = require('lodash');

var TRACEUR_OPTS = {
  asyncFunctions: true,
  blockBinding: true,
  modules: 'commonjs',
  annotations: true,
  arrayComprehension: true,
  sourceMaps: 'inline',
};

var RTTS_ASSERT_OPTS = {
  types: true,
  typeAssertions: true,
  typeAssertionModule: 'appium-transpile-runtime/assets/rtts-assert'
};

var HEADER =
  '/*# sourceMappingURL=path/to/source.map*/\n' +
  'require(\'appium-transpile-runtime\');\n';

var renameEsX =  function () {
  return rename(function (path) {
    path.basename = path.basename.replace(/\.es[67]$/, '');
  });
};

module.exports = function (opts) {
  opts =opts || {};
  this.traceurOpts = _.clone(TRACEUR_OPTS);
  if (opts['rtts-assert']) _.extend(this.traceurOpts, RTTS_ASSERT_OPTS);
  this.header = HEADER;
  this.stream = function () {
    var stream = replace(/\/\/\s+transpile:(main|mocha)\s*/g, this.header);
    if (opts['rtts-assert']) stream.pipe(replace(/\/\*(:\w+)\*\//g,'$1'));
    stream.pipe(traceur(this.traceurOpts));
    stream.pipe(renameEsX());
    return stream;
  }.bind(this);
};
