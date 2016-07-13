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

function genHttpRouteListener(routeHandler, routeName, apiName) {
  return format('    http.HandleFunc("/%s", routes.%s())\n', routeName, routeHandler.name);
}

function genHttpListenerCode(port) {
  return format('    err := http.ListenAndServe(":%s", nil)\n'+
   '    if err != nil {\n'+
   '        panic(":" + err.Error())\n'+
   '    }', port)
}

function generateBaseHttpServerCode(config, wfCallback) {
  var goFile = GoModelFactory.createFile('main', 'main');
  goFile.importModule('net/http');
  goFile.importModule('./routes');
  /*main func*/
  var mainFuncBody = '';
  
  if(wfCallback) {
    wfCallback('./output', 'main', '');
  }
  for(var apiName in config.api) {
    var handlerCode = '';
    var apiConfig = config.api[apiName];  
    var handler = GoModelFactory.createHandler(apiName, apiConfig, wfCallback);
    mainFuncBody += genHttpRouteListener(handler, apiName, apiName);
  }
  mainFuncBody += genHttpListenerCode(config.server.port);
  var mainMethod = GoModelFactory.createMethod('main');
  mainMethod.appendBody(mainFuncBody);
  goFile.addMethod(mainMethod);
  var code = goFile.toString();
  if(wfCallback) {
    wfCallback('./output', 'main', code);
  }
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
function generate(config, writeToFile) {
  if(config) {
    var code = generateBaseHttpServerCode(config, writeToFile ? writeFile : null);
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
/*var handler = GoModelFactory.createHandler('book', 
      {
        get: {},
        put: {},
        post: {},
        delete: {}
      });
console.log(handler.mainHandlerMethod.toString());
console.log(handler.apiSubHandlerMethod[0].toString());*/
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
  }, true);
})();
*/