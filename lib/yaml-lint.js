/* eslint-disable promise/prefer-await-to-callbacks */
const { Transform } = require('stream');
const log = require('fancy-log');
const yaml = require('js-yaml');
const { EOL } = require('os');
const PluginError = require('plugin-error');


function gulpYamlLint (options = {}) {
  return new Transform({
    objectMode: true,
    transform (file, enc, cb) {
      let errCount = 0;
      try {
        if (options.safe === true) {
          yaml.safeLoad(file.contents.toString(enc));
        } else {
          yaml.load(file.contents.toString(enc));
        }
      } catch (err) {
        errCount++;
        log.error(`Invalid YAML file: '${file.path}'`);
        for (const line of err.message.split(EOL)) {
          log.error(line);
        }
      }
      cb(errCount === 0
        ? null
        : new PluginError('gulp-yaml-lint', {
          name: 'YAMLError',
          message: `Failed with ${errCount} ${errCount === 1 ? 'error' : 'errors'}`,
        })
      );
    }
  });
}

module.exports = gulpYamlLint;