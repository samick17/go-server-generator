const Generator = require('../generator');
const assert = require('assert');

describe('Supposed we have a generator', function() {

  beforeEach(function(done) {
    done();
  });

  afterEach(function(done) {
    done();
  });

  it('generate server with empty config', function(done) {
    Generator.generate('').should.equal('');
    done();
  });
});