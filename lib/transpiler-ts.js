"use strict";

const ts = require('gulp-typescript');
const replace = require('gulp-replace');
const streamCombiner = require('./stream-combiner');
const sourcemaps = require('gulp-sourcemaps');
const path = require('path');

const TS_OPTS = {
  allowJs: true,
  checkJs: false,
  module: "commonjs",
  target: "es2015",
  moduleResolution: "node",
  esModuleInterop: true,
  lib: ["es2015"]
};

const SOURCEMAP_OPTS = {
  sourceRoot: function (file) { // eslint-disable-line object-shorthand
    // Point to source root relative to the transpiled file
    return path.relative(path.join(file.cwd, file.path), file.base);
  },
  includeContent: true,
};

const HEADER = 'require(\'source-map-support\').install();\n\n';

module.exports = function (opts) {
  opts = opts || {};

  const tsOpts = Object.assign({}, TS_OPTS, opts.typescriptOpts);
  const sourceMapOpts = Object.assign({}, SOURCEMAP_OPTS, opts.sourceMapOpts);

  this.stream = function () {
    return streamCombiner(function (source) {
      return source
        .pipe(sourcemaps.init())
        .pipe(ts(tsOpts))
        .pipe(replace(/$/, HEADER))
        .pipe(sourcemaps.write(sourceMapOpts));
    }.bind(this));
  }.bind(this);
};
