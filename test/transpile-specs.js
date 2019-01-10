/* eslint-disable no-console */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/prefer-await-to-then */
'use strict';

import B from 'bluebird';
import cp from 'child_process';
import chai from 'chai';
import fs from 'fs';


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
      console.log(`stdout --> '${stdout}'`);
    }
    if ((stderr || '').length) {
      console.log(`stderr --> '${stderr}'`);
    }
  }
};

describe('transpile-specs', function () {
  this.timeout(60000);
  this.retries(0);

  it('should transpile es7 fixtures', function () {
    return exec(`${GULP} transpile-es7-fixtures`)
      .spread(function (stdout, stderr) {
        print(stdout, stderr);
        stderr.should.eql('');
        stdout.should.include('Finished');
      }).then(function () {
        return readFile('build/lib/a.js', 'utf8');
      }).then(function (content) {
        content.should.have.length.above(0);
        content.should.include('sourceMapping');
      });
  });

  it('should transpile ts fixtures', function () {
    return exec(`${GULP} transpile-ts-fixtures`)
      .spread(function (stdout, stderr) {
        print(stdout, stderr);
        stderr.should.eql('');
        stdout.should.include('Finished');
      }).then(function () {
        return readFile('build/lib/b.js', 'utf8');
      }).then(function (content) {
        content.should.have.length.above(0);
        content.should.include('sourceMapping');
      });
  });

  describe('check transpiled', function () {
    before(function () {
      return exec(`${GULP} transpile-fixtures`);
    });

    describe('code', function () {
      it('should be able to run transpiled es7 code', function () {
        return exec('node build/lib/a-run.js')
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            stderr.should.equal('');
            stdout.should.include('hello world!');
          });
      });

      it('should be able to run transpiled ts code', function () {
        return exec('node build/lib/b-run.js')
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            stderr.should.equal('');
            stdout.should.include('hello world!');
          });
      });
    });

    describe('tests', function () {
      it('should be able to run transpiled es7 tests', function () {
        return exec(`${MOCHA} build/test/a-specs.js`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            stderr.should.equal('');
            stdout.should.include('1 passing');
          });
      });

      it('should be able to run transpiled s tests', function () {
        return exec(`${MOCHA} build/test/b-specs.js`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            stderr.should.equal('');
            stdout.should.include('1 passing');
          });
      });
    });

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

    describe('sourcemaps', function () {
      it('should use sourcemap when throwing (es7)', function () {
        return exec('node build/lib/a-throw.js')
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            let output = stdout + stderr;
            output.should.include('This is really bad!');
            output.should.include('a-throw.es7.js:7');
          });
      });

      it('should use sourcemap when throwing (ts)', function () {
        return exec('node build/lib/b-throw.js')
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            let output = stdout + stderr;
            output.should.include('This is really bad!');
            output.should.include('b-throw.ts:6');
          });
      });

      it('should use sourcemap when throwing within mocha (es7)', function () {
        return exec(`${MOCHA} build/test/a-throw-specs.js`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            let output = stdout + stderr;
            output.should.include('This is really bad!');
            output.should.include('a-throw-specs.es7.js:8');
          });
      });

      it('should use sourcemap when throwing within mocha (ts)', function () {
        return exec(`${MOCHA} build/test/b-throw-specs.js`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            let output = stdout + stderr;
            output.should.include('This is really bad!');
            output.should.include('b-throw-specs.ts:7');
          });
      });
    });

    describe('gulp-mocha', function () {
      it('should be able to use gulp-mocha (es7)', function () {
        return exec(`${GULP} test-es7-mocha`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            stderr.should.eql('');
            stdout.should.include('Finished');
          });
      });

      it('should be able to use gulp-mocha (ts)', function () {
        return exec(`${GULP} test-ts-mocha`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            stderr.should.eql('');
            stdout.should.include('Finished');
          });
      });

      it('should use sourcemap when throwing within gulp-mocha (es7)', function () {
        return exec(`${GULP} --no-notif test-es7-mocha-throw`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            let output = stdout + stderr;
            output.should.include('This is really bad!');
            output.should.include('a-throw-specs.es7.js:8');
          });
      });

      it('should use sourcemap when throwing within gulp-mocha (ts)', function () {
        return exec(`${GULP} --no-notif test-ts-mocha-throw`)
          .spread(function (stdout, stderr) {
            print(stdout, stderr);
            let output = stdout + stderr;
            output.should.include('This is really bad!');
            output.should.include('b-throw-specs.ts:7');
          });
      });
    });
  });
});
