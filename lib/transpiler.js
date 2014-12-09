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
  types: true
};

var HEADER =
  '/*# sourceMappingURL=path/to/source.map*/\n' +
  'require(\'appium-transpile-runtime\');\n';

var renameEsX =  function() {
  return rename(function (path) {
    path.basename = path.basename.replace(/\.es[67]$/, '');
  })
}

module.exports = function() {
  this.traceurOpts = _.clone(TRACEUR_OPTS);
  this.header = HEADER;
  this.stream = function () {
    var stream = replace(/\/\/\s+transpile:(main|mocha)\s*/g, this.header);
    stream.pipe(traceur(this.traceurOpts));
    stream.pipe(renameEsX());
    return stream;
  }.bind(this);
}

