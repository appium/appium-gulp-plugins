import { expect } from 'chai';
import { B } from '../lib/b';


describe('b e2e', function () {
  it('should be able to get text', function () {
    const b = new B('hello world!');
    expect(b.getText()).to.equal('hello world!');
  });
});
