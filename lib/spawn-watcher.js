"use strict";

var clear = require('clear'),
    spawn = require('child_process').spawn,
    gulp = require('gulp'),
    gutil = require('gulp-util'),
    Q = require('q');

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
    var argv = require('yargs').count('respawn').argv;
    gulp.task(subtaskName, function () {
      exitOnError = true;
      gulp.watch(filePattern, function () {
        if (clearTerminal) clear();
        return watchFn();
      });
      gulp.watch(['gulpfile.js', 'package.json'], function () {
        process.exit(0);
      });

      if(!argv.respawn) {
        Q.delay(500).then(function() {
          watchFn();
        });
      }
    })

    gulp.task(taskName, function() {
      if (clearTerminal) clear();
      var spawnWatch = function(respawn) {
        var args = [subtaskName];
        if (respawn) args.push('--respawn');
        var proc = spawn('./node_modules/.bin/gulp', args, {stdio: 'inherit'});
        proc.on('close', function (code) {
          spawnWatch(true)
        });
      }
      spawnWatch();
    })
  }
};

