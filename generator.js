const format = require('util').format;
const fs = require('fs');
const path = require('path');
const GoModelFactory = require('./model/go-model-factory');
require('./str-prototype');

function writeFile(folder, name, text) {
  function doWriteFile(filePath, text) {
    fs.writeFile(format('%s.go', filePath), text, function(err) {
      if(err) throw err;
    });
  }
  fs.exists(folder, function(isExists) {
    if(isExists) {
      doWriteFile(path.join(folder, name), text);
    }
    else {
      fs.mkdir(folder, function() {
        doWriteFile(path.join(folder, name), text);
      });
    }
  });
}

function genHttpRouteListener(routeName, apiName) {
  return format('    http.HandleFunc("/%s", %s)\n', routeName, apiName+'Handler');
}

function genHttpListenCode(port) {
  return format('    err := http.ListenAndServe(":%s", nil)\n'+
   '    if err != nil {\n'+
   '        panic(":" + err.Error())\n'+
   '    }', port)
}

function generateBaseHttpServerCode(config) {
  var code = '';
  const goServerConfig = {
    package: 'main',
    import: ['net/http', 'fmt']
  };
  code += format('package %s\n\n', goServerConfig.package);
  code += format('import (\n');
    for(var i in goServerConfig.import) {
      var imp = goServerConfig.import[i];
      code += format('    "%s"\n', imp);
    }
    code += ')\n\n';
/*main func*/
var mainFuncBody = '';
for(var apiName in config.api) {
  var apiConfig = config.api[apiName];
  var handler = GoModelFactory.createHandler(apiName, apiConfig);
  code += handler.mainHandlerMethod.toString();
  code += '\n\n';
  code += handler.apiSubHandlerMethod.join('\n\n');
  code += '\n\n';
  mainFuncBody += genHttpRouteListener(apiName, apiName);
}
mainFuncBody += genHttpListenCode(config.server.port);
var mainMethod = GoModelFactory.createMethod('main');
mainMethod.appendBody(mainFuncBody);
code += mainMethod.toString();
return code;
}

/*config exmaple*/
/*
config: {
  server: {
    port: 80
  },
  api: {
    author: {
      get: {},
      put: {},
      post: {},
      delete: {}
    },
    book: {
      get: {},
      put: {},
      post: {},
      delete: {}
    }
  }
}
*/
function generate(config) {
  if(config) {
    var code = generateBaseHttpServerCode(config);
    writeFile('./output', 'main', code);
    return code;
  }
  else {
    return '';
  }
}

module.exports = {
  generate: generate
};

/*here goes the sample for generating by config*/
/*
(function() {
  generate({
    server: {
      port: 80
    },
    api: {
      book: {
        get: {},
        put: {},
        post: {},
        delete: {}
      },
      author: {
        get: {},
        put: {},
        post: {},
        delete: {}
      }
    }
  });
})();
*/