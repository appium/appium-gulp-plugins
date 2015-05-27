"use strict";
var babel = require('gulp-babel'),
    replace = require('gulp-replace'),
    rename = require('gulp-rename'),
    _ = require('lodash');

var BABEL_OPTS = {
  blacklist: ['react'],
  optional: ['runtime'],
  sourceMaps: 'inline',
  modules: 'common',
  stage: 1
};

var HEADER = 'require(\'source-map-support\').install();\n\n';

var renameEsX =  function () {
  return rename(function (path) {
    path.basename = path.basename.replace(/\.es[67]$/, '');
  });
};

module.exports = function (opts) {
  opts = opts || {};
  this.babelOpts = _.clone(BABEL_OPTS);
  if (opts.flow) this.babelOpts.blacklist.push('flow');
  this.header = HEADER;
  this.stream = function () {
    var stream = replace(/\/\/\s+transpile:(main|mocha)\s*/g, this.header);
    stream.pipe(babel(this.babelOpts))
          .pipe(renameEsX());
    return stream;
  }.bind(this);
};
