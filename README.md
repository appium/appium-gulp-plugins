appium-gulp-plugins
===================

Custom plugins used accross appium modules

## transpile plugin

Traceur compilation, sourcemaps and file renaming functionality in one plugin. `.es7.js` and `.es6.js` files will be automatically
renamed to `.js files`. The necessary sourcemaps and traceur comments and imports are also automatically added.

### usage

1/ Configure gulp as below:

``` js
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

### with gulp-mocha

Set the following env variable to skip the traceur runtime declaration.

```js
process.env.SKIP_TRACEUR_RUNTIME = true;
```

## watch plugin

There are some issues Gulp 3.x error handling which cause the default
gulp-watch to hang. This pluging is a small hack which solves that by
respawning the whole process on error. This should not be needed is
gulp 4.0.

### usage

```
var gulp = require('gulp'),
    spawnWatcher = require('./index').spawnWatcher.use(gulp);

spawnWatcher.configure('watch', ['lib/**/*.js','test/**/*.js','!test/fixtures'], function() {
  // this is the watch action
  return runSequence('test');
});
```

### error handling

The spawn needs to catch error as soon as they happen. To do so use the 
`spawnWatcher.handleError` method, for instance:

```js
// add error handling where needed
gulp.task('transpile', function () {
  return gulp.src('test/es7/**/*.js')
    .pipe(transpile())
    .on('error', spawnWatcher.handleError)
    .pipe(gulp.dest('build'));
});

gulp.task('test', ['transpile'] , function () {
  process.env.SKIP_TRACEUR_RUNTIME = true;
  return gulp.src('build/test/a-specs.js')
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});
```

### clear terminal

Terminal is cleared by default. To avoid that call:

```js
spawnWatcher.clear(false);
```

