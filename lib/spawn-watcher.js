/* eslint promise/prefer-await-to-then: 0 */
/* eslint promise/catch-or-return: 0 */
"use strict";

const clear = require('clear');
const spawn = require('child_process').spawn;
const log = require('fancy-log');
const red = require('ansi-red');
const B = require('bluebird');
const notifier = require('node-notifier');
const moment = require('moment');
const _ = require('lodash');
const path = require('path');


const GULP_EXECUTABLE = path.resolve('.', 'node_modules', '.bin', 'gulp');

let gulp;

let exitOnError = false;
let clearTerminal = true;

let notify = function (subtitle, message) {
  if (process.argv.includes('--no-notif')) return; // eslint-disable-line curly
  let title;
  try {
    title = process.env.APPIUM_NOTIF_BUILD_NAME || 'Appium';
    notifier.notify({
      title,
      subtitle: `${subtitle}  ${moment().format('h:mm:ss')}`,
      message,
    });
  } catch (ign) {
    log(`Notifier: [${title}] ${message}`);
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
    log(red(err));
    const code = /\u001b\[(\d+(;\d+)*)?m/g;
    const notifyErr = ('' + err).replace(code, '');
    notify('Build failure!', notifyErr);
    if (exitOnError) {
      process.exit(1);
    }
  },

  configure (taskName, filePattern, sequence) {
    const subtaskName = '_' + taskName;
    const isRespawn = process.argv.includes('--respawn');

    const watchFn = function watchSquence () {
      return new B(function (resolve) {
        (gulp.series(...sequence, function finishWatchSequence (done) {
          resolve();
          done();
        }))();
      });
    };

    gulp.task(subtaskName, function () {
      exitOnError = true;
      gulp.watch(filePattern, function watchTask () {
        if (clearTerminal) {
          clear();
        }
        return watchFn().then(notifyOK);
      });
      gulp.watch(['gulpfile.js'], function () {
        process.exit(0);
      });

      if (!isRespawn) {
        B.delay(500).then(function () {
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
        if (process.argv.includes('--no-notif')) {
          args.push('--no-notif');
        }
        if (respawn) {
          args.push('--respawn');
        }
        args = args.concat(_.chain(process.argv).tail(2).filter(function (arg) {
          if (/gulp$/.test(arg)) return false; // eslint-disable-line curly
          return ![taskName, subtaskName, '--no-notif', '--respawn'].includes(arg);
        }).value());
        const proc = spawn(GULP_EXECUTABLE, args, {stdio: 'inherit', shell: true});
        proc.on('close', function (code) {
          spawnWatch(code !== 0);
        });
      };
      spawnWatch();
    });
  }
};
