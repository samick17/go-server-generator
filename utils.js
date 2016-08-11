require('./str-prototype');
//['board', 'task'] -> /board/:boardId/task/:taskId
function generateRoutePath1(routeNameArray) {
  return routeNameArray.map(function(eee) {return '/{0}/:{1}Id'.format(eee, eee)}).join('');
}
//['board', 'task'] -> /board/:boardId/task
function generateRoutePath2(routeNameArray) {
  var lenOfArray = routeNameArray.length;
  return routeNameArray.map(function(elem, i) {
    if(i == lenOfArray-1) {
      return '/{0}'.format(elem);
    }
    else {
      return '/{0}/:{1}Id'.format(elem, elem);
    }
  }).join('');
}
function generateRouteName(routeNameArray) {
  return routeNameArray.map(function(elem) {
    return elem.toNameCase();
  }).join('');
}
module.exports = {
  generateRoutePath1: generateRoutePath1,
  generateRoutePath2: generateRoutePath2,
  generateRouteName: generateRouteName
}