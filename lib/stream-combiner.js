"use strict";

let through = require('through2'),
    EE = require('events').EventEmitter;


module.exports = function (pipeFn) {
  let inStream = through.obj();
  let outStream = pipeFn(inStream);
  let combinedStream = new EE(); // not a real stream, just pretending
  combinedStream.on('pipe', function (source) {
    source.unpipe(this);
    source.pipe(inStream);
  });
  combinedStream.pipe = function (dest, options) {
    return outStream.pipe(dest, options);
  };
  return combinedStream;
};
