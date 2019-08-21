import chai from 'chai';


chai.should();

describe('eslint', function () {
  it('should be able to handle for-of loops', function () {
    // eslint@6.2.0 introduced an error in for-of loops
    // see https://github.com/eslint/eslint/issues/12117
    // this test allows us to see if an update fixes the issue, via Greenkeeper
    for (const variable of [1, 2, 3]) {
      variable.should.be.at.least(0);
    }
  });
});
