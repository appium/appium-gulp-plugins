'use strict';

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

  this.stream = function stream () {
    return streamCombiner(function combine (source) {
      return source
        .pipe(sourceMapInit)
        .pipe(sourceMapHeader)
        .pipe(sourceMapWrite);
    });
  };
};
