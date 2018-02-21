"use strict";

const coverage = require('./coverage');
const lint = require('./lint');
const test = require('./test');
const e2eTest = require('./e2e-test');
const unitTest = require('./unit-test');
const clean = require('./clean');
const transpile = require('./transpile');

const configure = function configure (gulp, opts, env) {
  clean.configure(gulp, opts);

  transpile.configure(gulp, opts, env);

  test.configure(gulp, opts, env);

  coverage.configure(gulp, opts, env);

  lint.configure(gulp, opts);
};

module.exports = {
  configure,
  coverage,
  lint,
  e2eTest,
  unitTest,
};