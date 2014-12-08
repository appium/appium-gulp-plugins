"use strict";

var traceur = require('gulp-traceur'),
    replace = require('gulp-replace'),
    rename = require('gulp-rename');

var traceurOpts = {
  asyncFunctions: true,
  blockBinding: true,
  modules: 'commonjs',
  annotations: true,
  arrayComprehension: true,
  sourceMaps: 'inline',
  types: true
};

var header =
  '/*# sourceMappingURL=path/to/source.map*/' +
  'require(\'source-map-support\').install();' +
  'if(!process.env.SKIP_TRACEUR_RUNTIME) require(\'traceur/bin/traceur-runtime\');';

var renameEsX =  function() {
  return rename(function (path) {
    path.basename = path.basename.replace(/\.es[67]$/, '');
  })
}

module.exports = function () {
  var stream = replace(/\/\/\s+transpile:(main|mocha)\s*/g, header);
  stream.pipe(traceur(traceurOpts));
  stream.pipe(renameEsX());
  return stream;
};

