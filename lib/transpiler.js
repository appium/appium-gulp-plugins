"use strict";

const babel = require('gulp-babel');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const streamCombiner = require('./stream-combiner');
const sourcemaps = require('gulp-sourcemaps');
const path = require('path');


const NODE_VERSION_MIN = '6.0.0';

const BABEL_OPTS = {
  presets: [
    ['@babel/preset-env', {
      'targets': {
        'node': NODE_VERSION_MIN,
      }
    }]
  ],
  plugins: [
    '@babel/plugin-transform-runtime',
  ],
  comments: false,

};

const SOURCEMAP_OPTS = {
  sourceRoot: function (file) { // eslint-disable-line object-shorthand
    // Point to source root relative to the transpiled file
    return path.relative(path.join(file.cwd, file.path), file.base);
  },
  includeContent: true,
};

const HEADER = 'require(\'source-map-support\').install();\n\n';

const renameEsX = function () {
  return rename(function (path) {
    path.basename = path.basename.replace(/\.es[67]$/, '');
  });
};

module.exports = function (opts) {
  opts = opts || {};

  const babelOpts = Object.assign({}, BABEL_OPTS, opts.babelOpts);
  const sourceMapOpts = Object.assign({}, SOURCEMAP_OPTS, opts.sourceMapOpts);
  this.stream = function () {
    return streamCombiner(function (source) {
      return source
        .pipe(sourcemaps.init())
        .pipe(babel(babelOpts))
        .pipe(replace(/$/, HEADER))
        .pipe(renameEsX())
        .pipe(sourcemaps.write(sourceMapOpts));
    }.bind(this));
  }.bind(this);
};
