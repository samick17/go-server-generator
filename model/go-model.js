const format = require('util').format;
require('../str-prototype');

function values(obj) {
  var vals = [];
  for(var i in obj) {
    vals.push(obj[i]);
  }
  return vals;
}

const GoStructFieldType = {
  'string': 'string',
  'Date': 'time.Time',
  'ObjectId': 'bson.ObjectId'
}

function GoStructField(name, type, bsonJsonName) {
  this.name = name;
  this.type = GoStructFieldType[type] ? GoStructFieldType[type] : type;
  this.bsonJsonName = bsonJsonName;
}

GoStructField.prototype.toString = function() {
  if(this.bsonJsonName)
    return format('    %s %s `json:"%s,omitempty" bson:"%s,omitempty"`', this.name.toNameCase(), this.type, this.bsonJsonName, this.bsonJsonName);  
  else
    return format('    %s %s', this.name, this.type);
};

function GoStruct(name, fields) {
  this.name = name;
  this.fields = fields || [];
}

GoStruct.prototype.addField = function(field) {
  this.fields.push(field);
};

GoStruct.prototype.addFieldByValue = function(name, type, bsonJsonName) {
  this.addField(new GoStructField(name, type, bsonJsonName));
};

GoStruct.prototype.toString = function() {
  return format('type %s struct {\n%s\n}', this.name.toNameCase(), this.fields.join('\n'));
};

function GoMethodArg(name, type) {
  this.name = name;
  this.type = type;
}

GoMethodArg.prototype.toString = function() {
  return format('%s %s', this.name, this.type);
};

function GoMethodCaller(name, type) {
  this.name = name;
  this.type = type;
}

GoMethodCaller.prototype.toString = function() {
  if(this.name && this.type)
    return format('(%s %s)', this.name, this.type);
  else
    return '';
};

function GoMethod(name, args, returnType) {
  this.name = name;
  this.args = args || [];
  this.returnType = returnType || '';
  this.body = '';
}

GoMethod.prototype.setCaller = function(caller) {
  this.caller = caller;
};

GoMethod.prototype.appendArg = function(name, type) {
  this.args.push(new GoMethodArg(name, type));
};

GoMethod.prototype.appendBody = function(body) {
  this.body += body.toString()+'\n';
};

GoMethod.prototype.padRight = function() {
  this.body = this.body.padRight();
};

GoMethod.prototype.toString = function() {
  var arg = this.args.join(', ');
  var callerText = this.caller ? ' '+this.caller.toString() : '';
  var name =  this.name ? ' ' + this.name : '';
  var returnType = this.returnType ? ' ' + this.returnType : '';
  return format('func%s%s(%s)%s {\n%s}', callerText, name, arg, returnType, this.body);
};

function GoConst(name, value) {
  this.name = name;
  this.value = value;
}

GoConst.prototype.toString = function() {
  return format('    %s = %s', this.name, this.value)
};

function GoVar(name, type, value) {
  this.name = name;
  this.type = type;
  this.value = value;
}

GoVar.prototype.toString = function() {
  if(this.value)
    return format('var %s = %s', this.name, this.value);
  else
    return format('var %s %s', this.name, this.type);
};

function GoFile(name) {
  this.name = name;
  this.modules = {};
  this.methods = {};
  this.consts = {};
  this.vars = {};
  this.structs = {};
  this.typeDefineds = {};
}

GoFile.prototype.addTypeDefined = function(typeDefined) {
  this.typeDefineds[typeDefined.name] = typeDefined;
};

GoFile.prototype.addStruct = function(struct) {
  this.structs[struct.name] = struct;
};

GoFile.prototype.addConst = function(name, value) {
  this.consts[name] = new GoConst(name, value);
};

GoFile.prototype.addVar = function(name, type, value) {
  this.vars[name] = new GoVar(name, type, value);
};

GoFile.prototype.setPackage = function(name) {
  this.package = name;
};

GoFile.prototype.importModule = function(name) {
  this.modules['"'+name+'"'] = '';
};

GoFile.prototype.addMethod = function(goMethod) {
  this.methods[goMethod.name] = goMethod;
};

GoFile.prototype.addMethods = function(goMethods) {
  for(var i in goMethods) {
    var method = goMethods[i]
    this.addMethod(method);
  }
};

GoFile.prototype.toString = function() {
  var moduleKeys = Object.keys(this.modules);
  var codeArray = [];
  if(moduleKeys.length > 0)
    codeArray.push('import(\n    '+moduleKeys.join('\n    ')+'\n)');
  if(Object.keys(this.typeDefineds).length > 0)
    codeArray.push(format('%s', values(this.typeDefineds).join('\n')));
  if(Object.keys(this.consts).length > 0)
    codeArray.push(format('const (\n%s\n)', values(this.consts).join('\n')));
  if(Object.keys(this.vars).length > 0)
    codeArray.push(values(this.vars).join('\n'));
  if(Object.keys(this.structs).length > 0)
    codeArray.push(values(this.structs).join('\n'));
  codeArray.push(values(this.methods).join('\n\n'));
  return format('package %s\n\n%s', this.package, codeArray.join('\n\n'));
};

function GoTypeDefined(name, type) {
  this.name = name;
  this.type = type;
}

GoTypeDefined.prototype.toString = function() {
  return format('type %s %s', this.name, this.type)
};

module.exports = {
  GoStructField, GoStructField,
  GoStruct, GoStruct,
  GoMethodArg: GoMethodArg,
  GoMethodCaller: GoMethodCaller,
  GoMethod: GoMethod,
  GoFile: GoFile,
  GoTypeDefined: GoTypeDefined,
};