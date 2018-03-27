/* global describe:true, it:true */
// transpile:mocha

import chai from 'chai';
import {A} from '../lib/a';

chai.should();

describe('a', function () {
  it('should be able to get text', function () {
    let a = new A('hello world!');
    a.getText().should.equal('hello world!');
  });
});

