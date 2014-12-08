"use strict";

var clear = require('clear'),
    spawn = require('child_process').spawn,
    gulp = require('gulp');

var exitOnError = false;
var clearTerminal = true;
module.exports = {

  use: function (_gulp) {
    gulp = _gulp;
    return this;
  },

  clear: function(_clearTerminal) {
    clearTerminal = _clearTerminal;
    return this;
  },

  handleError: function (err) {
    var displayErr = gutil.colors.red(err);
    gutil.log(displayErr);
    if (exitOnError) process.exit(1);
  },
  configure: function (taskName, filePattern, watchFn) {
    var subtaskName = '_' + taskName;

    gulp.task(subtaskName, function () {
      exitOnError = true;
      gulp.watch(filePattern, function () {
        if (clearTerminal) clear();
        return watchFn();
      });
      gulp.watch(['gulpfile.js', 'package.json'], function () {
        process.exit(0);
      });
    })

    gulp.task(taskName, function() {
      if (clearTerminal) clear();
      var spawnWatch = function() {
        var proc = spawn('./node_modules/.bin/gulp', [subtaskName], {stdio: 'inherit'});
        proc.on('close', function (code) {
          spawnWatch()
        });
      }
      spawnWatch();
    })
  }
};

