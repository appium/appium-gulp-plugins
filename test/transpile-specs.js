/* eslint-disable promise/prefer-await-to-callbacks */
'use strict';

import B from 'bluebird';
import cp from 'child_process';
import chai from 'chai';
import fs from 'fs';
import _ from 'lodash';
import log from 'fancy-log';


chai.should();

const GULP = './node_modules/.bin/gulp';
const MOCHA = './node_modules/.bin/mocha';

const readFile = B.promisify(fs.readFile);

// we don't care about exec errors
const exec = function exec (...args) {
  return new B(function (resolve) {
    cp.exec(args.join(' '), function (err, stdout, stderr) {
      resolve([stdout, stderr]);
    });
  });
};

// some debug
const print = function print (stdout, stderr) {
  if (process.env.VERBOSE) {
    if ((stdout || '').length) {
      log(`stdout --> '${stdout}'`);
    }
    if ((stderr || '').length) {
      log(`stderr --> '${stderr}'`);
    }
  }
};

describe('transpile-specs', function () {
  this.timeout(60000);
  this.retries(0);

  const tests = {
    es7: {
      classFile: 'a',
      throwFile: 'a-throw.es7.js:7',
      throwTestFile: 'a-throw-specs.es7.js:8',
    },
    ts: {
      classFile: 'b',
      throwFile: 'b-throw.ts:6',
      throwTestFile: 'b-throw-specs.ts:7',
    },
  };

  for (const [name, files] of _.toPairs(tests)) {
    it(`should transpile ${name} fixtures`, async function () {
      const [stdout, stderr] = await exec(`${GULP} transpile-${name}-fixtures`);
      print(stdout, stderr);
      stderr.should.eql('');
      stdout.should.include('Finished');

      const content = await readFile(`build/lib/${files.classFile}.js`, 'utf8');
      content.should.have.length.above(0);
      content.should.include('sourceMapping');
    });

    describe('check transpiled', function () {
      before(async function () {
        await exec(`${GULP} transpile-fixtures`);
      });

      it(`should be able to run transpiled ${name} code`, function () {
        return exec(`node build/lib/${files.classFile}-run.js`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            stderr.should.equal('');
            stdout.should.include('hello world!');
          });
      });

      it(`should be able to run transpiled ${name} tests`, function () {
        return exec(`${MOCHA} build/test/${files.classFile}-specs.js`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            stderr.should.equal('');
            stdout.should.include('1 passing');
          });
      });

      it(`should use sourcemap when throwing (${name})`, function () {
        return exec(`node build/lib/${files.classFile}-throw.js`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            let output = stdout + stderr;
            output.should.include('This is really bad!');
            output.should.include(files.throwFile);
          });
      });

      it(`should use sourcemap when throwing within mocha (${name})`, function () {
        return exec(`${MOCHA} build/test/${files.classFile}-throw-specs.js`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            let output = stdout + stderr;
            output.should.include('This is really bad!');
            output.should.include(files.throwTestFile);
          });
      });

      it(`should be able to use gulp-mocha (${name})`, function () {
        return exec(`${GULP} test-${name}-mocha`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            stderr.should.eql('');
            stdout.should.include('Finished');
          });
      });

      it(`should use sourcemap when throwing within gulp-mocha (${name})`, function () {
        return exec(`${GULP} --no-notif test-${name}-mocha-throw`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            let output = stdout + stderr;
            output.should.include('This is really bad!');
            output.should.include(files.throwTestFile);
          });
      });
    });
  }

  // TypeScript will not compile such errors, so no need to test
  it('should not detect a rtts-assert error', function () {
    return exec('node build/lib/a-rtts-assert-error.js')
      .spread(function (stdout, stderr) {
        print(stdout, stderr);
        stderr.should.equal('');
        stdout.should.include('123');
        stdout.should.not.include('Invalid arguments given!');
      });
  });
});
