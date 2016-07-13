const GoModel = require('./go-model');
const GoFile = GoModel.GoFile;
const GoMethod = GoModel.GoMethod;
const format = require('util').format;

function createFile(packageName, name) {
  var goFile = new GoFile(name);
  goFile.setPackage(packageName);
  return goFile;
}

function createMethod(name) {
  return new GoMethod(name);
}

function createHandler(apiName, apiConfig, wfCallback) {
  var code = '';
  var goFile = createFile('routes', apiName);
  goFile.importModule('net/http');
  goFile.importModule('fmt');

  /*const goServerConfig = {
    package: 'routes',
    import: ['net/http', 'fmt']
  };
  code += format('package %s\n\n', goServerConfig.package);
  code += format('import (\n');
  for(var i in goServerConfig.import) {
    var imp = goServerConfig.import[i];
    code += format('    "%s"\n', imp);
  }
  code += ')\n\n';*/
  var handlerBody = '';
  var isHead = true;
  var subHandlerConfigArray = [];
  for(var handlerMethod in apiConfig) {
    var config = apiConfig[handlerMethod];
    var syntax = '';
    if(!isHead) {
      syntax = ' else ';
    }
    var handlerName = format('handle%s%s', apiName.toNameCase(), handlerMethod.toNameCase());
    syntax += format('if r.Method == "%s" {\n    %s(w, r)\n}', handlerMethod.toUpperCase(), handlerName);
    isHead = false;
    handlerBody += syntax;
    subHandlerConfigArray.push({
      methodName: handlerName,
      apiName: apiName,
      method: handlerMethod,
      config: config
    });
  }
  var mainHandlerMethod = createMethod('New' + apiName.toNameCase() + 'Handler');
  mainHandlerMethod.returnType = 'http.HandlerFunc';
  var mainHandlerReturnMethod = createMethod('');
  mainHandlerReturnMethod.appendArg('w', 'http.ResponseWriter');
  mainHandlerReturnMethod.appendArg('r', '*http.Request');
  mainHandlerReturnMethod.appendBody(handlerBody);
  mainHandlerReturnMethod.padRight();
  mainHandlerMethod.appendBody(format('return %s', mainHandlerReturnMethod));
  mainHandlerMethod.padRight();

  var subHandlerMethod = createSubHandler(subHandlerConfigArray);
  if(wfCallback) {
    /*var handlerCode = '';
    handlerCode += code;
    handlerCode += mainHandlerMethod.toString();
    handlerCode += '\n\n';
    //handlerCode += subHandlerMethod.join('\n\n');*/
    goFile.addMethod(mainHandlerMethod);
    for(var i in subHandlerMethod) {
      var method = subHandlerMethod[i];
      goFile.addMethod(method);
    }
    //handlerCode += '\n\n';
    wfCallback('./output/'+goFile.package, goFile.name, goFile.toString());
  }
  return mainHandlerMethod;
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
  createFile: createFile,
  createMethod: createMethod,
  createHandler: createHandler
};