import { B } from '../lib/b';


describe('b-throw', function () {
  it('should throw', function () {
    const b = new B('hello world!');
    b.throwError('This is really bad!');
  });
});
