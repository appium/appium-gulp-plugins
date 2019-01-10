const path = require('path');
const sourcemaps = require('gulp-sourcemaps');
const replace = require('gulp-replace');


const SOURCEMAP_OPTS = {
  sourceRoot: function (file) { // eslint-disable-line object-shorthand
    // Point to source root relative to the transpiled file
    return path.relative(path.join(file.cwd, file.path), file.base);
  },
  includeContent: true,
};

const HEADER = 'require(\'source-map-support\').install();\n\n';


module.exports = function getSourceMapFns (opts = {}) {
  const sourceMapOpts = Object.assign({}, SOURCEMAP_OPTS, opts);

  return {
    sourceMapInit: sourcemaps.init(),
    sourceMapHeader: replace(/$/, HEADER),
    sourceMapWrite: sourcemaps.write(sourceMapOpts),
  };
};
