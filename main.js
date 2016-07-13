const Generator = require('./generator');

var config = {
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
  }
};

var code = Generator.generate(config, true);
console.log(code);