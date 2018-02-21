"use strict";

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
  this.timeout(12000);
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

  describe('check transpiled code', function () {
    before(function () {
      return exec(`${GULP} transpile-es7-fixtures`);
    });

    it('should be able to run transpiled code', function () {
      return exec('node build/lib/run.js')
        .spread(function (stdout, stderr) {
          print(stdout, stderr);
          stderr.should.equal('');
          stdout.should.include('hello world!');
        });
    });

    it('should be able to run transpiled tests', function () {
      return exec(`${MOCHA} build/test/a-specs.js`)
        .spread(function (stdout, stderr) {
          print(stdout, stderr);
          stderr.should.equal('');
          stdout.should.include('1 passing');
        });
    });

    it('should not detect a rtts-assert error', function () {
      return exec('node build/lib/rtts-assert-error.js')
        .spread(function (stdout, stderr) {
          print(stdout, stderr);
          stderr.should.equal('');
          stdout.should.include('123');
          stdout.should.not.include('Invalid arguments given!');
        });
    });

    it('should use sourcemap when throwing', function () {
      return exec('node build/lib/throw.js')
        .spread(function (stdout, stderr) {
          print(stdout, stderr);
          let output = stdout + stderr;
          output.should.include('This is really bad!');
          output.should.include('.es7.js');
          output.should.include('throw.es7.js:7');
        });
    });

    it('should use sourcemap when throwing within mocha', function () {
      return exec(`${MOCHA} build/test/a-throw-specs.js`)
        .spread(function (stdout, stderr) {
          print(stdout, stderr);
          let output = stdout + stderr;
          output.should.include('This is really bad!');
          output.should.include('.es7.js');
          output.should.include('a-throw-specs.es7.js:11');
        });
    });

    it('should be able to use gulp-mocha', function () {
      return exec(`${GULP} test-es7-mocha`)
        .spread(function (stdout, stderr) {
          print(stdout, stderr);
          stderr.should.eql('');
          stdout.should.include('Finished');
        });
    });

    it('should use sourcemap when throwing within gulp-mocha', function () {
      return exec(`${GULP} --no-notif test-es7-mocha-throw`)
        .spread(function (stdout, stderr) {
          print(stdout, stderr);
          let output = stdout + stderr;
          output.should.include('This is really bad!');
          output.should.include('.es7.js');
        });
    });
  });
});
