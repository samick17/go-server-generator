const format = require('util').format;
const fs = require('fs');
const path = require('path');
const GoModelFactory = require('./model/go-model-factory');
require('./str-prototype');

function writeFile(folder, name, text) {
  function doWriteFile(filePath, text) {
    fs.writeFile(filePath, text, function(err) {
      if(err) throw err;
    });
  }
  fs.exists(folder, function(isExists) {
    if(isExists) {
      doWriteFile(path.join(folder, format('%s.go', name)), text);
    }
    else {
      fs.mkdir(folder, function(err) {
        doWriteFile(path.join(folder, format('%s.go', name)), text);
      });
    }
  });
}

function genHttpRouteListener(routeName, apiConfig) {
  var apiArray = Object.keys(apiConfig);
  var body = 'router := routes.GetInstance()\n';
  if(apiConfig.get)
    body += format('router.GET("/%s", routes.Handle%sGet)\n', routeName, routeName.toNameCase());
  if(apiConfig.put)
    body += format('router.PUT("/%s/:id", routes.Handle%sPut)\n', routeName, routeName.toNameCase());
  if(apiConfig.post)
    body += format('router.POST("/%s", routes.Handle%sPost)\n', routeName, routeName.toNameCase());
  if(apiConfig.delete)
    body += format('router.DELETE("/%s/:id", routes.Handle%sDelete)\n', routeName, routeName.toNameCase());
  return body;
}

function genHttpListenerCode(port) {
  return format('err := http.ListenAndServe(":%s", router)\n'+
   'if err != nil {\n'+
   '    panic(":" + err.Error())\n'+
   '}', port)
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
    name: format('New%s', structName),
    returnType: format('*%s', structName),
    body: format('return new(%s)', structName)
  },
  {
    caller: {name: 'this', type: format('*%s', structName)},
    name: 'Create',
    returnType: format('*%s', structName),
    body: format('this.Id = bson.NewObjectId()\nsession := GetMongoSession()\ndefer session.Close()\nc := session.DB(Database).C("%s")\nerr := c.Insert(this)\nif err != nil {\n  log.Fatal(err)\n}\nreturn Get%sBy(bson.M{"_id": this.Id})', structName.toLowerCase(), structName)
  },
  {
    caller: {name: 'this', type: format('*%s', structName)},
    name: 'ToBson',
    returnType: 'bson.M',
    body: 'var b bson.M\ndata, _ := bson.Marshal(this)\n_ = bson.Unmarshal(data, &b)\nreturn b'
  },
  {
    name: format('Update%sById', structName),
    args: [{name: 'id', type: 'string'}, {name: 'newVal', type: 'bson.M'}],
    returnType: format('*%s', structName),
    body: format('return Update%sBy(IdStringToBsonMap(id), newVal)', structName)
  },
  {
    name: format('Update%sBy', structName),
    returnType: format('*%s', structName),
    args: [{name: 'condition', type: 'bson.M'}, {name: 'newVal', type: 'bson.M'}],
    body: format('session := GetMongoSession()\ndefer session.Close()\nc := session.DB(Database).C("%s")\nerr := c.Update(condition, bson.M{"$set": newVal})\nif err != nil {\n  log.Fatal(err)\n}\nreturn Get%sBy(condition)', structName.toLowerCase(), structName)
  },
  {
    name: format('Remove%sById', structName),
    args: [{name: 'id', type: 'string'}],
    body: format('Remove%sBy(IdStringToBsonMap(id))', structName)
  },
  {
    name: format('Remove%sBy', structName),
    args: [{name: 'condition', type: 'bson.M'}],
    body: format('session := GetMongoSession()\ndefer session.Close()\nc := session.DB(Database).C("%s")\n_, err := c.RemoveAll(condition)\nif err != nil {\n  log.Fatal(err)\n}', structName.toLowerCase())
  },
  {
    name: format('Remove%ss', structName),
    body: format('Remove%ssBy(nil)', structName)
  },
  {
    name: format('Remove%ssBy', structName),
    args: [{name: 'condition', type: 'bson.M'}],
    body: format('session := GetMongoSession()\ndefer session.Close()\nc := session.DB(Database).C("%s")\n_, err := c.RemoveAll(condition)\nif err != nil {\n  log.Fatal(err)\n}', structName.toNameCase())
  },
  {
    name: format('Get%sById', structName),
    args: [{name: 'id', type: 'string'}],
    returnType: format('*%s', structName),
    body: format('return Get%sBy(IdStringToBsonMap(id))', structName)
  },
  {
    name: format('Get%sBy', structName),
    args: [{name: 'condition', type: 'bson.M'}],
    returnType: format('*%s', structName),
    body: format('session := GetMongoSession()\ndefer session.Close()\nc := session.DB(Database).C("%s")\nmodel := new(%s)\nerr := c.Find(condition).One(model)\nif err != nil {\n  log.Fatal(err)\n}\nreturn model', structName.toLowerCase(), structName)
  },
  {
    name: format('Get%ss', structName),
    returnType: format('[]%s', structName),
    body: format('return Get%ssBy(nil)', structName)
  },
  {
    name: format('Get%ssBy', structName),
    args: [{name: 'condition', type: 'bson.M'}],
    returnType: format('[]%s', structName),
    body: format('session := GetMongoSession()\ndefer session.Close()\nc := session.DB(Database).C("%s")\nvar result []%s\niter := c.Find(condition).Limit(100).Iter()\nerr := iter.All(&result)\nif err != nil {\n  log.Fatal(err)\n}\nreturn result', structName.toLowerCase(), structName)
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
    return format('"%s"', val);
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
  var modelMethods = {};
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
  return modelMethods;
}

//generate api handler, if model is defined, use default model handler, else print method type.
function generateApi(config, modelMethods, wfCallback) {
  var body = '';
  const api = config.api;
  for(var apiName in api) {
    var handlerCode = '';
    var apiConfig = api[apiName];  
    GoModelFactory.createRouter(wfCallback);
    GoModelFactory.createHandler(apiName, modelMethods, apiConfig, config.model[apiName], wfCallback);
    body += genHttpRouteListener(apiName, apiConfig);
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
  var modelMethods = generateModel(config);
  mainFuncBody += generateApi(config, modelMethods, wfCallback);
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

module.exports = {
  generate: generate
};

var config = {
  db: {
    name: 'myBookcase',
    url: '127.0.0.1'
  },
  server: {
    port: 80
  },
  api: {
    book: {
      get: {},
      put: {},
      post: {},
      delete: {}
    }
  },
  model: {
    book: {
      name: {type: "string", default: ""},
      author: {type: "ObjectId", required: true}
    }
  }
};
generate(config, true);