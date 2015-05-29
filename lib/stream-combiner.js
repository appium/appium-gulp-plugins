var util = require('util')
  , PassThrough = require('stream').PassThrough;

var StreamCombiner = function () {
  this.streams = Array.prototype.slice.apply(arguments);

  this.on('pipe', function (source) {
    source.unpipe(this);
    for(var i in this.streams) {
      source = source.pipe(this.streams[i]);
    }
    this.transformStream = source;
  });
};

util.inherits(StreamCombiner, PassThrough);

StreamCombiner.prototype.pipe = function (dest, options) {
  return this.transformStream.pipe(dest, options);
};

module.exports = StreamCombiner;
