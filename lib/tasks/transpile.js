'use strict';

const Transpiler = require('../../index').Transpiler;
const TsTranspiler = require('../../index').TsTranspiler;
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const { isVerbose } = require('../utils');
const _ = require('lodash');


const configure = function configure (gulp, opts, env) {

  const generateTranspiler = function (typings) {
    const transpiler = new Transpiler(opts);
    return gulp.src(opts.files, {base: './'})
      .pipe(gulpIf(isVerbose(), debug()))
      .pipe(transpiler.stream())
      .on('error', env.spawnWatcher.handleError.bind(env.spawnWatcher))
      .pipe(gulp.dest(opts.transpileOut));
  };

  gulp.task('transpile', generateTranspiler);

  gulp.task('typings', function typings () {
    return generateTranspiler(true);
  });
};

module.exports = {
  configure,
};
