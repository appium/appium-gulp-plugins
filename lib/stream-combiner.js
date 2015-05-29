var util = require('util'),
    PassThrough = require('stream').PassThrough;

var StreamCombiner = function (pipeFn) {

  this.on('pipe', function (source) {
    source.unpipe(this);
    this.transformStream = pipeFn(source);
  });
};

util.inherits(StreamCombiner, PassThrough);

StreamCombiner.prototype.pipe = function (dest, options) {
  return this.transformStream.pipe(dest, options);
};

module.exports = StreamCombiner;
