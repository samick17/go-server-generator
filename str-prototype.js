String.prototype.toNameCase = function() {
  return this.toString().replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1);});
};

String.prototype.padRight = function() {
  var indent = '    ';
  var str = this.toString();
  var lastIndex = str.lastIndexOf('\n');
  str = str.replace(/(?:\n)/g, function(match,index) {
    if(index === lastIndex) {
      return '\n';
    }
    else {
      return '\n'+indent;
    }
  });
  return indent+str;
};

module.exports = {};