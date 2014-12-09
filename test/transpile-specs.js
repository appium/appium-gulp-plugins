var Q = require('q'),
    Args = require("vargs").Constructor,
    _exec = require('child_process').exec,
    chai = require('chai'),
    openFile = Q.denodeify(require('fs').open),
    closeFile = Q.denodeify(require('fs').close);

chai.should();

// we don't care about exec errors
var exec = Q.denodeify(function () {
  var args = new Args (arguments);
  _exec.apply(null, args.all.concat([function (err, stdout, stderr) {
    args.callback(null, stdout, stderr);
  }]));
});

// some debug
function print(stdout, stderr) {
  if (process.env.VERBOSE) {
    if ((stdout || '').length) console.log('stdout -->', stdout);
    if ((stderr || '').length > 0) console.log('stderr -->', stderr);
  }
}

describe('transpile-specs', function () {
  this.timeout(10000);

  it('should transpile es7 fixtures', function () {
    return exec('./node_modules/.bin/gulp transpile-es7-fixtures')
      .spread(function (stdout, stderr) {
        print(stdout, stderr);
        stderr.should.equal('');
        stdout.should.include('Finished');
     }).then(function () {
       return openFile('build/lib/a.js', 'r')
     }).then(function (fd) {
      return closeFile(fd);
    });
  });

  describe('check transpiled code', function() {

   before(function() {
      return exec('./node_modules/.bin/gulp transpile-es7-fixtures');
    });

    it('should be able to run transpiled code', function () {
      return exec('node build/lib/run.js')
        .spread(function (stdout, stderr) {
          print(stdout, stderr);
          stderr.should.equal('');
          stdout.should.include('hello world!');
       })
    });

    it('should be able to run transpiled tests', function () {
      return exec('./node_modules/.bin/mocha build/test/a-specs.js')
        .spread(function (stdout, stderr) {
          print(stdout, stderr);
          stderr.should.equal('');
          stdout.should.include('1 passing');
      })
    });

    it('should use sourcemap when throwing', function () {
      return exec('node build/lib/throw.js')
       .spread(function (stdout, stderr) {
          print(stdout, stderr);
          var output = stdout + stderr;
          output.should.include('This is really bad!');
          output.should.include('.es7.js');
          output.should.include('throw.es7.js:7');
       })
    });

    it('should use sourcemap when throwing within mocha', function () {
      return exec('./node_modules/.bin/mocha build/test/a-throw-specs.js')
       .spread(function (stdout, stderr) {
          print(stdout, stderr);
          var output = stdout + stderr;
          output.should.include('This is really bad!');
          output.should.include('.es7.js');
          output.should.include('a-throw-specs.es7.js:13');
       })
    });

    it('should be able to use gulp-mocha', function () {
      return exec('./node_modules/.bin/gulp test-es7-mocha')
        .spread(function (stdout, stderr) {
          print(stdout, stderr);
          stderr.should.equal('');
          stdout.should.include('Finished');
       })
    });

    it('should use sourcemap when throwing within gulp-mocha', function () {
      return exec('./node_modules/.bin/gulp --no-notif test-es7-mocha-throw')
        .spread(function (stdout, stderr) {
          print(stdout, stderr);
          var output = stdout + stderr;
          output.should.include('This is really bad!');
          output.should.include('.es7.js');
       })
    });

  })
});
