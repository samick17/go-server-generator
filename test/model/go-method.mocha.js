const GoModel = require('../../model/go-model');
const assert = require('assert');

describe('Supposed we have go model', function() {

  it('a "foo" method with no args and empty body', function(done) {
    var m1 = new GoModel.GoMethod('foo');
    m1.toString().should.equal('func foo() {\n}');
    done();
  });

  it('a "foo1" method with two args and empty body', function(done) {
    var m1 = new GoModel.GoMethod('foo1');
    m1.appendArg('a', 'String');
    m1.appendArg('b', 'Integer');
    m1.toString().should.equal('func foo1(a String, b Integer) {\n}');
    done();
  });

  it('a "foo1" method with no args and body', function(done) {
    var m1 = new GoModel.GoMethod('foo1');
    m1.appendBody('fmt.Println("asd")');
    m1.toString().should.equal('func foo1() {\nfmt.Println("asd")\n}');
    done();
  });
});