appium-gulp-plugins
===================

Custom plugins used accross appium modules

TODO: waiting for feedback before publishing on npm

# transpile plugin

Traceur compilation, sourcemaps and file renaming functionality in one plugin. `.es7.js` and `.es6.js` files will be automatically
renamed to `.js files`. The necessary sourcemaps and traceur comments and imports are also automatically added.

## usage

1/ Configure gulp as below:

```
var gulp = require('gulp'),
transpile = require('appium-gulp-plugins').gulpTranspile

gulp.task('transpile', function () {
  return gulp.src('test/fixtures/es7/**/*.js')
    .pipe(transpile())
    .pipe(gulp.dest('build'));
});
```

2/ in your code you need to mark the main and mocha files as below:

- main: add `// transpile:main` at the beginning of the file ([example here](https://github.com/appium/appium-gulp-plugins/blob/master/test/fixtures/es7/lib/run.es7.js)) .
- mocha: add `// transpile:mocha` at the beginning of the file ([example here](https://github.com/appium/appium-gulp-plugins/blob/master/test/fixtures/es7/test/a-specs.es7.js))

Regular lib files do not need any extra comments.
