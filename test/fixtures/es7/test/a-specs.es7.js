// transpile:mocha

import 'mochawait';
import chai from 'chai';
import {A} from '../lib/a';

chai.should();


describe('a', () => {
  it('should be able to get text', () => {
    var a = new A('hello world!');
    a.getText().should.equal('hello world!');
  });
});

