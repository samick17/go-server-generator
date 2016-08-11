const fs = require('fs');
const path = require('path');
const GoModelFactory = require('./model/go-model-factory');
const GUtils = require('./utils');
require('./str-prototype');

function writeFile(folder, name, text) {
  function doWriteFile(filePath, text) {
    fs.writeFile(filePath, text, function(err) {
      if(err) throw err;
    });
  }
  fs.exists(folder, function(isExists) {
    if(isExists) {
      doWriteFile(path.join(folder, '{0}.go'.format(name)), text);
    }
    else {
      fs.mkdir(folder, function(err) {
        doWriteFile(path.join(folder, '{0}.go'.format(name)), text);
      });
    }
  });
}

function genHttpRouteListener(routeName, apiConfig) {
  var apiArray = Object.keys(apiConfig);
  var body = 'router := routes.GetInstance()\n';
  if(apiConfig.get)
    body += 'router.GET("/{0}", routes.Handle{1}Get)\n'.format(routeName, routeName.toNameCase());
  if(apiConfig.put)
    body += 'router.PUT("/{0}/:id", routes.Handle{1}Put)\n'.format(routeName, routeName.toNameCase());
  if(apiConfig.post)
    body += 'router.POST("/{0}", routes.Handle{1}Post)\n'.format(routeName, routeName.toNameCase());
  if(apiConfig.delete)
    body += 'router.DELETE("/{0}/:id", routes.Handle{1}Delete)\n'.format(routeName, routeName.toNameCase());
  return body;
}

/*Relationship listener*/
function generateNestedListener(apiName, apiConfig, modelConfig) {
  var listenerCode = '';
  for(var i in modelConfig) {
    var field = modelConfig[i];
    if(field.parent) {
      var routeNameArray = [field.parent, apiName];
      listenerCode += genHttpNestedRouteListener(routeNameArray, apiConfig);
    }
  }
  return listenerCode;
}

function genHttpNestedRouteListener(routeNameArray, apiConfig) {
  var apiArray = Object.keys(apiConfig);
  var body = '';
  if(apiConfig.get)
    body += 'router.GET("{0}", routes.Handle{1}Get)\n'.format(GUtils.generateRoutePath2(routeNameArray), GUtils.generateRouteName(routeNameArray));
  if(apiConfig.put)
    body += 'router.PUT("{0}", routes.Handle{1}Put)\n'.format(GUtils.generateRoutePath1(routeNameArray), GUtils.generateRouteName(routeNameArray));
  if(apiConfig.post)
    body += 'router.POST("{0}", routes.Handle{1}Post)\n'.format(GUtils.generateRoutePath2(routeNameArray), GUtils.generateRouteName(routeNameArray));
  if(apiConfig.delete)
    body += 'router.DELETE("{0}", routes.Handle{1}Delete)\n'.format(GUtils.generateRoutePath1(routeNameArray), GUtils.generateRouteName(routeNameArray));
  return body;
}
/**/

function genHttpListenerCode(port) {
  return ('err := http.ListenAndServe(":{0}", router)\n'+
   'if err != nil {\n'+
   '    panic(":" + err.Error())\n'+
   '}').format(port);
}

function generateMethods(methodDataArray) {
  var methods = [];
  for(var i in methodDataArray) {
    var mData = methodDataArray[i];
    var args = [];
    for(var i in mData.args) {
      var argData = mData.args[i];
      var arg = GoModelFactory.createArg(argData.name, argData.type);
      args.push(arg);
    }
    var method = GoModelFactory.createMethod(mData.name, args, mData.returnType);
    if(mData.caller)
      method.setCaller(GoModelFactory.createMethodCaller(mData.caller.name, mData.caller.type));
    method.appendBody(mData.body);
    method.padRight();
    methods.push(method);
  }
  return methods;
}

function createDbMethods(structName) {
  var methods = [];
  var methodDataArray = [
  {
    name: 'New{0}'.format(structName),
    returnType: '*{0}'.format(structName),
    body: 'return new({0})'.format(structName)
  },
  {
    caller: {name: 'this', type: '*{0}'.format(structName)},
    name: 'Create',
    returnType: '*{0}'.format(structName),
    body: 'this.Id = bson.NewObjectId()\nsession := GetMongoSession()\ndefer session.Close()\nc := session.DB(Database).C("{0}")\nerr := c.Insert(this)\nif err != nil {\n  log.Fatal(err)\n}\nreturn Get{1}By(bson.M{"_id": this.Id})'.format(structName.toLowerCase(), structName)
  },
  {
    caller: {name: 'this', type: '*{0}'.format(structName)},
    name: 'ToBson',
    returnType: 'bson.M',
    body: 'var b bson.M\ndata, _ := bson.Marshal(this)\n_ = bson.Unmarshal(data, &b)\nreturn b'
  },
  {
    name: 'Update{0}ById'.format(structName),
    args: [{name: 'id', type: 'string'}, {name: 'newVal', type: 'bson.M'}],
    returnType: '*{0}'.format(structName),
    body: 'return Update{0}By(IdStringToBsonMap(id), newVal)'.format(structName)
  },
  {
    name: 'Update{0}By'.format(structName),
    returnType: '*{0}'.format(structName),
    args: [{name: 'condition', type: 'bson.M'}, {name: 'newVal', type: 'bson.M'}],
    body: 'session := GetMongoSession()\ndefer session.Close()\nc := session.DB(Database).C("{0}")\nerr := c.Update(condition, bson.M{"$set": newVal})\nif err != nil {\n  log.Fatal(err)\n}\nreturn Get{1}By(condition)'.format(structName.toLowerCase(), structName)
  },
  {
    name: 'Remove{0}ById'.format(structName),
    args: [{name: 'id', type: 'string'}],
    body: 'Remove{0}By(IdStringToBsonMap(id))'.format(structName)
  },
  {
    name: 'Remove{0}By'.format(structName),
    args: [{name: 'condition', type: 'bson.M'}],
    body: 'session := GetMongoSession()\ndefer session.Close()\nc := session.DB(Database).C("{0}")\n_, err := c.RemoveAll(condition)\nif err != nil {\n  log.Fatal(err)\n}'.format(structName.toLowerCase())
  },
  {
    name: 'Remove{0}s'.format(structName),
    body: 'Remove{0}sBy(nil)'.format(structName)
  },
  {
    name: 'Remove{0}sBy'.format(structName),
    args: [{name: 'condition', type: 'bson.M'}],
    body: 'session := GetMongoSession()\ndefer session.Close()\nc := session.DB(Database).C("{0}")\n_, err := c.RemoveAll(condition)\nif err != nil {\n  log.Fatal(err)\n}'.format(structName.toNameCase())
  },
  {
    name: 'Get{0}ById'.format(structName),
    args: [{name: 'id', type: 'string'}],
    returnType: '*{0}'.format(structName),
    body: 'return Get{0}By(IdStringToBsonMap(id))'.format(structName)
  },
  {
    name: 'Get{0}By'.format(structName),
    args: [{name: 'condition', type: 'bson.M'}],
    returnType: '*{0}'.format(structName),
    body: 'session := GetMongoSession()\ndefer session.Close()\nc := session.DB(Database).C("{0}")\nmodel := new({1})\nerr := c.Find(condition).One(model)\nif err != nil {\n  log.Fatal(err)\n}\nreturn model'.format(structName.toLowerCase(), structName)
  },
  {
    name: 'Get{0}s'.format(structName),
    returnType: '[]{0}'.format(structName),
    body: 'return Get{0}sBy(nil)'.format(structName)
  },
  {
    name: 'Get{0}sBy'.format(structName),
    args: [{name: 'condition', type: 'bson.M'}],
    returnType: '[]{0}'.format(structName),
    body: 'session := GetMongoSession()\ndefer session.Close()\nc := session.DB(Database).C("{0}")\nvar result []{1}\niter := c.Find(condition).Limit(100).Iter()\nerr := iter.All(&result)\nif err != nil {\n  log.Fatal(err)\n}\nreturn result'.format(structName.toLowerCase(), structName)
  }
  ];
  return generateMethods(methodDataArray);
}

function toGoValue(val) {
  var type = typeof val;
  switch(type) {
    case 'number':
    return val;
    default:
    return '"{0}"'.format(val);
  }
}

function generateMongoDbUtils(config) {
  var goFile = GoModelFactory.createFile('db', 'mongo-utils');
  goFile.importModule('gopkg.in/mgo.v2');
  goFile.importModule('gopkg.in/mgo.v2/bson');
  goFile.importModule('log');
  goFile.addConst('Database', toGoValue(config.db.name));
  goFile.addConst('DatabaseUrl', toGoValue(config.db.url));
  goFile.addVar('mgoSession', '*mgo.Session');
  var methodDataArray = [
  {
    name: 'IdStringToBsonMap',
    args: [{name: 'id', type: 'string'}],
    returnType: 'bson.M',
    body: 'return bson.M{"_id": bson.ObjectIdHex(id)}'
  },
  {
    name: 'GetDatabase',
    returnType: 'string',
    body: 'return Database'
  },
  {
    name: 'GetMongoSession',
    returnType: '*mgo.Session',
    body: 'if mgoSession == nil {\n  var err error\n  mgoSession, err = mgo.Dial(DatabaseUrl)\n  mgoSession.SetMode(mgo.Monotonic, true)\n  if err != nil {\n    log.Fatal("Failed to start the Mongo session")\n  }\n}\nreturn mgoSession.Clone()'
  },
  {
    name: 'DropDatabase',
    body: 'session := GetMongoSession()\ndefer session.Close()\nerr := session.DB(Database).DropDatabase()\nif err != nil {\n  log.Fatal(err)\n}'
  }
  ];
  writeFile('./output/db', goFile.name, goFile.toString()+'\n'+generateMethods(methodDataArray).join('\n\n'));
}

function generateModel(config) {
  const model = config.model;
  for(var name in model) {
    var goFile = GoModelFactory.createFile('db', name);
    goFile.importModule('gopkg.in/mgo.v2/bson');
    goFile.importModule('log');
    goFile.importModule('time');
    var handlerCode = '';
    var struct = GoModelFactory.createStruct(name);
    var fields = model[name];
    struct.addFieldByValue('id', 'ObjectId', '_id');
    for(var field in fields) {
      var fieldSpec = fields[field];
      var goField = GoModelFactory.createStructField(field, fieldSpec.type, field);
      struct.addField(goField);
    }
    struct.addFieldByValue('createdAt', 'Date', 'createdAt');
    struct.addFieldByValue('lastUpdate', 'Date', 'lastUpdate');
    goFile.addStruct(struct);
    goFile.addMethods(createDbMethods(name.toNameCase()));
    writeFile('./output/db', name, goFile.toString());
  }
}

//generate api handler, if model is defined, use default model handler, else print method type.
function generateApi(config, wfCallback) {
  var body = '';
  const api = config.api;
  for(var apiName in api) {
    var handlerCode = '';
    var apiConfig = api[apiName];
    var modelConfig = config.model[apiName];
    GoModelFactory.createRouter(wfCallback);
    GoModelFactory.createHandler(apiName, apiConfig, modelConfig, wfCallback);
    //GoModelFactory.createNestedHandler(apiName, apiConfig, modelConfig, wfCallback);
    body += genHttpRouteListener(apiName, apiConfig);
    body += generateNestedListener(apiName, apiConfig, modelConfig);
  }
  return body;
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
  generateMongoDbUtils(config);
  generateModel(config);
  mainFuncBody += generateApi(config, wfCallback);
  mainFuncBody += genHttpListenerCode(config.server.port);
  var mainMethod = GoModelFactory.createMethod('main');
  mainMethod.appendBody(mainFuncBody);
  mainMethod.padRight();
  goFile.addMethod(mainMethod);
  var code = goFile.toString();
  if(wfCallback) {
    wfCallback('./output', 'main', code);
  }
  return code;
}

function generate(config, writeToFile) {
  if(config) {
    var code = generateBaseHttpServerCode(config, writeToFile ? writeFile : null);
    return code;
  }
  else {
    return '';
  }
}

function generateFromPath(configPath, writeToFile) {
  fs.readFile(configPath, function(err, ddd) {
    var config = JSON.parse(ddd.toString());
    generate(config, writeToFile);
  });
}

module.exports = {
  generate: generate,
  generateFromPath: generateFromPath
};