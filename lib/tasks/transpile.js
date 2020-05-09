'use strict';

const Transpiler = require('../../index').Transpiler;
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const { isVerbose } = require('../utils');

const configure = function configure (gulp, opts, env) {
  gulp.task('transpile', function () {
    return gulp.src(opts.files, {base: './'})
      .pipe(gulpIf(isVerbose(), debug()))
      .pipe(new Transpiler(opts).stream())
      .on('error', env.spawnWatcher.handleError.bind(env.spawnWatcher))
      .pipe(gulp.dest(opts.transpileOut));
  });
};

module.exports = {
  configure,
};
