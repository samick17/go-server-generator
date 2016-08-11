const Generator = require('./generator');

var taskConfig = {
  db: {
    name: 'myTaskBoard',
    url: '127.0.0.1'
  },
  server: {
    port: 8080
  },
  api: {
    task: {
      get: {},
      put: {},
      post: {},
      delete: {}
    }
  },
  model: {
    task: {
      board: {type: "ObjectId", parent: "board"},
      name: {type: "string"}
    }
  }
};

var boardConfig = {
  db: {
    name: 'myTaskBoard',
    url: '127.0.0.1'
  },
  server: {
    port: 80
  },
  api: {
    board: {
      get: {},
      put: {},
      post: {},
      delete: {}
    }
  },
  model: {
    board: {
      name: {type: "string"}
    }
  }
};

var bookConfig = {
  "db": {
    "name": "myBookcase",
    "url": "127.0.0.1"
  },
  "server": {
    "port": 80
  },
  "api": {
    "book": {
      "get": {},
      "put": {},
      "post": {},
      "delete": {}
    }
  },
  "model": {
    "book": {
      "name": {"type": "string"},
      "author": {"type": "ObjectId"},
    }
  }
};
var writeToFile = true;
//Generator.generate(taskConfig, writeToFile);
//Generator.generate(boardConfig, writeToFile);
Generator.generate(bookConfig, writeToFile);