'use strict';

const fs = require('fs');
const path = require('path');
const log = require('fancy-log');
const findRoot = require('find-root');
const requestPromise = require('request-promise');
const request = require('request');
const B = require('bluebird');
const os = require('os');
const Octokit = require('@octokit/rest');
const _ = require('lodash');


const readFile = B.promisify(fs.readFile, {context: fs});
const writeFile = B.promisify(fs.writeFile, {context: fs});

const ASSET_NAME_REGEXP = /^appium-\S+.zip$/;

const GITHUB_OWNER = 'appium';
const GITHUB_REPO = 'appium-build-store';

const OUTPUT_INTERVAL = 60000;

const MOCHA_PARALLEL_TEST_BROKEN_LINE = `if (value.type === 'test') {`;
const MOCHA_PARALLEL_TEST_FIXED_LINE = `if (value.type === 'test') {\n        delete value.fn;`;

const octokit = Octokit();

const configure = function configure (gulp, opts) {
  const owner = opts.ci.owner || GITHUB_OWNER;
  const repo = opts.ci.repo || GITHUB_REPO;

  const root = opts.projectRoot ? opts.projectRoot : findRoot(__dirname);

  /**
   * `mocha-parallel-tests` is broken at the moment, so skipped describe blocks fail
   * the fix is simple, and this patches the error until they fix the package
   **/
  gulp.task('fix-mocha-parallel-tests', async function fixMochaParallelTests () {
    log(`Updating 'mocha-parallel-tests'`);
    const filePath = path.resolve(root, 'node_modules', 'mocha-parallel-tests', 'dist', 'main', 'util.js');

    log(`File: '${filePath}'`);

    try {
      let script = await readFile(filePath, {encoding: 'utf8'});
      script = await script.replace(MOCHA_PARALLEL_TEST_BROKEN_LINE, MOCHA_PARALLEL_TEST_FIXED_LINE);
      await writeFile(filePath, script);
    } catch (err) {
      const msg = err.message.includes('ENOENT')
        ? `File '${filePath}' does not exist`
        : err.message;
      log.error(`Unable to fix: ${msg}`);
    }
  });


  gulp.task('github:authenticate', function githubAuthenticate (done) {
    const githubToken = process.env.GITHUB_TOKEN;

    if (_.isEmpty(githubToken)) {
      log.warn('No GitHub token found in GITHUB_TOKEN environment variable');
      return;
    }

    // this produces a deprecation notice, but the alternative does not work
    octokit.authenticate({
      type: 'token',
      token: githubToken,
    });
    done();
  });

  gulp.task('github:upload', async function githubUpload () {
    const buildName = process.env.BUILD_NAME || `${Date.now()}`;
    const commitMessage = process.env.COMMIT_MESSAGE || 'No commit message provided';

    const releaseTag = `appium-build-${buildName}`;
    const releaseFile = `appium-${buildName}.zip`;

    let releaseId;
    try {
      log(`Creating release on '${owner}/${repo}'`);
      const res = await octokit.repos.createRelease({
        owner,
        repo,
        tag_name: releaseTag,
        name: `Appium build ${buildName}`,
        body: `Appium build for commit ${buildName}\n'${commitMessage}'`,
      });

      releaseId = res.data.id;
      log(`Created release '${releaseTag}' (id: ${releaseId})`);

      const url = res.data.upload_url;
      const file = path.resolve(root, 'appium.zip');
      log(`Uploading file '${file}'`);
      await octokit.repos.uploadReleaseAsset({
        headers: {
          'content-length': fs.statSync(file).size,
          'content-type': 'application/zip',
        },
        url,
        file: fs.createReadStream(file),
        name: releaseFile,
      });
      log(`Uploaded release file '${releaseFile}'`);
    } catch (err) {
      log.error(`Error uploading release asset: ${err.message}`);
      if (err.errors) {
        log.error(JSON.stringify(err.errors, 2));
      }

      if (releaseId) {
        log('Deleting release with no asset');
        await octokit.repos.deleteRelease({
          owner,
          repo,
          release_id: releaseId,
        });
        log('Release deleted');
      }
      throw new Error(`Error uploading release: ${err.message}`);
    }
  });

  gulp.task('github-upload', gulp.series(['github:authenticate', 'github:upload']));

  gulp.task('github:download', async function githubDownload () {
    log.info('Downloading GitHub asset');
    const tempDir = os.tmpdir();
    log.info(`Temporary directory for download: '${tempDir}'`);

    log.info(`Downloading repository: '${owner}/${repo}'`);
    const res = await octokit.repos.getLatestRelease({owner, repo});
    // go through the assets and find the correct one
    for (const asset of res.data.assets) {
      if (ASSET_NAME_REGEXP.test(asset.name)) {
        log.info(`Downloading asset from '${asset.browser_download_url}'`);
        const url = asset.browser_download_url;
        return new B(function getUrl (resolve, reject) {
          request(url)
            .on('error', reject) // handle real errors, like connection errors
            .on('response', function onResponse (res) {
              // handle responses that fail, like 404s
              if (res.statusCode >= 400) {
                return reject(`Error downloading file: ${res.statusCode}`);
              }
            })
            .pipe(fs.createWriteStream(`${tempDir}/appium.zip`))
            .on('close', resolve);
        });
      }
    }
    throw new Error(`Unable to find Appium build asset`);
  });

  gulp.task('saucelabs:upload', async function sauceLabsUpload () {
    // Find the latest bundle
    log.info('Uploading to Sauce Storage');
    const tempDir = os.tmpdir();
    log.info(`Temporary directory for upload: '${tempDir}'`);
    const options = {
      method: 'POST',
      uri: `https://saucelabs.com/rest/v1/storage/${process.env.SAUCE_USERNAME}/appium.zip?overwrite=true`,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      auth: {
        user: process.env.SAUCE_USERNAME,
        pass: process.env.SAUCE_ACCESS_KEY,
      },
      formData: {
        file: {
          value: fs.createReadStream(`${tempDir}/appium.zip`),
          options: {
            filename: 'appium.zip',
            contentType: 'application/zip, application/octet-stream',
          },
        }
      },
      json: true,
    };
    const body = await requestPromise(options);
    // username should not end up in the logs
    body.username = '*'.repeat((body.username || '').length);
    log.info(`File uploaded: ${JSON.stringify(body)}`);
  });

  gulp.task('sauce-storage-upload', gulp.series(['github:authenticate', 'github:download', 'saucelabs:upload']));


  /**
   * This task is meant to be backgrounded, and killed using OS tools, so it
   * never finishes.
   *   $ $(npm bin)/gulp periodic-output &
   *   [1] 38060
   *   [08:56:53] Using gulpfile ~/code/appium-xcuitest-driver/gulpfile.js
   *   [08:56:53] Starting 'periodic-output'...
   *   $ kill 38060
   *   [1]  + 38060 terminated  $(npm bin)/gulp periodic-output
   */
  gulp.task('periodic-output', function periodicOutput () {
    const interval = opts.ci.interval || OUTPUT_INTERVAL;
    return new B(function writeToStdout () {
      setInterval(function print () {
        process.stdout.write('.');
      }, interval);
    });
  });
};

module.exports = {
  configure,
};
