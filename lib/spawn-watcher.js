/* eslint promise/catch-or-return: 0 */
'use strict';

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

let clearTerminal = true;

const notify = function (subtitle, message) {
  if (process.argv.includes('--no-notif')) return; // eslint-disable-line curly

  const title = process.env.APPIUM_NOTIF_BUILD_NAME || 'Appium';
  try {
    notifier.notify({
      title,
      subtitle: `${subtitle}  ${moment().format('h:mm:ss')}`,
      message,
    });
  } catch (ign) {
    log(`Notifier: [${title}] ${message}`);
  }
};

const notifyOK = notify.bind(null, 'Build success!', 'All Good!');

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
    err = '' + err;
    for (const line of err.split('\n')) {
      log.error(red(line));
    }
    const code = /\u001b\[(\d+(;\d+)*)?m/g; // eslint-disable-line no-control-regex
    const notifyErr = err.replace(code, '');
    notify('Build failure!', notifyErr);
    process.exit(1);
  },

  configure (taskName, filePattern, sequence) {
    const subtaskName = `_${taskName}`;
    const isRespawn = process.argv.includes('--respawn');

    const watchFn = function watchSquence () {
      return new B(function (resolve) {
        (gulp.series(...sequence, function finishWatchSequence (done) {
          resolve();
          done();
        }))();
      });
    };

    gulp.task(subtaskName, async function () {
      gulp.watch(filePattern, async function watchTask () {
        if (clearTerminal) {
          clear();
        }
        notifyOK(await watchFn());
      });
      gulp.watch(['gulpfile.js'], function () {
        process.exit(0);
      });

      if (!isRespawn) {
        await B.delay(500);
        notifyOK(await watchFn());
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
