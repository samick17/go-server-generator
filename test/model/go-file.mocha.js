const GoModel = require('../../model/go-model');
const GoFile = GoModel.GoFile;
const GoMethod = GoModel.GoMethod;
const assert = require('assert');

describe('Supposed go model', function() {

  it('create go file', function(done) {
    var mainFile = new GoFile();

    mainFile.setPackage('main');
    mainFile.importModule('fmt');

    var m1 = new GoMethod('main');
    m1.appendBody('fmt.Println("Oh my god!")'.padRight());
    mainFile.addMethod(m1);
    
    mainFile.toString().should.equal('package main\n\nimport(\n    "fmt"\n)\n func main() {\n    fmt.Println("Oh my god!")\n}');
    done();
  });
});