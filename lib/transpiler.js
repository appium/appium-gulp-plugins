"use strict";
let babel = require('gulp-babel'),
    replace = require('gulp-replace'),
    rename = require('gulp-rename'),
    _ = require('lodash'),
    streamCombiner = require('./stream-combiner'),
    sourcemaps = require('gulp-sourcemaps'),
    path = require('path');

let BABEL_OPTS = {
  blacklist: ['react'],
  optional: ['runtime'],
  modules: 'common',
  stage: 1,
  sourceMaps: true,
};

let SOURCEMAP_OPTS = {
  sourceRoot: function (file) { // eslint-disable-line object-shorthand
    // Point to source root relative to the transpiled file
    return path.relative(path.join(file.cwd, file.path), file.base);
  },
};

let HEADER = 'require(\'source-map-support\').install();\n\n';

let renameEsX = function () {
  return rename(function (path) {
    path.basename = path.basename.replace(/\.es[67]$/, '');
  });
};

module.exports = function (opts) {
  opts = opts || {};
  this.babelOpts = _.merge({}, BABEL_OPTS, opts.babelOpts);
  this.sourceMapOpts = _.merge({}, SOURCEMAP_OPTS, opts.sourceMapOpts);

  if (opts.flow) {
    this.babelOpts.blacklist.push('flow');
  }
  this.header = HEADER;
  this.stream = function () {
    return streamCombiner(function (source) {
      return source
        .pipe(sourcemaps.init())
          .pipe(babel(this.babelOpts))
          .pipe(replace(/\/\/\s+transpile:(main|mocha)\s*/g, this.header))
          .pipe(renameEsX())
        .pipe(sourcemaps.write(this.sourceMapOpts));
    }.bind(this));
  }.bind(this);
};
