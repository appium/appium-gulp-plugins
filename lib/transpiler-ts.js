'use strict';

const ts = require('gulp-typescript');
const streamCombiner = require('./stream-combiner');
const sourcemaps = require('./sourcemaps');


const TS_OPTS = {
  allowJs: true,
  checkJs: false,
  module: 'commonjs',
  target: 'es2015',
  moduleResolution: 'node',
  esModuleInterop: true,
  lib: ['es2015']
};

module.exports = function tranpilerTs (opts = {}) {
  const {sourceMapInit, sourceMapHeader, sourceMapWrite} = sourcemaps(opts.sourceMapOpts);

  this.stream = () => {
    return streamCombiner((source) => {
      return source
        .pipe(sourceMapInit)
        .pipe(ts(Object.assign({}, TS_OPTS, opts.typescriptOpts)))
        .pipe(sourceMapHeader)
        .pipe(sourceMapWrite);
    });
  };
};
