/* eslint promise/prefer-await-to-then: 0 */
/* eslint promise/catch-or-return: 0 */
"use strict";

let clear = require('clear'),
    spawn = require('child_process').spawn,
    gulp = require('gulp'),
    gutil = require('gulp-util'),
    Q = require('q'),
    notifier = require('node-notifier'),
    moment = require('moment'),
    _ = require('lodash'),
    path = require('path');

let exitOnError = false;
let clearTerminal = true;

let notify = function (subtitle, message) {
  if (process.argv.indexOf('--no-notif') >= 0) return; // eslint-disable-line curly
  let title;
  try {
    title = process.env.APPIUM_NOTIF_BUILD_NAME || 'Appium';
    notifier.notify({
      title,
      subtitle: `${subtitle}  ${moment().format('h:mm:ss')}`,
      message
    });
  } catch (ign) {
    console.warn(`notifier: [${title}] ${message}`); // eslint-disable-line no-console
  }
};

let notifyOK = notify.bind(null, 'Build success!', 'All Good!');

module.exports = {
  use (_gulp) {
    gulp = _gulp;
    return this;
  },

  clear (_clearTerminal) {
    clearTerminal = _clearTerminal;
    return this;
  },

  handleError (err) {
    gutil.log(gutil.colors.red(err));
    let code = /\u001b\[(\d+(;\d+)*)?m/g;
    let notifErr = ('' + err).replace(code, '');
    notify('Build failure!', notifErr);
    if (exitOnError) {
      process.exit(1);
    }
  },
  configure (taskName, filePattern, watchFn) {
    let subtaskName = '_' + taskName;

    let isRespawn = process.argv.indexOf('--respawn') > 0;
    gulp.task(subtaskName, function () {
      exitOnError = true;
      gulp.watch(filePattern, function () {
        if (clearTerminal) {
          clear();
        }
        return watchFn().then(notifyOK);
      });
      gulp.watch(['gulpfile.js'], function () {
        process.exit(0);
      });

      if (!isRespawn) {
        Q.delay(500).then(function () {
          watchFn().then(notifyOK);
        });
      }
    });

    gulp.task(taskName, function () {
      if (clearTerminal) {
        clear();
      }
      let spawnWatch = function (respawn) {
        let args = [subtaskName];
        if (process.argv.indexOf('--no-notif') >= 0) {
          args.push('--no-notif');
        }
        if (respawn) {
          args.push('--respawn');
        }
        args = args.concat(_.chain(process.argv).tail(2).filter(function (arg) {
          if (/gulp$/.test(arg)) return false; // eslint-disable-line curly
          return ([taskName, subtaskName, '--no-notif', '--respawn'].indexOf(arg) < 0);
        }).value());
        let proc = spawn(path.resolve('.', 'node_modules', '.bin', 'gulp'), args, {stdio: 'inherit', shell: true});
        proc.on('close', function (code) {
          spawnWatch(code !== 0);
        });
      };
      spawnWatch();
    });
  }
};
