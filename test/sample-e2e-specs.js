'use strict';

import chai from 'chai';


chai.should();

describe('sample-e2e-specs', function () {
  this.timeout(12000);
  this.retries(0);

  it('should get run', function () {
    true.should.be.true;
  });
});
