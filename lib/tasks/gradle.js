/* eslint-disable promise/prefer-await-to-then */

const argv = require('yargs').argv;
const replace = require('replace-in-file');
const log = require('fancy-log');
const semver = require('semver');
const globby = require('globby');


function logFileChanges (changes = []) {
  log(`Updated files: ${changes.join(', ')}`);
}

const configure = function configure (gulp) {
  gulp.task('gradle-version-update', function () {
    let gradleFile;
    return globby(['app/build.gradle'])
      .then(function getGradleFile (files) {
        if (!files.length) {
          throw new Error('No app/build.gradle file found');
        }
        return files[0];
      }).then(function setGradleFile (file) {
        gradleFile = file;
      }).then(function getPackageVersion () {
        // get the version
        const version = argv['package-version'];
        if (!version) {
          throw new Error('No package version argument (use `--package-version=xxx`)');
        }
        if (!semver.valid(version)) {
          throw new Error(`Invalid version specified '${version}'. Version should be in the form '1.2.3'`);
        }
        return version;
      }).then(function updateVersionName (version) {
        return replace({
          files: gradleFile,
          from: /^\s*versionName\s+['"](.+)['"]$/gm,
          to: (match) => {
            log(`Updating gradle build file to version name '${version}'`);
            // match will be like `versionName '1.2.3'`
            return match.replace(/\d+\.\d+\.\d+/, version);
          },
        });
      }).then(logFileChanges)
      .then(function updateVersionCode () {
        return replace({
          files: gradleFile,
          from: /^\s*versionCode\s+(.+)$/gm,
          to: (match) => {
            // match will be like `versionCode 42`
            const codeMatch = /\d+/.exec(match.trim());
            if (!codeMatch) {
              throw new Error('Unable to find existing version code');
            }
            const code = parseInt(codeMatch[0], 10) + 1;
            log(`Updating gradle build file to version code '${code}'`);
            return match.replace(/\d+/, code);
          },
        });
      }).then(logFileChanges);
  });
};

module.exports = {
  configure,
};
