"use strict";

const Transpiler = require('../../index').Transpiler;
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const isVerbose = require('../utils').isVerbose;


const configure = function configure (gulp, opts, env) {
  gulp.task('transpile', function () {
    let transpiler = new Transpiler(opts);
    return gulp.src(opts.files, {base: './'})
      .pipe(gulpIf(isVerbose(), debug()))
      .pipe(transpiler.stream())
      .on('error', env.spawnWatcher.handleError)
      .pipe(gulp.dest(opts.transpileOut));
  });

  gulp.task('prepublish', gulp.series('clean', 'transpile', ...opts.extraPrepublishTasks));
};

module.exports = {
  configure,
};