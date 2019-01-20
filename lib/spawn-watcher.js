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

const COLOR_CODE_REGEXP = /\u001b\[(\d+(;\d+)*)?m/g; // eslint-disable-line no-control-regex

module.exports = {
  use (gulp, opts = {}) {
    this.gulp = gulp;
    this.title = opts.build || 'Appium';
    this.clearTerminal = true;
    return this;
  },

  notify (subtitle, message) {
    if (process.argv.includes('--no-notif')) {
      return;
    }

    try {
      notifier.notify({
        title: this.title,
        subtitle: `${subtitle}  ${moment().format('h:mm:ss')}`,
        message,
      });
    } catch (ign) {
      log(`Notifier: [${this.title}] ${message}`);
    }
  },

  notifyOK () {
    this.notify('Build success!', 'All Good!');
  },

  clear (clearTerminal) {
    this.clearTerminal = clearTerminal;
    return this;
  },

  handleError (err) {
    // log the error
    const strErr = '' + err;
    for (const line of strErr.split('\n')) {
      log.error('s', red(line));
    }

    // use the system notifier
    const notifyErr = strErr.replace(COLOR_CODE_REGEXP, '');
    this.notify('Build failure!', notifyErr);
    process.exit(1);
  },

  configure (taskName, filePattern, sequence) {
    const subtaskName = `_${taskName}`;
    const isRespawn = process.argv.includes('--respawn');

    const watchFn = () => {
      return new B((resolve) => {
        (this.gulp.series(...sequence, function finishWatchSequence (done) {
          resolve();
          done();
        }))();
      });
    };

    this.gulp.task(subtaskName, async () => {
      this.gulp.watch(filePattern, async () => {
        if (this.clearTerminal) {
          clear();
        }
        this.notifyOK(await watchFn());
      });
      this.gulp.watch(['gulpfile.js'], function () {
        log('Gulpfile has been changed. Exiting');
        process.exit(0);
      });

      if (!isRespawn) {
        await B.delay(500);
        this.notifyOK(await watchFn());
      }
    });

    this.gulp.task(taskName, () => {
      if (this.clearTerminal) {
        clear();
      }
      const spawnWatch = function (respawn) {
        let args = [subtaskName];
        if (process.argv.includes('--no-notif')) {
          args.push('--no-notif');
        }
        if (respawn) {
          args.push('--respawn');
        }
        args = args.concat(_.chain(process.argv).tail(2).filter(function (arg) {
          if (/gulp$/.test(arg)) {
            return false;
          }
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
