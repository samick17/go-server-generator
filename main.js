const Generator = require('./generator');

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
      author: {type: "ObjectId", required: true},
    }
  }
};

var writeToFile = true;
Generator.generate(config, writeToFile);