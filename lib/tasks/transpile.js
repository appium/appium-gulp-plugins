'use strict';

const Transpiler = require('../../index').Transpiler;
const TsTranspiler = require('../../index').TsTranspiler;
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const { isVerbose } = require('../utils');
const _ = require('lodash');


const configure = function configure (gulp, opts, env) {

  const generateTranspiler = function (typings) {
    let transpiler;
    if (opts.typescript) {
      if (typings) {
        // remove js files from typing declaration
        opts.files = _.filter(opts.files, function filterJsFiles (file) {
          return file.indexOf('.js') === -1;
        });
        opts.typescriptOpts.declaration = true;
        opts.typescriptOpts.allowJs = false;
      }
      transpiler = new TsTranspiler(opts);
    } else {
      transpiler = new Transpiler(opts);
    }
    return gulp.src(opts.files, {base: './'})
      .pipe(gulpIf(isVerbose(), debug()))
      .pipe(transpiler.stream())
      .on('error', env.spawnWatcher.handleError)
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
