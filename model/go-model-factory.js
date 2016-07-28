const GoModel = require('./go-model');
const GoFile = GoModel.GoFile;
const GoTypeDefined = GoModel.GoTypeDefined;
const GoMethodArg = GoModel.GoMethodArg;
const GoMethodCaller = GoModel.GoMethodCaller;
const GoMethod = GoModel.GoMethod;
const GoStructField = GoModel.GoStructField;
const GoStruct = GoModel.GoStruct;
const format = require('util').format;

function createFile(packageName, name) {
  var goFile = new GoFile(name);
  goFile.setPackage(packageName);
  return goFile;
}

function createTypeDefined(name, type) {
  return new GoTypeDefined(name, type);
}

function createStructField(name, type, bsonJsonName) {
  return new GoStructField(name, type, bsonJsonName);
}

function createStruct(name, fields) {
  return new GoStruct(name, fields);
}

function createArg(name, type) {
  return new GoMethodArg(name, type);
}

function createMethodCaller(name, type) {
  return new GoMethodCaller(name, type);
}

function createMethod(name, args, returnType) {
  return new GoMethod(name, args, returnType);
}

function createRouter(wfCallback) {
  var code = '';
  var goFile = createFile('routes', 'router');
  goFile.importModule('fmt');
  goFile.importModule('net/http');
  goFile.importModule('strings');

  goFile.addTypeDefined(createTypeDefined('Handle', 'func(http.ResponseWriter, *http.Request, Params)'));

  goFile.addVar('NotFoundHandle', null, 'func() Handle {\n  return func(w http.ResponseWriter, r *http.Request, p Params) {\n    w.WriteHeader(404)\n    fmt.Fprintf(w, "404 NotFound")\n  }\n}()')
  goFile.addVar('instance', '*Router')
  goFile.addVar('NotFoundNode', null, 'createNotFoundNode()')
  goFile.addVar('NotFoundLeaf', null, 'createLeaf(NotFoundNode, "", NotFoundHandle)')

  var routerStruct = createStruct('Router');
  routerStruct.addFieldByValue('root', '*RouteNode');
  goFile.addStruct(routerStruct);

  var paramsStruct = createStruct('Params');
  paramsStruct.addFieldByValue('values', 'map[string]string');
  goFile.addStruct(paramsStruct);

  var paramsGetMethod = createMethod('Get', [createArg('field', 'string')], 'string');
  paramsGetMethod.setCaller(createMethodCaller('p', '*Params'));
  paramsGetMethod.appendBody('return p.values[field]');
  paramsGetMethod.padRight();
  goFile.addMethod(paramsGetMethod);

  var routeResultStruct = createStruct('RouteResult');
  routeResultStruct.addFieldByValue('leaf', '*RouteLeaf');
  routeResultStruct.addFieldByValue('params', '*Params');
  goFile.addStruct(routeResultStruct);

  var getRouterMethod = createMethod('GetInstance', [], '*Router');
  getRouterMethod.appendBody('if instance == nil {\n  instance = new(Router)\n  instance.root = createNode("", "", "")\n}\nreturn instance');
  getRouterMethod.padRight();
  goFile.addMethod(getRouterMethod);

  var traverseNodeMethod = createMethod('traverseNode', [createArg('path', 'string'), createArg('method', 'string')], '*RouteResult');
  traverseNodeMethod.setCaller(createMethodCaller('router', '*Router'));
  traverseNodeMethod.appendBody('arr := strings.Split(path, "/")[1:]\nvar node = router.root\nparams := createParams()\nfor _, name := range arr {\n  var n1 = node.nodes[name]\n  if n1 == nil {\n    var n2 = node.nodes[".*"]\n    if n2 == nil {\n      node = NotFoundNode\n      break\n    } else {\n      if n2.concateParam {\n        params.values[n2.originPath] += "/" + name\n      } else {\n        params.values[n2.originPath] = name\n      }\n      node = n2\n    }\n  } else {\n    node = n1\n  }\n}\nleaf := node.findLeaf(method)\nreturn createRouteResult(leaf, params)');
  traverseNodeMethod.padRight();
  goFile.addMethod(traverseNodeMethod);

  var nameToPatternMethod = createMethod('nameToPattern', [createArg('name', 'string')], 'string');
  nameToPatternMethod.appendBody('if name[0] == \':\' || name[0] == \'*\' {\n  return ".*"\n} else {\n  return name\n}');
  nameToPatternMethod.padRight();
  goFile.addMethod(nameToPatternMethod);

  var handleMethod = createMethod('Handle', [createArg('path', 'string'), createArg('method', 'string'), createArg('handle', 'Handle')]);
  handleMethod.setCaller(createMethodCaller('router', '*Router'));
  handleMethod.appendBody('arr := strings.Split(path, "/")[1:]\nvar lastNode = router.root\nlenOfArr := len(arr)\nfor idx := 0; idx < lenOfArr; idx++ {\n  name := arr[idx]\n  pName := nameToPattern(name)\n  node := lastNode.popupNodeIfNotExists(name, pName)\n  lastNode = node\n  if name[0] == \'*\' {\n    lastNode.add(lastNode)\n    break\n  }\n}\nlastNode.addLeaf(method, handle)');
  handleMethod.padRight();
  goFile.addMethod(handleMethod);

  var handlerMethod = createMethod('Handler', [createArg('path', 'string'), createArg('method', 'string'), createArg('handler', 'http.Handler')]);
  handlerMethod.setCaller(createMethodCaller('router', '*Router'));
  handlerMethod.appendBody('router.Handle(path, method, func(w http.ResponseWriter, r *http.Request, _ Params) {\n  handler.ServeHTTP(w, r)\n})');
  handlerMethod.padRight();
  goFile.addMethod(handlerMethod);

  var handlerFuncMethod = createMethod('HandlerFunc', [createArg('path', 'string'), createArg('method', 'string'), createArg('handler', 'http.HandlerFunc')]);
  handlerFuncMethod.setCaller(createMethodCaller('router', '*Router'));
  handlerFuncMethod.appendBody('router.HandlerFunc(path, method, handler)');
  handlerFuncMethod.padRight();
  goFile.addMethod(handlerFuncMethod);

  var getMethod = createMethod('GET', [createArg('path', 'string'), createArg('handle', 'Handle')]);
  getMethod.setCaller(createMethodCaller('router', '*Router'));
  getMethod.appendBody('router.Handle(path, "GET", handle)');
  getMethod.padRight();
  goFile.addMethod(getMethod);

  var putMethod = createMethod('PUT', [createArg('path', 'string'), createArg('handle', 'Handle')]);
  putMethod.setCaller(createMethodCaller('router', '*Router'));
  putMethod.appendBody('router.Handle(path, "PUT", handle)');
  putMethod.padRight();
  goFile.addMethod(putMethod);

  var postMethod = createMethod('POST', [createArg('path', 'string'), createArg('handle', 'Handle')]);
  postMethod.setCaller(createMethodCaller('router', '*Router'));
  postMethod.appendBody('router.Handle(path, "POST", handle)');
  postMethod.padRight();
  goFile.addMethod(postMethod);

  var deleteMethod = createMethod('DELETE', [createArg('path', 'string'), createArg('handle', 'Handle')]);
  deleteMethod.setCaller(createMethodCaller('router', '*Router'));
  deleteMethod.appendBody('router.Handle(path, "DELETE", handle)');
  deleteMethod.padRight();
  goFile.addMethod(deleteMethod);

  var serveHTTPMethod = createMethod('ServeHTTP', [createArg('w', 'http.ResponseWriter'), createArg('r', '*http.Request')]);
  serveHTTPMethod.setCaller(createMethodCaller('router', '*Router'));
  serveHTTPMethod.appendBody('routeResult := router.traverseNode(r.URL.Path, r.Method)\nrouteResult.leaf.handle(w, r, *(routeResult.params))');
  serveHTTPMethod.padRight();
  goFile.addMethod(serveHTTPMethod);

  var serveFilesMethod = createMethod('ServeFiles', [createArg('dirName', 'string'), createArg('logicalPath', 'string')]);
  serveFilesMethod.setCaller(createMethodCaller('router', '*Router'));
  serveFilesMethod.appendBody('fs := http.Dir(logicalPath)\nfileServer := http.FileServer(fs)\nrouter.GET(dirName+"/*name", func(w http.ResponseWriter, r *http.Request, p Params) {\n  r.URL.Path = p.Get("name")\n  fileServer.ServeHTTP(w, r)\n})');
  serveFilesMethod.padRight();
  goFile.addMethod(serveFilesMethod);

  var routeNodeStruct = createStruct('RouteNode');
  routeNodeStruct.addFieldByValue('path', 'string');
  routeNodeStruct.addFieldByValue('method', 'string');
  routeNodeStruct.addFieldByValue('originPath', 'string');
  routeNodeStruct.addFieldByValue('level', 'int8');
  routeNodeStruct.addFieldByValue('nodes', 'map[string]*RouteNode');
  routeNodeStruct.addFieldByValue('leaves', 'map[string]*RouteLeaf');
  routeNodeStruct.addFieldByValue('concateParam', 'bool');
  goFile.addStruct(routeNodeStruct);

  var addLeafMethod = createMethod('addLeaf', [createArg('method', 'string'), createArg('handle', 'Handle')]);
  addLeafMethod.setCaller(createMethodCaller('node', '*RouteNode'));
  addLeafMethod.appendBody('node.leaves[method] = createLeaf(node, method, handle)');
  addLeafMethod.padRight();
  goFile.addMethod(addLeafMethod);

  var findLeafMethod = createMethod('findLeaf', [createArg('method', 'string')], '*RouteLeaf');
  findLeafMethod.setCaller(createMethodCaller('node', '*RouteNode'));
  findLeafMethod.appendBody('leaf := node.leaves[method]\nif leaf == nil {\n  return NotFoundLeaf\n} else {\n  return leaf\n}');
  findLeafMethod.padRight();
  goFile.addMethod(findLeafMethod);

  var addMethod = createMethod('add', [createArg('child', '*RouteNode')]);
  addMethod.setCaller(createMethodCaller('node', '*RouteNode'));
  addMethod.appendBody('node.nodes[child.path] = child');
  addMethod.padRight();
  goFile.addMethod(addMethod);

  var popupNodeIfNotExistsMethod = createMethod('popupNodeIfNotExists', [createArg('name', 'string'), createArg('pattern', 'string')], '*RouteNode');
  popupNodeIfNotExistsMethod.setCaller(createMethodCaller('node', '*RouteNode'));
  popupNodeIfNotExistsMethod.appendBody('if node.nodes[pattern] == nil {\n  newNode := popupNode(name)\n  newNode.level = node.level + 1\n  node.add(newNode)\n  return newNode\n} else {\n  return node.nodes[pattern]\n}');
  popupNodeIfNotExistsMethod.padRight();
  goFile.addMethod(popupNodeIfNotExistsMethod);

  var routeLeafStruct = createStruct('RouteLeaf');
  routeLeafStruct.addFieldByValue('node', '*RouteNode');
  routeLeafStruct.addFieldByValue('method', 'string');
  routeLeafStruct.addFieldByValue('handle', 'Handle');
  goFile.addStruct(routeLeafStruct);

  var createNodeMethod = createMethod('createNode', [createArg('path', 'string'), createArg('method', 'string'), createArg('originPath', 'string')], '*RouteNode');
  createNodeMethod.appendBody('return &RouteNode{\n  path:         path,\n  originPath:   originPath,\n  method:       method,\n  level:        0,\n  nodes:        make(map[string]*RouteNode),\n  leaves:       make(map[string]*RouteLeaf),\n  concateParam: false,\n}');
  createNodeMethod.padRight();
  goFile.addMethod(createNodeMethod);

  var createNotFoundNodeMethod = createMethod('createNotFoundNode', [], '*RouteNode');
  createNotFoundNodeMethod.appendBody('node := createNode("", "", "")\nnode.addLeaf("GET", NotFoundHandle)\nnode.addLeaf("PUT", NotFoundHandle)\nnode.addLeaf("POST", NotFoundHandle)\nnode.addLeaf("DELETE", NotFoundHandle)\nreturn node');
  createNotFoundNodeMethod.padRight();
  goFile.addMethod(createNotFoundNodeMethod);

  var createLeafMethod = createMethod('createLeaf', [createArg('node', '*RouteNode'), createArg('method', 'string'), createArg('handle', 'Handle')], '*RouteLeaf');
  createLeafMethod.appendBody('return &RouteLeaf{\n  node:   node,\n  method: method,\n  handle: handle,\n}');
  createLeafMethod.padRight();
  goFile.addMethod(createLeafMethod);

  var createParamsMethod = createMethod('createParams', [], '*Params');
  createParamsMethod.appendBody('return &Params{\n  values: make(map[string]string),\n}');
  createParamsMethod.padRight();
  goFile.addMethod(createParamsMethod);

  var createRouteResultMethod = createMethod('createRouteResult', [createArg('leaf', '*RouteLeaf'), createArg('params', '*Params')], '*RouteResult');
  createRouteResultMethod.appendBody('return &RouteResult{\n  leaf:   leaf,\n  params: params,\n}');
  createRouteResultMethod.padRight();
  goFile.addMethod(createRouteResultMethod);

  var popupNodeMethod = createMethod('popupNode', [createArg('value', 'string')], '*RouteNode');
  popupNodeMethod.appendBody('var idx int\nidx = -1\nvar buff string\nvar pathRegexp string\npathRegexp = value\nvar concateParam = false\nfor i := 0; i < len(value); i++ {\n  val := value[i]\n  if val == \':\' {\n    idx = i\n  } else if val == \'*\' {\n    concateParam = true\n    idx = i\n  }\n}\nif idx >= 0 {\n  buff = value[idx+1:]\n  pathRegexp = strings.Replace(pathRegexp, "*"+buff, ".*", -1)\n  pathRegexp = strings.Replace(pathRegexp, ":"+buff, ".*", -1)\n  idx = -1\n}\nnode := createNode(pathRegexp, "", buff)\nnode.concateParam = concateParam\nreturn node');
  popupNodeMethod.padRight();
  goFile.addMethod(popupNodeMethod);

  if(wfCallback) {
    wfCallback('./output/'+goFile.package, goFile.name, goFile.toString());
  }
}

function createHandler(apiName, modelMethods, apiConfig, modelConfig, wfCallback) {
  var code = '';
  var goFile = createFile('routes', apiName);
  goFile.importModule('net/http');
  goFile.importModule('fmt');
  if(modelConfig) {
    goFile.importModule('../db');
    goFile.importModule('encoding/json');
    goFile.importModule('io');
    goFile.importModule('strings');
  }

  var handlerBody = '';
  var isHead = true;
  var subHandlerConfigArray = [];

  var convertToModelMethod = createMethod(format('convertTo%s', apiName.toNameCase()), [createArg('reader', 'io.Reader')], format('*db.%s', apiName.toNameCase()));
  convertToModelMethod.appendBody(format('decoder := json.NewDecoder(reader)\nvar model db.%s\nerr := decoder.Decode(&model)\nif err != nil {\n  panic(err)\n}\nreturn &model', apiName.toNameCase()));
  convertToModelMethod.padRight();
  goFile.addMethod(convertToModelMethod);

  if(apiConfig.get) {
    var getMethod = createMethod(format('Handle%sGet', apiName.toNameCase()), [createArg('w', 'http.ResponseWriter'), createArg('r', '*http.Request'), createArg('p', 'Params')]);
    if(modelConfig) {
      getMethod.appendBody(format('jsonModel, _ := json.Marshal(db.Get%ss())\nfmt.Fprint(w, string(jsonModel))', apiName.toNameCase()));
    }
    else {
      getMethod.appendBody(format('fmt.Fprint(w, "GET %s")', apiName));
    }
    getMethod.padRight();
    goFile.addMethod(getMethod);
  }
  if(apiConfig.put) {
    var putMethod = createMethod(format('Handle%sPut', apiName.toNameCase()), [createArg('w', 'http.ResponseWriter'), createArg('r', '*http.Request'), createArg('p', 'Params')]);
    if(modelConfig) {
      putMethod.appendBody(format('id := strings.Split(r.URL.Path, "/")[2]\nmodel := convertTo%s(r.Body)\nnewModel := db.Update%sById(id, model.ToBson())\njsonModel, _ := json.Marshal(newModel)\nfmt.Fprint(w, string(jsonModel))', apiName.toNameCase(), apiName.toNameCase()));
    }
    else {
      putMethod.appendBody(format('fmt.Fprint(w, "PUT %s")', apiName));
    }
    putMethod.padRight();
    goFile.addMethod(putMethod);
  }
  if(apiConfig.post) {
    var postMethod = createMethod(format('Handle%sPost', apiName.toNameCase()), [createArg('w', 'http.ResponseWriter'), createArg('r', '*http.Request'), createArg('p', 'Params')]);
    if(modelConfig) {
      postMethod.appendBody(format('model := convertTo%s(r.Body)\nnewModel := model.Create()\njsonModel, _ := json.Marshal(newModel)\nfmt.Fprint(w, string(jsonModel))', apiName.toNameCase()));
    }
    else {
      postMethod.appendBody(format('fmt.Fprint(w, "POST %s")', apiName));
    }
    postMethod.padRight();
    goFile.addMethod(postMethod);
  }
  if(apiConfig.delete) {
    var deleteMethod = createMethod(format('Handle%sDelete', apiName.toNameCase()), [createArg('w', 'http.ResponseWriter'), createArg('r', '*http.Request'), createArg('p', 'Params')]);
    if(modelConfig) {
      deleteMethod.appendBody(format('id := strings.Split(r.URL.Path, "/")[2]\ndb.Remove%sById(id)\nfmt.Fprint(w, "")', apiName.toNameCase()));
    }
    else {
      deleteMethod.appendBody(format('fmt.Fprint(w, "DELETE %s")', apiName));
    }
    deleteMethod.padRight();
    goFile.addMethod(deleteMethod);
  }
  /*for(var handlerMethod in apiConfig) {
    var config = apiConfig[handlerMethod];
    var syntax = '';
    if(!isHead) {
      syntax = ' else ';
    }
    var handlerName = format('Handle%s%s', apiName.toNameCase(), handlerMethod.toNameCase());
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
  var subHandlerMethods = createSubHandler(subHandlerConfigArray);
  goFile.addMethods(subHandlerMethods);*/
  if(wfCallback) {
    wfCallback('./output/'+goFile.package, goFile.name, goFile.toString());
  }
}

function createSubHandler(subHandlerConfigArray) {
  var apiSubHandlerMethod = [];
  for(var idx in subHandlerConfigArray) {
    var subHandlerConfig = subHandlerConfigArray[idx];
    var goMethod = createMethod(subHandlerConfig.methodName);
    goMethod.appendArg('w', 'http.ResponseWriter');
    goMethod.appendArg('r', '*http.Request');
    goMethod.appendArg('p', 'Params');
    goMethod.appendBody(format('    fmt.Fprint(w, "%s %s")', subHandlerConfig.method.toUpperCase(), subHandlerConfig.apiName));
    apiSubHandlerMethod.push(goMethod);
  }
  return apiSubHandlerMethod;
}

module.exports = {
  createFile: createFile,
  createStructField: createStructField,
  createStruct: createStruct,
  createArg: createArg,
  createMethodCaller: createMethodCaller,
  createMethod: createMethod,
  createHandler: createHandler,
  createRouter: createRouter,
};