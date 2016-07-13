const format = require('util').format;
require('../str-prototype');

function GoMethodArg(name, type) {
  this.name = name;
  this.type = type;
}

GoMethodArg.prototype.toString = function() {
  return format('%s %s', this.name, this.type);
};

function GoMethod(name) {
  this.name = name;
  this.args = [];
  this.body = '';
}

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
  return format('func%s(%s)%s {\n%s}', this.name ? ' '+this.name:'', arg, this.returnType ? ' '+this.returnType:'', this.body);
};

function GoStruct() {}

function GoFile(name) {
  this.name = name;
  this.modules = {};
  this.methods = [];
}

GoFile.prototype.setPackage = function(name) {
  this.package = name;
};

GoFile.prototype.importModule = function(name) {
  this.modules['"'+name+'"'] = '';
};

GoFile.prototype.addMethod = function(goMethod) {
  this.methods.push(goMethod);
};

GoFile.prototype.toString = function() {
  var moduleKeys = Object.keys(this.modules);
  var moduleCode = moduleKeys.length > 0 ? 'import(\n    '+moduleKeys.join('\n    ')+'\n)\n' : '';
  return format('package %s\n\n%s', this.package, moduleCode, this.methods.join('\n'));
};

module.exports = {
  GoMethod: GoMethod,
  GoFile: GoFile
};