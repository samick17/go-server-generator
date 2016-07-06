const GoMethod = require('./go-model').GoMethod;
const format = require('util').format;

function createMethod(name) {
  return new GoMethod(name);
}

function createHandler(apiName, apiConfig) {
  var handlerBody = '';
  var isHead = true;
  var subHandlerConfigArray = [];
  for(var handlerMethod in apiConfig) {
    var config = apiConfig[handlerMethod];
    var syntax = '    ';
    if(!isHead) {
      syntax = ' else ';
    }
    var handlerName = format('handle%s%s', apiName.toNameCase(), handlerMethod.toNameCase());
    syntax += format('if r.Method == "%s" {\n        %s(w, r)\n    }', handlerMethod.toUpperCase(), handlerName);
    isHead = false;
    handlerBody += syntax;
    subHandlerConfigArray.push({
      methodName: handlerName,
      apiName: apiName,
      method: handlerMethod,
      config: config
    });
  }
  var mainHandlerMethod = createMethod(apiName + 'Handler');
  mainHandlerMethod.appendArg('w', 'http.ResponseWriter');
  mainHandlerMethod.appendArg('r', '*http.Request');
  mainHandlerMethod.appendBody(handlerBody);
  return {
    mainHandlerMethod: mainHandlerMethod,
    apiSubHandlerMethod: createSubHandler(subHandlerConfigArray)
  };
}

function createSubHandler(subHandlerConfigArray) {
  var apiSubHandlerMethod = [];
  for(var idx in subHandlerConfigArray) {
    var subHandlerConfig = subHandlerConfigArray[idx];
    var goMethod = createMethod(subHandlerConfig.methodName);
    goMethod.appendArg('w', 'http.ResponseWriter');
    goMethod.appendArg('r', '*http.Request');
    goMethod.appendBody(format('    fmt.Fprint(w, "%s %s")', subHandlerConfig.method.toUpperCase(), subHandlerConfig.apiName));
    apiSubHandlerMethod.push(goMethod);
  }
  return apiSubHandlerMethod;
}

module.exports = {
  createMethod: createMethod,
  createHandler: createHandler
};