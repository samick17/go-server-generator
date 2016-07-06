const format = require('util').format;

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
  this.body += body+'\n';
};

GoMethod.prototype.toString = function() {
  var arg = this.args.join(', ');
  return format('func %s(%s) {\n%s}', this.name, arg, this.body);
};

module.exports = {
  GoMethod: GoMethod
};